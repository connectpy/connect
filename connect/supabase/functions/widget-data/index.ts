// supabase/functions/widget-data/index.ts
// Edge Function que obtiene datos de InfluxDB para un widget específico

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CONFIGURACIÓN DE CORS (permitir requests desde el frontend)
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

// Datos que envía el frontend en el body de la request
interface WidgetRequest {
  bucket: string;        // Bucket de InfluxDB donde están los datos
  measurement: string;   // Medición (como "temperature", "pressure")
  field?: string;        // Campo específico (como "celsius", "psi") - OPCIONAL ahora
  fields?: string[];     // Array de campos para heatmap (como ["T1", "T2", ...])
  timeRange: string;     // Rango de tiempo (como "1h", "24h", "7d")
  aggregation?: string;  // Función de agregación (mean, sum, max, min)
  lastValueOnly?: boolean; // Si true, solo devuelve el último valor de cada field
  dateRange?: {    start: string; // Fecha de inicio en formato ISO
                 end: string;   // Fecha de fin en formato ISO
               }; // Rango de fechas para widgets históricos (opcional)
}

// Estructura de un punto de dato que devolvemos
interface DataPoint {
  time: string;    // Timestamp en formato ISO
  value: number;   // Valor numérico
  field?: string;  // Campo (para múltiples fields)
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================
serve(async (req) => {
  
  // --------------------------------------------------------------------------
  // PASO 1: Manejar preflight CORS (peticiones OPTIONS)
  // --------------------------------------------------------------------------
  // Cuando el navegador hace una petición POST, primero envía una OPTIONS
  // para verificar si está permitido. Debemos responder con OK.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ------------------------------------------------------------------------
    // PASO 2: Crear cliente de Supabase con autenticación
    // ------------------------------------------------------------------------
    // Usamos el SUPABASE_SERVICE_ROLE_KEY para tener permisos de servidor
    // pero pasamos el Authorization header del usuario para verificar su JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          // Pasamos el JWT del usuario desde el header Authorization
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // ------------------------------------------------------------------------
    // PASO 3: Verificar que el usuario está autenticado
    // ------------------------------------------------------------------------
    // getUser() valida el JWT y devuelve los datos del usuario
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    // Si no hay usuario o hay error, devolver 401 Unauthorized
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No autorizado. Debes iniciar sesión.' 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ------------------------------------------------------------------------
    // PASO 4: Parsear los datos de la request
    // ------------------------------------------------------------------------
    // El frontend envía JSON con bucket, measurement, field(s), etc.
    const requestData: WidgetRequest = await req.json()
    
    // Extraer datos con valores por defecto
    const { 
      bucket,                   // Requerido
      measurement,              // Requerido
      field,                    // Opcional (para gráficos simples)
      fields,                   // Opcional (para heatmaps con múltiples fields)
      timeRange = false,                // Requerido
      aggregation = 'mean',     // Opcional, default: mean
      lastValueOnly = false,     // Opcional, default: false
      dateRange = false,                // Opcional, rango de fechas para widgets históricos
    } = requestData

    // Validar que los campos requeridos existen
    if (!bucket || !measurement) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Faltan parámetros requeridos: bucket, measurement, timeRange' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validar que hay al menos un field o fields
    if (!field && (!fields || fields.length === 0)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Debe especificar field o fields' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ------------------------------------------------------------------------
    // PASO 5: Obtener la empresa del usuario
    // ------------------------------------------------------------------------
    // Buscar en la tabla USERS qué empresa_id tiene asignado este usuario
    const { data: userMeta, error: metaError } = await supabaseClient
      .from('USERS')
      .select('empresa_id')
      .eq('id', user.id)  // Filtrar por el ID del usuario autenticado
      .single()           // Esperar un solo resultado

    // Si no se encuentra o hay error
    if (metaError || !userMeta) {
      console.error('Error obteniendo empresa del usuario:', metaError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Usuario sin empresa asignada. Contacta al administrador.' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ------------------------------------------------------------------------
    // PASO 6: Obtener credenciales de InfluxDB de la empresa
    // ------------------------------------------------------------------------
    // Buscar en la tabla EMPRESAS los datos necesarios para conectar a InfluxDB
    const { data: empresa, error: empresaError } = await supabaseClient
      .from('EMPRESAS')
      .select('influx_org, influx_token')  // Solo traemos lo necesario
      .eq('id', userMeta.empresa_id)        // Filtrar por empresa del usuario
      .single()                             // Esperar un solo resultado

    // Si no se encuentra la empresa o faltan credenciales
    if (empresaError || !empresa) {
      console.error('Error obteniendo datos de empresa:', empresaError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Empresa no encontrada o sin configuración de InfluxDB' 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validar que existen los campos necesarios
    if (!empresa.influx_org || !empresa.influx_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciales de InfluxDB no configuradas para esta empresa' 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ------------------------------------------------------------------------
    // PASO 7: Construir query Flux para InfluxDB
    // ------------------------------------------------------------------------
    // Flux es el lenguaje de consulta de InfluxDB 2.x
    
    let fluxQuery = ''
    
    // Si es para múltiples fields (heatmap)
    if (fields && fields.length > 0) {
      //console.log('[Query] Construyendo query para múltiples fields:', fields)
      
      // Crear filtro para múltiples fields usando OR
      // r["_field"] == "T1" or r["_field"] == "T2" or ...
      const fieldsFilter = fields.map(f => `r["_field"] == "${f}"`).join(' or ')
      console.log('[Query] Filtro de fields para Flux:', fieldsFilter)  
      if (lastValueOnly) {
        // Para heatmap: obtener solo el último valor de cada field
        fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: -${timeRange})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => ${fieldsFilter})
        |> group(columns: ["_field"])
        |> last()
        |> group()
        `
        console.log('[Query] Query para heatmap con lastValueOnly', fluxQuery)
      } else if (dateRange && !lastValueOnly) {
      //------------------------------------------------------------------------
      // Query para varios fields con dateRange 
      //------------------------------------------------------------------------
        fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: ${dateRange.start}, stop: ${dateRange.end})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => ${fieldsFilter})
        |> limit(n: 100)
        `
      } else if(!dateRange && !lastValueOnly){ 
      //------------------------------------------------------------------------
      // Quyery para varios fields con timeRange
      //------------------------------------------------------------------------
        fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: -${timeRange})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => ${fieldsFilter})
        |> aggregateWindow(every: 1m, fn: ${aggregation}, createEmpty: false)
        `
      }
    }  
      else if (dateRange) {
      //------------------------------------------------------------------------
      // Query para dateRange con un solo field
      //------------------------------------------------------------------------      
        fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: ${dateRange.start}, stop: ${dateRange.end})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => r["_field"] == "${field}")
        |> limit(n: 100)
        `
      }  else {
        //------------------------------------------------------------------------
        // Query para un solo field con timeRange (gráficos simples)
        //------------------------------------------------------------------------
        fluxQuery = `
        from(bucket: "${bucket}")
        |> range(start: -${timeRange})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> filter(fn: (r) => r["_field"] == "${field}")
        |> limit(n: 100)
        `
      } 


    //console.log('====== QUERY FLUX ======')
    console.log(fluxQuery)
    //console.log('====== FIN QUERY ======')

    // ------------------------------------------------------------------------
    // PASO 8: Consultar InfluxDB
    // ------------------------------------------------------------------------
    // Hacemos una petición HTTP POST al API de InfluxDB
    const influxUrl = Deno.env.get('INFLUXDB_URL') ?? ''
    
    const influxResponse = await fetch(
      `${influxUrl}/api/v2/query?org=${empresa.influx_org}`,  // URL con la organización
      {
        method: 'POST',
        headers: {
          // Token de autenticación de InfluxDB (de la empresa)
          'Authorization': `Token ${empresa.influx_token}`,
          // Tipo de contenido: query en formato Flux
          'Content-Type': 'application/vnd.flux',
          // Queremos recibir CSV (formato por defecto de InfluxDB)
          'Accept': 'application/csv',
        },
        body: fluxQuery,  // La query Flux va en el body
      }
    )

    // Si la consulta a InfluxDB falló
    if (!influxResponse.ok) {
      const errorText = await influxResponse.text()
      console.error('====== ERROR HTTP DE INFLUXDB ======')
      console.error('Status:', influxResponse.status)
      console.error('StatusText:', influxResponse.statusText)
      console.error('Response:', errorText)
      console.error('====== FIN ERROR ======')
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error HTTP ${influxResponse.status} de InfluxDB`,
          details: errorText 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // ------------------------------------------------------------------------
    // PASO 9: Parsear respuesta CSV de InfluxDB
    // ------------------------------------------------------------------------
    // InfluxDB devuelve los datos en formato CSV
    const csvText = await influxResponse.text()
    
    // Verificar si el CSV contiene un error de InfluxDB
    if (csvText.includes('error') || csvText.includes('Error')) {
      console.error('====== POSIBLE ERROR EN CSV ======')
      console.error(csvText)
      console.error('====== FIN ERROR ======')
    }
    
    // LOG COMPLETO para debug
    //console.log('====== RESPUESTA COMPLETA DE INFLUXDB ======')
    console.log(csvText)
    //console.log('====== FIN RESPUESTA ======')
    //console.log('Longitud del CSV:', csvText.length)
    //console.log('Primeras 1000 chars:', csvText.substring(0, 1000))
    
    // Convertir CSV a JSON usando función helper (ver abajo)
    const parsedData = parseInfluxCSV(csvText)

    // ------------------------------------------------------------------------
    // PASO 10: Devolver datos formateados al frontend
    // ------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        metadata: {
          bucket,
          measurement,
          field: field || null,
          fields: fields || null,
          timeRange,
          aggregation,
          lastValueOnly,
          dataPoints: parsedData.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    // ------------------------------------------------------------------------
    // MANEJO DE ERRORES GLOBALES
    // ------------------------------------------------------------------------
    //console.error('Error general en edge function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Error interno del servidor',
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// ============================================================================
// FUNCIÓN HELPER: Parsear CSV de InfluxDB a JSON
// ============================================================================
/**
 * InfluxDB devuelve datos en formato CSV que puede tener varias estructuras:
 * 
 * Formato Annotated CSV (InfluxDB 2.x):
 * #group,false,false,true,true,false,false,true,true
 * #datatype,string,long,dateTime:RFC3339,dateTime:RFC3339,dateTime:RFC3339,double,string,string
 * #default,_result,,,,,,,
 * ,result,table,_start,_stop,_time,_value,_field,_measurement
 * ,,0,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,2026-01-01T10:00:00Z,25.5,celsius,temperature
 * 
 * O formato simple sin anotaciones
 */
function parseInfluxCSV(csv: string): DataPoint[] {
  //console.log('[parseInfluxCSV] Iniciando parseo...')
  
  // Dividir el CSV en líneas y eliminar vacías
  const lines = csv.split('\n').filter(line => line.trim())
  
  //console.log('[parseInfluxCSV] Total de líneas:', lines.length)
  
  if (lines.length === 0) {
    console.log('[parseInfluxCSV] CSV vacío, devolviendo array vacío')
    return []
  }


  // --------------------------------------------------------------------------
  // Buscar el índice de la línea que contiene los headers
  // --------------------------------------------------------------------------
  let headerIndex = -1
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Saltar líneas de metadata que empiezan con #
    if (line.startsWith('#')) {
      //console.log(`  Saltando línea de metadata ${i}: ${line.substring(0, 50)}`)
      continue
    }
    
    // Buscar línea que tiene _time y _value (el header real)
    if (line.includes('_time') && line.includes('_value')) {
      headerIndex = i
      //console.log(`[parseInfluxCSV] Header encontrado en línea ${i}`)
      break
    }
    
    // También buscar formato alternativo
    if (line.includes('result') || line.includes('table')) {
      headerIndex = i
      //console.log(`[parseInfluxCSV] Posible header en línea ${i}`)
      break
    }
  }

  if (headerIndex === -1) {
    //console.error('[parseInfluxCSV] No se encontró línea de header')
    //console.error('[parseInfluxCSV] Intentando con la primera línea no-metadata...')
    
    // Buscar primera línea que no sea metadata
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#')) {
        headerIndex = i
        //console.log(`[parseInfluxCSV] Usando línea ${i} como header`)
        break
      }
    }
  }

  if (headerIndex === -1) {
    console.error('[parseInfluxCSV] No se pudo determinar el header')
    return []
  }

  //console.log('[parseInfluxCSV] Contenido del header:', lines[headerIndex])

  // --------------------------------------------------------------------------
  // Parsear el header para encontrar índices de columnas
  // --------------------------------------------------------------------------
  const headers = lines[headerIndex].split(',')
  
  //console.log('[parseInfluxCSV] Headers parseados:', headers)
  //console.log('[parseInfluxCSV] Total de columnas:', headers.length)
  
  // Encontrar en qué posición está cada columna que necesitamos
  const timeIndex = headers.findIndex(h => h.trim() === '_time')
  const valueIndex = headers.findIndex(h => h.trim() === '_value')
  const fieldIndex = headers.findIndex(h => h.trim() === '_field')

  //console.log('[parseInfluxCSV] Índice de _time:', timeIndex)
  //console.log('[parseInfluxCSV] Índice de _value:', valueIndex)
  //console.log('[parseInfluxCSV] Índice de _field:', fieldIndex)

  // Si no encontramos las columnas necesarias, error
  if (timeIndex === -1 || valueIndex === -1) {
    console.error('[parseInfluxCSV] Columnas faltantes:')
    console.error('  _time:', timeIndex === -1 ? 'NO ENCONTRADA' : `columna ${timeIndex}`)
    console.error('  _value:', valueIndex === -1 ? 'NO ENCONTRADA' : `columna ${valueIndex}`)
    console.error('[parseInfluxCSV] Headers disponibles:', headers.join(', '))
    return []
  }

  // --------------------------------------------------------------------------
  // Parsear cada línea de datos
  // --------------------------------------------------------------------------
  const data: DataPoint[] = []

  //console.log('[parseInfluxCSV] Procesando datos desde línea', headerIndex + 1)

  // Empezar desde la línea siguiente al header
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Ignorar líneas de comentarios o vacías
    if (line.startsWith('#') || !line.trim()) {
      continue
    }
    
    // Dividir la línea por comas
    const values = line.split(',')
    
    //console.log(`[parseInfluxCSV] Línea ${i}: ${values.length} columnas`)
    
    // Verificar que la línea tenga suficientes columnas
    if (values.length > Math.max(timeIndex, valueIndex)) {
      // Extraer tiempo y valor
      const time = values[timeIndex].trim()
      const valueStr = values[valueIndex].trim()
      const fieldName = fieldIndex !== -1 ? values[fieldIndex].trim() : undefined
      
      //console.log(`  _time: "${time}", _value: "${valueStr}", _field: "${fieldName}"`)
      
      // Parsear el valor a número (puede venir como string)
      const value = parseFloat(valueStr)
      
      // Solo agregar si el valor es un número válido
      if (!isNaN(value) && time) {
        const point: DataPoint = {
          time: time,
          value: value,
        }
        
        // Agregar field si existe
        if (fieldName) {
          point.field = fieldName
        }
        
        data.push(point)
        //console.log(`  ✓ Punto agregado:`, point)
      } else {
        //console.log(`  ✗ Punto ignorado (valor inválido o tiempo vacío)`)
      }
    } else {
      //console.log(`  ✗ Línea ignorada (columnas insuficientes: ${values.length})`)
    }
  }

  //console.log(`[parseInfluxCSV] Total parseado: ${data.length} puntos`)
  
  // Mostrar los primeros 3 puntos para verificación
  if (data.length > 0) {
    console.log('[parseInfluxCSV] Primeros 3 puntos:', JSON.stringify(data.slice(0, 3), null, 2))
  }
  console.log('[parseInfluxCSV] Parseo completado.',data )

  return data
}