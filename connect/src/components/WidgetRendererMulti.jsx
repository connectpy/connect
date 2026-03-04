import { useState, useEffect } from 'react';
import GaugeWidget        from './GaugeWidget';
import LineChartWidget    from './LineChartWidget';
import SpatialHeatmapWidget from './SpatialHeatmapWidget';
import HistoricoContainer from './HistoricoContainer';
import WeatherCard        from './WeatherCArd';
import SiloResumenCard    from './Siloresumencard';
import SiloControlCard    from './Silocontrolcard';
import { useTopic }       from '../hooks/MqttContext';

// ─────────────────────────────────────────────────────────────────────────────
// Hook para detectar si estamos en pantalla pequeña (móvil)
// ─────────────────────────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    const listener = window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers inline para componentes que necesitan useTopic internamente
// (los hooks solo pueden llamarse dentro de componentes funcionales de React)
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

function SiloControlRenderer({ topic, topicControl, siloName, label }) {
  return <SiloControlCard topic={topic} topicControl={topicControl} siloName={siloName || label} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapa tipo → componente para charts simples
// ─────────────────────────────────────────────────────────────────────────────
const CHART_MAP = {
  gauge:           GaugeWidget,
  line:            LineChartWidget,
  spatial_heatmap: SpatialHeatmapWidget,
};

// Tipos que se renderizan con su propio renderer inline
const COMPLEX_RENDERERS = {
  WeatherCard:  WeatherCardRenderer,
  SiloResumen:  SiloResumenRenderer,
  SiloControl:  SiloControlRenderer,
};

// ─────────────────────────────────────────────────────────────────────────────
// ChartRenderer — decide que componente usar segun chart.tipo
// ─────────────────────────────────────────────────────────────────────────────
function ChartRenderer({ chart }) {
  const { id, tipo, ...rest } = chart;
  const isMobile = useIsMobile();

  // Widgets complejos con su propio renderer
  const ComplexRenderer = COMPLEX_RENDERERS[tipo];
  if (ComplexRenderer) {
    return (
      <div style={{ 
        flex: isMobile ? '1 1 100%' : '1 1 auto',
        minWidth: 0 
      }}>
        <ComplexRenderer key={id} {...rest} />
      </div>
    );
  }

  // Widgets simples del mapa
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
    <div style={{ 
      flex: isMobile ? '1 1 100%' : '1 1 auto',
      minWidth: 0 
    }}>
      <Component key={id} {...props} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContainerWidget — agrupa charts en fila, con wrap responsivo
// ─────────────────────────────────────────────────────────────────────────────
function ContainerWidget({ widget }) {
  const charts = widget.charts || [];
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: 16,
      width: '100%',
      flexWrap: 'wrap',
    }}>
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

  // Historico: selectores de fecha + graficos bajo demanda
  if (widget.tipo === 'historico') {
    return <HistoricoContainer charts={widget.charts || []} label={widget.label} />;
  }

  // Container: uno o varios charts agrupados
  if (widget.tipo === 'container') {
    return <ContainerWidget widget={widget} />;
  }

  // Widget suelto (gauge, line, WeatherCard, SiloResumen, etc.)
  return <ChartRenderer chart={widget} />;
}