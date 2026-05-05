import { createContext, useContext, useState, useCallback } from 'react';
import './HistoricoContainer.css';

import LineChartHistorico from './LineChartHistorico';
import HeatmapHistorico   from './HeatmapHistorico';
import LineAreaHistorico  from './LineAreaHistorico';

// ── helpers ────────────────────────────────────────────────────────────────────
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function chartKey(chart, idx) {
  if (chart.id) return chart.id;
  const ids = toArray(chart.deviceIds);
  return ids.length ? ids.join('-') : `chart-${idx}`;
}

// ── Contexto ───────────────────────────────────────────────────────────────────
const HistoricoContext = createContext(null);

const HISTORICO_RENDERERS = {
  line:               LineChartHistorico,
  LineChartHistorico: LineChartHistorico,
  heatmap:            HeatmapHistorico,
  HeatmapHistorico:   HeatmapHistorico,
  lineArea:           LineAreaHistorico,
  LineAreaHistorico:  LineAreaHistorico,
};

/**
 * HistoricoProvider
 *
 * Coordina los controles compartidos (fechas, ventana, función) y emite una
 * señal (queryCount) cuando el usuario presiona "Consultar".
 *
 * Cada gráfico hijo escucha queryCount con su propio useEffect y lanza su
 * propia query independiente al backend (deviceIds y fields propios).
 *
 * Config JSON:
 * {
 *   tipo: "historico",
 *   defaultFromDays: 7,
 *   defaultWindow: "1h",
 *   defaultFn: "mean",
 *   children: [
 *     { tipo: "HeatmapHistorico",   deviceIds: ["secadero"], fields: ["T1","T2"] },
 *     { tipo: "LineAreaHistorico",  deviceIds: ["horno"],    fieldTemp: "temperatura", areas: [...] },
 *     { tipo: "LineChartHistorico", deviceIds: ["sensor1"],  fields: "value" },
 *   ]
 * }
 */
export function HistoricoProvider({
  widget,
  children,
  defaultFromDays = 7,
  defaultFn       = 'mean',
}) {
  const initFromDays = widget?.defaultFromDays ?? defaultFromDays;
  const initFn       = widget?.defaultFn       ?? defaultFn;

  const now         = new Date();
  const defaultFrom = new Date(now.getTime() - initFromDays * 86400000);

  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to,   setTo]   = useState(now.toISOString().slice(0, 10));
  const [fn,   setFn]   = useState(initFn);

  // Cada vez que el usuario presiona Consultar este contador sube.
  // Los hijos reaccionan con useEffect([queryCount]) y lanzan su propia query.
  const [queryCount, setQueryCount] = useState(0);
  const handleQuery = useCallback(() => setQueryCount(c => c + 1), []);

  const value = {
    from, to, setFrom, setTo,
    fn, setFn,
    queryCount,
  };

  const charts = widget?.charts || widget?.children || [];

  return (
    <HistoricoContext.Provider value={value}>
      <div className="historico-container">
        <HistoricoControls onConsultar={handleQuery} />
        {children}
        {charts.length > 0 && (
          <div className="historico-charts" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {charts.map((chart, idx) => {
              const ChartComp = HISTORICO_RENDERERS[chart.tipo];
              if (!ChartComp) {
                console.warn(`[HistoricoContainer] tipo desconocido: "${chart.tipo}". Disponibles:`, Object.keys(HISTORICO_RENDERERS));
                return (
                  <div key={chartKey(chart, idx)} style={{
                    padding: 12,
                    color: '#ef4444', fontSize: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8,
                  }}>
                    Tipo histórico desconocido: <b>{chart.tipo}</b>
                  </div>
                );
              }
              const isHeatmap = chart.tipo === 'heatmap' || chart.tipo === 'HeatmapHistorico';
              return (
                <div key={chartKey(chart, idx)} style={isHeatmap ? { width: '100%' } : { flex: '1 1 300px', minWidth: 0 }}>
                  <ChartComp {...chart} />
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
 * Provee a los hijos acceso a: from, to, window, fn, queryCount.
 */
export function useHistoricoContext() {
  const ctx = useContext(HistoricoContext);
  if (!ctx) throw new Error('useHistoricoContext debe usarse dentro de HistoricoProvider');
  return ctx;
}

// ── Barra de controles ─────────────────────────────────────────────────────────
function HistoricoControls({ onConsultar }) {
  const { from, setFrom, to, setTo, fn, setFn } = useHistoricoContext();

  return (
    <div className="historico-controls">
      <div className="control-group">
        <label>Desde</label>
        <input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
      </div>

      <div className="control-group">
        <label>Hasta</label>
        <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} />
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

      <button className="btn-consultar" onClick={onConsultar}>
        ⟵ Consultar
      </button>
    </div>
  );
}

/**
 * withHistorico (HOC — compatibilidad hacia atrás)
 */
export function withHistorico(Component) {
  return function HistoricoWrapped(props) {
    return <Component {...props} />;
  };
}

export default HistoricoProvider;