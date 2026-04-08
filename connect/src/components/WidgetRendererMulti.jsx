import { useState, useEffect } from 'react';
import GaugeWidget          from './GaugeWidget';
import LineChartWidget      from './LineChartWidget';
import SpatialHeatmapWidget from './SpatialHeatmapWidget';
import HistoricoContainer   from './HistoricoContainer';
import WeatherCard          from './WeatherCArd';
import SiloResumenCard      from './Siloresumencard';
import SiloControlCard      from './Silocontrolcard';
import SiloHeatmapWidget    from './SiloHeatmapWidget';
import { useSensor }        from '../hooks/SensorContext';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers con sensor_id — leen del SensorContext (polling HTTP)
// ─────────────────────────────────────────────────────────────────────────────
function SensorGaugeRenderer({ sensor_id, label, min, max, thresholds }) {
  const { value, unit, tags } = useSensor(sensor_id);
  return (
    <GaugeWidget
      value={value}
      unit={unit}
      label={label || tags?.sensor || sensor_id}
      min={min}
      max={max}
      thresholds={thresholds}
    />
  );
}

function SensorLineRenderer({ sensor_id, label, color, showArea, timeRange }) {
  const { value, unit, tags } = useSensor(sensor_id);
  // LineChartWidget muestra la serie acumulada en tiempo real
  // Para historial usar HistoricoContainer
  return (
    <LineChartWidget
      value={value}
      unit={unit}
      label={label || tags?.sensor || sensor_id}
      color={color}
      showArea={showArea}
      timeRange={timeRange}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers legacy (topic-based) — se mantienen para widgets existentes
// que no migraron al nuevo formato todavía
// ─────────────────────────────────────────────────────────────────────────────
function WeatherCardRenderer({ topic, stationName, label }) {
  // WeatherCard todavía usa datos de campo, no sensor_id simple
  // Se puede migrar más adelante mapeando sensor_ids individuales
  return <WeatherCard stationName={stationName || label || 'Estación'} />;
}

function SiloResumenRenderer({ topic, siloName, label }) {
  return <SiloResumenCard topic={topic} siloName={siloName || label} />;
}

function SiloControlRenderer({ topic, siloName, label }) {
  return <SiloControlCard topic={topic} siloName={siloName || label} />;
}

function SiloHeatmapRenderer({ topic, label }) {
  return <SiloHeatmapWidget topic={topic} label={label} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapas de tipos
// ─────────────────────────────────────────────────────────────────────────────

// Requieren sensor_id
const SENSOR_RENDERERS = {
  gauge: SensorGaugeRenderer,
  line:  SensorLineRenderer,
};

// Requieren topic (legacy)
const TOPIC_RENDERERS = {
  WeatherCard: WeatherCardRenderer,
  SiloResumen: SiloResumenRenderer,
  SiloControl: SiloControlRenderer,
  SiloHeatmap: SiloHeatmapRenderer,
};

// ─────────────────────────────────────────────────────────────────────────────
// ChartRenderer
// ─────────────────────────────────────────────────────────────────────────────
function ChartRenderer({ chart }) {
  const { id, tipo, sensor_id, ...rest } = chart;
  const isMobile = useIsMobile();
  const wrapStyle = { flex: isMobile ? '1 1 100%' : '1 1 auto', minWidth: 0 };

  // sensor_id presente → nuevo formato
  if (sensor_id) {
    const R = SENSOR_RENDERERS[tipo];
    if (R) return <div style={wrapStyle}><R key={id} sensor_id={sensor_id} {...rest} /></div>;
  }

  // topic presente → legacy
  const R = TOPIC_RENDERERS[tipo];
  if (R) return <div style={wrapStyle}><R key={id} {...rest} /></div>;

  return (
    <div style={{ padding:12, color:'#ef4444', fontSize:12,
      background:'rgba(239,68,68,0.08)', borderRadius:8 }}>
      Tipo desconocido: <b>{tipo}</b>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContainerWidget
// ─────────────────────────────────────────────────────────────────────────────
function ContainerWidget({ widget }) {
  return (
    <div style={{ display:'flex', flexDirection:'row', gap:16, width:'100%', flexWrap:'wrap' }}>
      {(widget.charts || []).map(chart => (
        <ChartRenderer key={chart.id} chart={chart} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WidgetRendererMulti — punto de entrada
// ─────────────────────────────────────────────────────────────────────────────
export default function WidgetRendererMulti({ widget }) {
  if (!widget) return null;

  if (widget.tipo === 'historico_cabo') {
    return (
      <HistoricoContainer
        cabos={widget.cabos   || []}
        siloId={widget.siloId || 'silo'}
        unit={widget.unit     || '°C'}
        min={widget.min       ?? 15}
        max={widget.max       ?? 40}
      />
    );
  }

  if (widget.tipo === 'container') return <ContainerWidget widget={widget} />;

  return <ChartRenderer chart={widget} />;
}