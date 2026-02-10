// src/services/influxService.js
// Servicio para obtener datos de InfluxDB a través de Supabase Edge Functions

import { supabase } from './supabaseClient';

// ============================================================================
// FUNCIÓN PRINCIPAL: Obtener datos para un widget
// ============================================================================

/**
 * Obtiene datos de InfluxDB para un widget específico
 * 
 * @param {Object} widgetConfig - Configuración del widget desde dashboard_config
 * @param {string} widgetConfig.bucket - Bucket de InfluxDB
 * @param {string} widgetConfig.measurement - Medición (ej: "temperature")
 * @param {string} [widgetConfig.field] - Campo (ej: "celsius")
 * @param {Array} [widgetConfig.fields] - Array de campos (ej: ["T1", "T2", ...])
 * @param {string} [widgetConfig.aggregation] - Función de agregación (mean, sum, etc.)
 * @param {string} [widgetConfig.timeRange] - Rango de tiempo (ej: "1h", "24h", "7d")
 * @param {Object} [widgetConfig.dateRange] - Rango de fechas para widgets históricos (opcional, formato: { start: ISOString, end: ISOString })
 * @returns {Promise<Array>} Array de objetos {time, value}
 * 
 * @example
 * // Gráfico de línea (un solo field)
 * const widgetConfig = {
 *   bucket: "sensores",
 *   measurement: "temperature",
 *   field: "celsius"
 * }
 * const data = await fetchWidgetData(widgetConfig, "1h")
 * 
 * @example
 * // Heatmap (múltiples fields, último valor)
 * const widgetConfig = {
 *   bucket: "sensores",
 *   measurement: "temperature",
 *   fields: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"],
 *   lastValueOnly: true
 * }
 * const data = await fetchWidgetData(widgetConfig, "1h")
 * // Retorna: [{time, value, field: "T1"}, {time, value, field: "T2"}, ...]
 */
export async function fetchWidgetData(widgetConfig) {
  
  // --------------------------------------------------------------------------
  // PASO 1: Verificar que el usuario está autenticado
  // --------------------------------------------------------------------------
  // Obtener la sesión actual del usuario desde Supabase Auth
  const { data: { session } } = await supabase.auth.getSession();
  
  // Si no hay sesión, el usuario no está logueado
  if (!session) {
    throw new Error('No autenticado. Por favor inicia sesión.');
  }

  // --------------------------------------------------------------------------
  // PASO 2: Validar que la configuración del widget es válida
  // --------------------------------------------------------------------------
  if (!widgetConfig.bucket || !widgetConfig.measurement) {
    throw new Error('Configuración de widget inválida. Faltan: bucket, measurement o field');
  }

  if (!widgetConfig.field && !widgetConfig.fields) {
    throw new Error('Configuración de widget inválida. Debe especificar "field" o "fields"');
  }
  // --------------------------------------------------------------------------
  // PASO 3: Preparar el body de la request a la Edge Function
  // --------------------------------------------------------------------------
  const requestBody = {
    bucket: widgetConfig.bucket,                    // ej: "sensores"
    measurement: widgetConfig.measurement,          // ej: "temperature"                    // ej: "celsius"                           // ej: "1h"
    aggregation: widgetConfig.aggregation || 'mean' // ej: "mean" (default)
  };

  if (widgetConfig.fields) {
    requestBody.fields = widgetConfig.fields;
  }

  if (widgetConfig.lastValueOnly) {
    requestBody.lastValueOnly = widgetConfig.lastValueOnly;
  }

  if (widgetConfig.field) {
    requestBody.field = widgetConfig.field;
  }

  if (widgetConfig.dateRange) {
    requestBody.dateRange = widgetConfig.dateRange;
  }
  else{
    requestBody.timeRange = widgetConfig.timeRange;
  }
  console.log('[influxService] Solicitando datos a Edge Function:', requestBody);

  // --------------------------------------------------------------------------
  // PASO 4: Llamar a la Edge Function de Supabase
  // --------------------------------------------------------------------------
  // supabase.functions.invoke() hace una petición POST a la Edge Function
  // Automáticamente incluye el JWT del usuario en el header Authorization
  const { data, error } = await supabase.functions.invoke('widget-data', {
    body: requestBody
  });

  // --------------------------------------------------------------------------
  // PASO 5: Manejar errores de la Edge Function
  // --------------------------------------------------------------------------
  if (error) {
    //console.error('Error llamando a Edge Function:', error);
    throw new Error(`Error al obtener datos: ${error.message}`);
  }

  // Verificar si la respuesta indica un error
  if (!data.success) {
    console.error('Edge Function retornó error:', data.error);
    throw new Error(data.error || 'Error desconocido al obtener datos');
  }

  // --------------------------------------------------------------------------
  // PASO 6: Validar que hay datos
  // --------------------------------------------------------------------------
  if (!data.data || data.data.length === 0) {
    console.warn('No hay datos disponibles para este widget');
    // Retornar array vacío en lugar de error (puede no haber datos aún)
    return [];
  }

  //console.log(`Datos recibidos: ${data.data.length} puntos`, data.metadata);

  // --------------------------------------------------------------------------
  // PASO 7: Retornar los datos
  // --------------------------------------------------------------------------
  // data.data es un array de objetos {time, value}
  return data.data;
}

