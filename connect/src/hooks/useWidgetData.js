import { useState, useEffect, useRef } from 'react';
import { fetchWidgetData } from '../influxService';

/**
 * Hook personalizado para cargar datos de un widget desde InfluxDB
 * 
 * Este hook:
 * - Carga datos iniciales al montar el componente
 * - Actualiza datos automáticamente cada X segundos (polling)
 * - Maneja estados de loading y error
 * - Se limpia correctamente al desmontar
 * 
 * @param {Object} widgetConfig - Configuración del widget (bucket, measurement, field)
 * @param {string} timeRange - Rango de tiempo (ej: "1h", "24h")
 * @param {number} refreshInterval - Intervalo de actualización en milisegundos (default: 5000)
 * 
 * @returns {Object} Objeto con { data, loading, error, refetch }
 * 
 * @example
 * function MyWidget({ config }) {
 *   const { data, loading, error } = useWidgetData(config, '1h', 5000);
 *   
 *   if (loading) return <div>Cargando...</div>
 *   if (error) return <div>Error: {error}</div>
 *   
 *   return <Chart data={data} />
 * }
 */
export function useWidgetData(widgetConfig, timeRange = '1h', refreshInterval = 5000) {
  
  // ==========================================================================
  // ESTADOS
  // ==========================================================================
  //console.log(`[useWidgetData] Hook iniciado para widget: ${widgetConfig.label}`);
  // data: Array de {time, value} o null si aún no se cargó
  const [data, setData] = useState(null);
  
  // loading: true mientras se está cargando la primera vez
  const [loading, setLoading] = useState(true);
  
  // error: string con mensaje de error o null si no hay error
  const [error, setError] = useState(null);
  
  // ==========================================================================
  // REFS (para manejar cleanup y evitar actualizaciones en componente desmontado)
  // ==========================================================================
  
  // isMounted: indica si el componente sigue montado
  // Esto previene el error "Can't perform a React state update on an unmounted component"
  const isMounted = useRef(true);
  
  // intervalRef: referencia al setInterval para poder limpiarlo
  const intervalRef = useRef(null);

  // ==========================================================================
  // FUNCIÓN PARA CARGAR DATOS
  // ==========================================================================
  
  const loadData = async () => {
    try {
      // Solo actualizar estado si el componente sigue montado
      if (!isMounted.current) return;
      
      // En la primera carga mostramos loading
      // En actualizaciones posteriores, mantenemos los datos anteriores
      if (data === null) {
        setLoading(true);
      }
      
      // Llamar al servicio para obtener datos de InfluxDB
  
      const result = await fetchWidgetData(widgetConfig, timeRange);
       
      // Solo actualizar estado si el componente sigue montado
      if (isMounted.current) {
        setData(result);
        setError(null); // Limpiar error previo si había
        

      }
      
    } catch (err) {
      // Solo actualizar estado si el componente sigue montado
      if (isMounted.current) {
        console.error('[useWidgetData] Error cargando datos:', err);
        setError(err.message);
      }
    } finally {
      // Siempre quitar loading después de la primera carga
      if (isMounted.current && data === null) {
        setLoading(false);
      }
    }
  };

  // ==========================================================================
  // EFFECT: Cargar datos y configurar polling
  // ==========================================================================
  
  useEffect(() => {
    // Resetear estado cuando cambia la configuración del widget
    isMounted.current = true;
    
    
    // Cargar datos inmediatamente
    loadData();

    // Configurar actualización automática (polling)
    // Solo si refreshInterval > 0
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {

        loadData();
      }, refreshInterval);
    }

    // ==========================================================================
    // CLEANUP: Limpiar al desmontar o cuando cambien las dependencias
    // ==========================================================================
    return () => {
      //console.log(`[useWidgetData] Limpiando widget: ${widgetConfig.label}`);
      
      // Marcar como desmontado para prevenir actualizaciones de estado
      isMounted.current = false;
      
      // Limpiar el intervalo de polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    
    // Dependencias: re-ejecutar effect si cambia alguna de estas
    // NOTA: widgetConfig es un objeto, así que usamos JSON.stringify para compararlo
  }, [
    JSON.stringify(widgetConfig), // Configuración del widget
    timeRange,                     // Rango de tiempo
    refreshInterval                // Intervalo de actualización
  ]);

  // ==========================================================================
  // FUNCIÓN MANUAL DE RECARGA (útil para botones de "refrescar")
  // ==========================================================================
  
  const refetch = () => {
    console.log(`[useWidgetData] Recarga manual solicitada`);
    loadData();
  };

  // ==========================================================================
  // RETORNAR VALORES DEL HOOK
  // ==========================================================================
  
  return {
    // Array de datos {time, value} o null si aún no cargó
    data,
    
    // true solo durante la primera carga
    loading,
    
    // string con mensaje de error o null
    error,
    
    // función para recargar manualmente
    refetch
  };
}

// ============================================================================
// VARIANTE: Hook para múltiples widgets
// ============================================================================

/**
 * Hook para cargar datos de múltiples widgets a la vez
 * 
 * @param {Array} widgetConfigs - Array de configuraciones de widgets
 * @param {string} timeRange - Rango de tiempo
 * @param {number} refreshInterval - Intervalo de actualización
 * 
 * @returns {Object} Objeto con { dataMap, loading, errors }
 * 
 * @example
 * const { dataMap, loading } = useMultipleWidgets(widgets, '1h');
 * const widget1Data = dataMap[widgets[0].id];
 */
export function useMultipleWidgets(widgetConfigs, timeRange = '1h', refreshInterval = 5000) {
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const loadAllData = async () => {
      const newDataMap = {};
      const newErrors = {};

      // Cargar datos de todos los widgets en paralelo
      await Promise.all(
        widgetConfigs.map(async (config) => {
          try {
            const data = await fetchWidgetData(config, timeRange);
            if (isMounted.current) {
              newDataMap[config.id] = data;
            }
          } catch (err) {
            if (isMounted.current) {
              newErrors[config.id] = err.message;
            }
          }
        })
      );

      if (isMounted.current) {
        setDataMap(newDataMap);
        setErrors(newErrors);
        setLoading(false);
      }
    };

    loadAllData();

    const interval = setInterval(loadAllData, refreshInterval);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [JSON.stringify(widgetConfigs), timeRange, refreshInterval]);

  return { dataMap, loading, errors };
}