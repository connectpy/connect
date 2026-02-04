import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WidgetRequest {
  bucket: string;        // Bucket de InfluxDB donde están los datos
  measurement: string;   // Medición (como "temperature", "pressure")
  field: string;         // Campo específico (como "celsius", "psi")
  timeRange: string;     // Rango de tiempo (como "1h", "24h", "7d")
  aggregation?: string;  // Función de agregación (mean, sum, max, min)
}

interface DataPoint {
  time: string;   // Timestamp en formato ISO
  value: number;  // Valor numérico
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {status: 200, headers: corsHeaders })
  }
  try{
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
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()
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

    //paso 4 parsear datos de la request

    const requestData: WidgetRequest = await req.json()
    
    // Extraer datos con valores por defecto
    const { 
      bucket,           // Requerido
      measurement,      // Requerido
      field,            // Requerido
      timeRange,        // Requerido
      aggregation = 'mean'  // Opcional, default: mean
    } = requestData

    // Validar que los campos requeridos existen
    if (!bucket || !measurement || !field || !timeRange) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Faltan parámetros requeridos: bucket, measurement, field, timeRange' 
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
    // Esta query hace lo siguiente:
    // 1. from(bucket) → Selecciona el bucket
    // 2. range(start) → Filtra por rango de tiempo
    // 3. filter(measurement) → Filtra por medición (ej: "temperature")
    // 4. filter(field) → Filtra por campo (ej: "celsius")
    // 5. aggregateWindow → Agrupa datos cada 1 minuto usando la función especificada
    // 6. yield → Retorna los resultados
    
    const fluxQuery = `
from(bucket: "${bucket}")
  |> range(start: -${timeRange})
  |> filter(fn: (r) => r["_measurement"] == "${measurement}")
  |> filter(fn: (r) => r["_field"] == "${field}")
  |> aggregateWindow(every: 1m, fn: ${aggregation}, createEmpty: false)
  |> yield(name: "result")
`

    console.log('Query Flux construida:', fluxQuery)

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
    console.log(`${influxUrl}/api/v2/query?org=${empresa.influx_org}`);

    // Si la consulta a InfluxDB falló
    if (!influxResponse.ok) {
      const errorText = await influxResponse.text()
      console.error('Error de InfluxDB:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error consultando InfluxDB',
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
    console.log('CSV Text:', csvText)
    console.log('Respuesta CSV de InfluxDB (primeras 500 chars):', csvText.substring(0, 500))
    
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
          field,
          timeRange,
          aggregation,
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
    console.error('Error general en edge function:', error)
    
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
 * InfluxDB devuelve datos en formato CSV con este aspecto:
 * 
 * ,result,table,_start,_stop,_time,_value,_field,_measurement
 * ,_result,0,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,2026-01-01T10:00:00Z,25.5,celsius,temperature
 * ,_result,0,2026-01-01T00:00:00Z,2026-01-02T00:00:00Z,2026-01-01T10:01:00Z,25.7,celsius,temperature
 * 
 * Necesitamos extraer _time y _value para cada fila
 */
function parseInfluxCSV(csv: string): DataPoint[] {
  // Dividir el CSV en líneas y eliminar vacías
  const lines = csv.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    console.log('CSV vacío, devolviendo array vacío')
    return []
  }

  // --------------------------------------------------------------------------
  // Buscar el índice de la línea que contiene los headers
  // --------------------------------------------------------------------------
  // El CSV de InfluxDB tiene metadata al inicio, necesitamos encontrar
  // la línea que empieza con ",result," que contiene los nombres de columnas
  let headerIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(',result,') || lines[i].startsWith('#datatype')) {
      // Saltamos la línea de datatype si existe
      if (lines[i].startsWith('#datatype')) continue
      
      headerIndex = i
      break
    }
  }

  // Si no encontramos el header, intentar usar la primera línea
  if (headerIndex === -1) {
    headerIndex = 0
  }

  console.log('Header encontrado en línea:', headerIndex)
  console.log('Contenido del header:', lines[headerIndex])

  // --------------------------------------------------------------------------
  // Parsear el header para encontrar índices de columnas
  // --------------------------------------------------------------------------
  const headers = lines[headerIndex].split(',')
  
  // Encontrar en qué posición está cada columna que necesitamos
  const timeIndex = headers.indexOf('_time')
  const valueIndex = headers.indexOf('_value')

  console.log('Índice de _time:', timeIndex)
  console.log('Índice de _value:', valueIndex)

  // Si no encontramos las columnas necesarias, error
  if (timeIndex === -1 || valueIndex === -1) {
    console.error('No se encontraron columnas _time o _value en el CSV')
    return []
  }

  // --------------------------------------------------------------------------
  // Parsear cada línea de datos
  // --------------------------------------------------------------------------
  const data: DataPoint[] = []

  // Empezar desde la línea siguiente al header
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Ignorar líneas de comentarios o vacías
    if (line.startsWith('#') || !line.trim()) continue
    
    // Dividir la línea por comas
    const values = line.split(',')
    
    // Verificar que la línea tenga suficientes columnas
    if (values.length > Math.max(timeIndex, valueIndex)) {
      // Extraer tiempo y valor
      const time = values[timeIndex]
      const valueStr = values[valueIndex]
      
      // Parsear el valor a número (puede venir como string)
      const value = parseFloat(valueStr)
      
      // Solo agregar si el valor es un número válido
      if (!isNaN(value)) {
        data.push({
          time: time,
          value: value,
        })
      }
    }
  }

  console.log(`Parseados ${data.length} puntos de datos`)
  
  // Mostrar los primeros 3 puntos para debug
  if (data.length > 0) {
    console.log('Primeros 3 puntos:', data.slice(0, 3))
  }

  return data
}
