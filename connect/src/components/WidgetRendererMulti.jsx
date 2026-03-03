import GaugeWidget from './GaugeWidget';
import LineChartWidget from './LineChartWidget';
import SpatialHeatmapWidget from './SpatialHeatmapWidget';
import HistoricoContainer from './HistoricoContainer';

/**
 * WidgetRendererMulti
 *
 * Tipos de widget.tipo:
 *   'container'  → varios charts lado a lado
 *   'historico'  → selectores de fecha + consulta WS + LineCharts
 *
 * Tipos de chart.tipo dentro de container/historico:
 *   'gauge'           → GaugeWidget
 *   'line'            → LineChartWidget
 *   'spatial_heatmap' → SpatialHeatmapWidget
 */

const CHART_MAP = {
  gauge:           GaugeWidget,
  line:            LineChartWidget,
  spatial_heatmap: SpatialHeatmapWidget,
};

function ChartRenderer({ chart }) {
  const Component = CHART_MAP[chart.tipo];

  if (!Component) {
    return (
      <div style={{ padding: 12, color: '#ef4444', fontSize: 12 }}>
        Tipo desconocido: <b>{chart.tipo}</b>
      </div>
    );
  }

  // Extraer id/tipo del objeto — NO incluirlos en el spread para evitar
  // el warning "key in props spread"
  const { id, tipo, ...rest } = chart;

  const props = {
    topic:      rest.topic,
    field:      rest.field,
    fields:     rest.fields,
    layout:     rest.layout,
    label:      rest.label,
    unit:       rest.unit || rest.medicion || '',
    min:        rest.min,
    max:        rest.max,
    thresholds: rest.thresholds,
    timeRange:  rest.timeRange,
    color:      rest.color,
    showArea:   rest.showArea,
  };

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Component key={id} {...props} />
    </div>
  );
}

function ContainerWidget({ widget }) {
  const charts = widget.charts || [];
  const isRow = charts.length > 1;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isRow ? 'row' : 'column',
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

export default function WidgetRendererMulti({ widget }) {
  if (!widget) return null;

  // Pestaña de historico: selectores de fecha + graficos bajo demanda
  if (widget.tipo === 'historico') {
    return <HistoricoContainer charts={widget.charts || []} label={widget.label} />;
  }

  // Container: uno o varios charts lado a lado
  if (widget.tipo === 'container') {
    return <ContainerWidget widget={widget} />;
  }

  // Widget suelto sin container
  return <ChartRenderer chart={widget} />;
}