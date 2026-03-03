import GaugeWidget from './demoGauge';
import LineChartWidget from './demoLineChart';
import ValueCardWidget from './ValueCardWidget';
import HeatmapWidget from './demoHeatmapWidget';

/**
 * WidgetRenderer
 * Traduce un objeto de configuración al componente correcto.
 *
 * Cada widget en la config tiene la forma:
 * {
 *   id      : "temp-gauge",       ← identificador único
 *   type    : "gauge",            ← 'gauge' | 'linechart' | 'valuecard' | 'heatmap'
 *   topic   : "estacion/temperatura",
 *   size    : "half",             ← 'full' | 'half' | 'third' (ancho en el grid)
 *   title   : "Temperatura Actual",
 *   ...propiedades específicas del widget
 * }
 */
const WIDGET_MAP = {
  gauge: GaugeWidget,
  linechart: LineChartWidget,
  valuecard: ValueCardWidget,
  heatmap: HeatmapWidget,
};

export default function WidgetRenderer({ config }) {
  const { id, type, size = 'half', title, topic, ...rest } = config;

  const Component = WIDGET_MAP[type];

  if (!Component) {
    return (
      <div className="widget-card" style={{ padding: 20, color: '#ef4444' }}>
        Widget tipo "<b>{type}</b>" no reconocido.
      </div>
    );
  }

  const sizeClass = {
    full: 'full-width',
    half: 'half-width',
    third: 'third-width',
  }[size] || 'half-width';

  return (
    <div className={`widget-card ${sizeClass}`} key={id}>
      <div className="widget-header">
        <h3>{title}</h3>
      </div>
      <div className="widget-content">
        <Component topic={topic} title={title} {...rest} />
      </div>
    </div>
  );
}