import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useHistorico } from '../hooks/SensorContext';
import './HistoricoContainer.css';

// ── helpers ────────────────────────────────────────────────────────────────
/** Garantiza que el valor siempre sea un array de strings. */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/** Genera una clave estable para un chart aunque sensorIds sea string o array. */
function chartKey(chart, idx) {
  if (chart.id) return chart.id;
  const ids = toArray(chart.sensorIds);
  return ids.length ? ids.join('-') : `chart-${idx}`;
}

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
import LineChartHistorico from './LineChartHistorico';
import HeatmapHistorico from './HeatmapHistorico';
import LineAreaHistorico from './LineAreaHistorico';

const HISTORICO_RENDERERS = {
  line:               LineChartHistorico,
  LineChartHistorico: LineChartHistorico,
  heatmap:            HeatmapHistorico,
  HeatmapHistorico:   HeatmapHistorico,
  lineArea:           LineAreaHistorico,
  LineAreaHistorico:  LineAreaHistorico,
};

export function HistoricoProvider({ 
  widget,
  children, 
  defaultFromDays = 7,
  defaultWindow = '1h',
  defaultFn = 'mean',
  fields = 'value',
}) {
  const initFromDays = widget?.defaultFromDays ?? defaultFromDays;
  const initWindow = widget?.defaultWindow ?? defaultWindow;
  const initFn = widget?.defaultFn ?? defaultFn;
  const { query, data, loading, error } = useHistorico();
  
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - initFromDays * 86400000);
  
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [windowState, setWindow] = useState(initWindow);
  const [fn, setFn] = useState(initFn);
  const [queried, setQueried] = useState(false);
  const [currentSensorIds, setCurrentSensorIds] = useState([]);
  const [currentFields, setCurrentFields] = useState(['value']);
  
  // Registra sensorIds desde los hijos
  const registerSensors = useCallback((sensorIds) => {
    const ids = toArray(sensorIds);
    if (!ids.length) return;
    setCurrentSensorIds(prev => Array.from(new Set([...prev, ...ids])));
  }, []);

  // Registra fields desde los hijos (acumula los únicos)
  const registerFields = useCallback((newFields) => {
    const flds = toArray(newFields);
    if (!flds.length) return;
    setCurrentFields(prev => Array.from(new Set([...prev, ...flds])));
  }, []);

  const handleQuery = useCallback(async (sensorIdsToQuery, extraFields) => {
    const ids = toArray(sensorIdsToQuery).length
      ? toArray(sensorIdsToQuery)
      : currentSensorIds;
    if (!ids.length) return;

    // Usa los fields acumulados por los charts, o los que vengan explícitos
    const queryFields = extraFields
      ? toArray(extraFields)
      : (currentFields.length > 1 ? currentFields : toArray(fields));
    
    await query({
      sensorIds: ids,
      desde: `${from}T00:00:00Z`,
      hasta: `${to}T23:59:59Z`,
      fields: queryFields,
      window: windowState,
      fn,
    });
    setQueried(true);
  }, [from, to, windowState, fn, query, fields, currentSensorIds, currentFields]);

  const value = {
    from, to, setFrom, setTo,
    window: windowState, setWindow,
    fn, setFn,
    handleQuery,
    registerSensors,
    registerFields,
    data, loading, error,
    queried, setQueried,
  };

  const charts = widget?.charts || widget?.children || [];

  return (
    <HistoricoContext.Provider value={value}>
      <div className="historico-container">
        <HistoricoControls onConsultar={() => handleQuery()} />
        {children}
        {charts.length > 0 && (
          <div className="historico-charts" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '16px' }}>
            {charts.map((chart, idx) => {
              const ChartComp = HISTORICO_RENDERERS[chart.tipo];
              if (!ChartComp) {
                console.warn(`[HistoricoContainer] tipo desconocido: "${chart.tipo}". Tipos disponibles:`, Object.keys(HISTORICO_RENDERERS));
                return (
                  <div key={chartKey(chart, idx)} style={{ flex: '1 1 300px', minWidth: 0, padding: 12,
                    color: '#ef4444', fontSize: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                    Tipo histórico desconocido: <b>{chart.tipo}</b>
                  </div>
                );
              }
              const normalizedChart = { ...chart, sensorIds: toArray(chart.sensorIds) };
              return (
                <div key={chartKey(chart, idx)} style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <ChartComp {...normalizedChart} />
                </div>
              );
            })}
          </div>
        )}
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