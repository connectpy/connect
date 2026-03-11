import { useState, useEffect } from 'react';
import GaugeWidget          from './GaugeWidget';
import LineChartWidget      from './LineChartWidget';
import SpatialHeatmapWidget from './SpatialHeatmapWidget';
import HistoricoContainer   from './HistoricoContainer';
import WeatherCard          from './WeatherCArd';
import SiloResumenCard      from './Siloresumencard';
import SiloControlCard      from './Silocontrolcard';
import SiloHeatmapWidget    from './SiloHeatmapWidget';
import { useTopic }         from '../hooks/MqttContext';

// ─────────────────────────────────────────────────────────────────────────────
// Hook para detectar si estamos en pantalla pequeña (móvil)
// ─────────────────────────────────────────────────────────────────────────────
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
// Renderers inline para componentes que necesitan useTopic internamente
// ─────────────────────────────────────────────────────────────────────────────

function WeatherCardRenderer({ topic, stationName, label }) {
  const { getField } = useTopic(topic);
  const tempHist = getField('tempHist');
  const humHist  = getField('humHist');
  return (
    <WeatherCard
      temp={getField('temp')}
      humedad={getField('humedad')}
      rocio={getField('rocio')}
      connected={getField('connected') ?? false}
      tempHist={Array.isArray(tempHist) && tempHist.length > 0 ? tempHist : undefined}
      humHist={Array.isArray(humHist)   && humHist.length  > 0 ? humHist  : undefined}
      stationName={stationName || label || 'Estación'}
    />
  );
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
// Mapa tipo → componente para charts simples
// ─────────────────────────────────────────────────────────────────────────────
const CHART_MAP = {
  gauge:           GaugeWidget,
  line:            LineChartWidget,
  spatial_heatmap: SpatialHeatmapWidget,
};

const COMPLEX_RENDERERS = {
  WeatherCard: WeatherCardRenderer,
  SiloResumen: SiloResumenRenderer,
  SiloControl: SiloControlRenderer,
  SiloHeatmap: SiloHeatmapRenderer,
};

// ─────────────────────────────────────────────────────────────────────────────
// ChartRenderer — decide qué componente usar según chart.tipo
// ─────────────────────────────────────────────────────────────────────────────
function ChartRenderer({ chart }) {
  const { id, tipo, ...rest } = chart;
  const isMobile = useIsMobile();

  const ComplexRenderer = COMPLEX_RENDERERS[tipo];
  if (ComplexRenderer) {
    return (
      <div style={{ flex: isMobile ? '1 1 100%' : '1 1 auto', minWidth: 0 }}>
        <ComplexRenderer key={id} {...rest} />
      </div>
    );
  }

  const Component = CHART_MAP[tipo];
  if (!Component) {
    return (
      <div style={{ padding: 12, color: '#ef4444', fontSize: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
        Tipo desconocido: <b>{tipo}</b>
      </div>
    );
  }

  const props = {
    topic:        rest.topic,
    field:        rest.field,
    fields:       rest.fields,
    layout:       rest.layout,
    label:        rest.label,
    unit:         rest.unit || rest.medicion || '',
    min:          rest.min,
    max:          rest.max,
    thresholds:   rest.thresholds,
    timeRange:    rest.timeRange,
    color:        rest.color,
    showArea:     rest.showArea,
    stationName:  rest.stationName,
    siloName:     rest.siloName,
    topicControl: rest.topicControl,
  };

  return (
    <div style={{ flex: isMobile ? '1 1 100%' : '1 1 auto', minWidth: 0 }}>
      <Component key={id} {...props} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContainerWidget — agrupa charts en fila con wrap responsivo
// ─────────────────────────────────────────────────────────────────────────────
function ContainerWidget({ widget }) {
  const charts = widget.charts || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 16, width: '100%', flexWrap: 'wrap' }}>
      {charts.map((chart) => (
        <ChartRenderer key={chart.id} chart={chart} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WidgetRendererMulti — punto de entrada desde Dashboard / DemoDashboard
// ─────────────────────────────────────────────────────────────────────────────
export default function WidgetRendererMulti({ widget }) {
  if (!widget) return null;

  // historico_cabo: heatmap por cabo + gráfico línea con áreas
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

  // historico (legacy): selectores de fecha + gráficos bajo demanda
  if (widget.tipo === 'historico') {
    return <HistoricoContainer charts={widget.charts || []} label={widget.label} />;
  }

  // container: uno o varios charts agrupados en fila
  if (widget.tipo === 'container') {
    return <ContainerWidget widget={widget} />;
  }

  // widget suelto (gauge, line, WeatherCard, SiloResumen, etc.)
  return <ChartRenderer chart={widget} />;
}