// ============================================================================
// FUNCIONES DE FORMATEO PARA DIFERENTES TIPOS DE GRÁFICOS
// ============================================================================

/**
 * Formatea datos de InfluxDB para un gráfico de líneas en ECharts
 * 
 * @param {Array} data - Array de {time, value} desde fetchWidgetData
 * @returns {Object} Objeto con arrays separados de xAxis (fechas) y series (valores)
 * 
 * @example
 * const data = [{time: "2026-02-03T10:00:00Z", value: 25.5}, ...]
 * const formatted = formatForLineChart(data)
 * // Retorna: { xAxis: [Date, Date, ...], series: [25.5, 26.1, ...] }
 */
export function formatForLineChart(data) {
  // Si no hay datos, retornar estructura vacía
  if (!data || data.length === 0) {
    return {
      xAxis: [],
      series: []
    };
  }

  return {
    // Convertir strings ISO a objetos Date para el eje X
    xAxis: data.map(point => new Date(point.time)),
    
    // Extraer solo los valores para el eje Y
    series: data.map(point => point.value)
  };
}

/**
 * Formatea datos de InfluxDB para un mapa de calor (heatmap) en ECharts
 * 
 * Agrupa datos por hora del día (0-23) y día de la semana (0-6)
 * 
 * @param {Array} data - Array de {time, value} desde fetchWidgetData
 * @returns {Array} Array de [hora, día, valor] para heatmap
 * 
 * @example
 * const data = [{time: "2026-02-03T10:00:00Z", value: 25.5}, ...]
 * const heatmapData = formatForHeatmap(data)
 * // Retorna: [[10, 1, 25.5], [11, 1, 26.2], ...]
 * //           [hora, día, valor]
 */
export function formatForHeatmap(data) {
  // Si no hay datos, retornar array vacío
  if (!data || data.length === 0) {
    return [];
  }

  // Crear un mapa para acumular valores por [hora, día]
  // Formato: "hora-día" => { sum: total, count: cantidad }
  const aggregated = {};

  // Procesar cada punto de dato
  data.forEach(point => {
    const date = new Date(point.time);
    const hour = date.getHours();      // 0-23
    const day = date.getDay();         // 0 (domingo) - 6 (sábado)
    
    // Crear clave única para esta combinación hora-día
    const key = `${hour}-${day}`;
    
    // Si no existe, inicializar
    if (!aggregated[key]) {
      aggregated[key] = { sum: 0, count: 0, hour, day };
    }
    
    // Acumular valor
    aggregated[key].sum += point.value;
    aggregated[key].count += 1;
  });

  // Convertir el mapa a array de [hora, día, promedio]
  const heatmapData = Object.values(aggregated).map(item => {
    const average = item.sum / item.count;
    return [item.hour, item.day, average];
  });

  return heatmapData;
}

/**
 * Formatea datos de InfluxDB para un gauge (medidor) en ECharts
 * 
 * Retorna el valor más reciente
 * 
 * @param {Array} data - Array de {time, value} desde fetchWidgetData
 * @returns {number} Valor más reciente
 * 
 * @example
 * const data = [{time: "2026-02-03T10:00:00Z", value: 25.5}, ...]
 * const currentValue = formatForGauge(data)
 * // Retorna: 25.5 (último valor)
 */
export function formatForGauge(data) {
  // Si no hay datos, retornar 0
  if (!data || data.length === 0) {
    return 0;
  }
  
  // Retornar el valor del último punto (más reciente)
  return data[data.length - 1].value;
}

/**
 * Formatea datos de InfluxDB para un gráfico de barras en ECharts
 * 
 * @param {Array} data - Array de {time, value} desde fetchWidgetData
 * @returns {Object} Objeto con arrays de categorías y valores
 * 
 * @example
 * const data = [{time: "2026-02-03T10:00:00Z", value: 25.5}, ...]
 * const formatted = formatForBarChart(data)
 * // Retorna: { categories: ["10:00", "11:00", ...], values: [25.5, 26.1, ...] }
 */
export function formatForBarChart(data) {
  // Si no hay datos, retornar estructura vacía
  if (!data || data.length === 0) {
    return {
      categories: [],
      values: []
    };
  }

  return {
    // Formatear tiempo como etiquetas de categoría
    categories: data.map(point => {
      const date = new Date(point.time);
      return date.toLocaleTimeString('es-PY', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }),
    
    // Extraer valores
    values: data.map(point => point.value)
  };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Calcula estadísticas básicas de un conjunto de datos
 * 
 * @param {Array} data - Array de {time, value}
 * @returns {Object} Objeto con min, max, avg, count
 */
export function calculateStats(data) {
  if (!data || data.length === 0) {
    return { min: 0, max: 0, avg: 0, count: 0 };
  }

  const values = data.map(point => point.value);
  
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    count: values.length
  };
}

/**
 * Obtiene el último valor de un dataset
 * 
 * @param {Array} data - Array de {time, value}
 * @returns {Object|null} Último punto o null
 */
export function getLatestValue(data) {
  if (!data || data.length === 0) {
    return null;
  }
  
  return data[data.length - 1];
}