import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useHistorico } from '../hooks/SensorContext';
import './HistoricoContainer.css';

const HistoricoContext = createContext(null);

/**
 * HistoricoProvider
 * 
 * Provider que contiene:
 * - Selectores de fecha (desde, hasta)
 * - Selectores de ventana y función
 * - Botón de consulta
 * - Provee contexto a hijos
 *
 * Uso:
 * <HistoricoProvider defaultFromDays={7}>
 *   <LineChart sensorIds={['sensor1']} />
 *   <Heatmap sensorIds={['sensor1', 'sensor2']} />
 * </HistoricoProvider>
 */
export function HistoricoProvider({ 
  children, 
  defaultFromDays = 7,
  defaultWindow = '1h',
  defaultFn = 'mean',
  fields = 'value',
}) {
  const { query, data, loading, error } = useHistorico();
  
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - defaultFromDays * 86400000);
  
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [window, setWindow] = useState(defaultWindow);
  const [fn, setFn] = useState(defaultFn);
  const [queried, setQueried] = useState(false);
  const [currentSensorIds, setCurrentSensorIds] = useState([]);
  
  // Callback para que los hijos puedan registrar sus sensorIds
  const registerSensors = useCallback((sensorIds) => {
    setCurrentSensorIds(prev => {
      const combined = [...new Set([...prev, ...sensorIds])];
      return Array.from(combined);
    });
  }, []);

  const handleQuery = useCallback(async (sensorIdsToQuery, extraFields) => {
    const ids = sensorIdsToQuery || currentSensorIds;
    if (!ids.length) return;
    
    const queryFields = extraFields || fields;
    
    await query({
      sensorIds: ids,
      desde: `${from}T00:00:00Z`,
      hasta: `${to}T23:59:59Z`,
      fields: Array.isArray(queryFields) ? queryFields : [queryFields],
      window,
      fn,
    });
    setQueried(true);
  }, [from, to, window, fn, query, fields, currentSensorIds]);

  const value = {
    from,
    to,
    setFrom,
    setTo,
    window,
    setWindow,
    fn,
    setFn,
    handleQuery,
    registerSensors,
    data,
    loading,
    error,
    queried,
    setQueried,
  };

  return (
    <HistoricoContext.Provider value={value}>
      <div className="historico-container">
        <HistoricoControls onConsultar={() => handleQuery()} />
        {children}
      </div>
    </HistoricoContext.Provider>
  );
}

/**
 * useHistoricoContext
 * Hook para que los hijos accedan a las fechas y datos
 */
export function useHistoricoContext() {
  const ctx = useContext(HistoricoContext);
  if (!ctx) {
    throw new Error('useHistoricoContext debe usarse dentro de HistoricoProvider');
  }
  return ctx;
}

/**
 * HistoricoControls
 * Barra con selectores de fecha y botón de consulta
 */
function HistoricoControls({ onConsultar }) {
  const { from, setFrom, to, setTo, window, setWindow, fn, setFn, loading } = useHistoricoContext();

  return (
    <div className="historico-controls">
      <div className="control-group">
        <label>Desde</label>
        <input 
          type="date" 
          value={from} 
          max={to}
          onChange={e => setFrom(e.target.value)} 
        />
      </div>
      
      <div className="control-group">
        <label>Hasta</label>
        <input 
          type="date" 
          value={to} 
          min={from}
          onChange={e => setTo(e.target.value)} 
        />
      </div>
      
      <div className="control-group">
        <label>Ventana</label>
        <select value={window} onChange={e => setWindow(e.target.value)}>
          <option value="1h">1 hora</option>
          <option value="12h">12 horas</option>
          <option value="1d">1 día</option>
          <option value="7d">7 días</option>
        </select>
      </div>
      
      <div className="control-group">
        <label>Función</label>
        <select value={fn} onChange={e => setFn(e.target.value)}>
          <option value="mean">Promedio</option>
          <option value="max">Máximo</option>
          <option value="min">Mínimo</option>
          <option value="last">Último</option>
        </select>
      </div>

      <button 
        className={`btn-consultar ${loading ? 'loading' : ''}`}
        onClick={onConsultar}
        disabled={loading}
      >
        {loading ? 'Consultando...' : '⟵ Consultar'}
      </button>
    </div>
  );
}

/**
 * withHistorico
 * HOC que provee datos históricos a un componente
 * 
 * Uso:
 * const LineChart = withHistorico(({ data, sensorIds }) => {
 *   // renderizar con data[sensorIds[0]]
 * });
 */
export function withHistorico(Component) {
  return function HistoricoWrapped({ sensorIds, fields = 'value', ...props }) {
    const { handleQuery, data, loading, error, registerSensors, queried } = useHistoricoContext();
    
    // Registrar sensores al montar
    useEffect(() => {
      if (sensorIds?.length) {
        registerSensors(sensorIds);
      }
    }, [sensorIds, registerSensors]);

    // Trigger query automáticamente al presionar consultar o al cambiar fechas
    const widgetData = {};
    if (sensorIds?.length) {
      sensorIds.forEach(id => {
        widgetData[id] = data?.[id] || [];
      });
    }

    return (
      <Component 
        {...props} 
        data={widgetData} 
        sensorIds={sensorIds}
        loading={loading}
        error={error}
        onQuery={() => handleQuery(sensorIds, fields)}
      />
    );
  };
}

export default HistoricoProvider;