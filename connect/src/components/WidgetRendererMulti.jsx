
import LineChartWidget from './LineChartWidget.jsx';
import HeatmapWidget from './HeatmapWidget.jsx';
import GaugeWidget from './GaugeWidget.jsx';
import HistoricalWidget from './HistoricalWidget.jsx';

function WidgetRendererMulti({ widget }) {

    // 1. Si es un widget de tipo histórico
  if (widget.tipo === 'historical' && widget.charts) {
    return <HistoricalWidget widget={widget} />;
  }
  // 2. Si el widget tiene un array de charts, renderizamos múltiples
  if (widget.tipo === 'container' && widget.charts) {
    return (
      <div className="internal-widget-grid">
        {widget.charts.map((subChart) => (
          <div key={subChart.id} className="sub-chart-item">
            {/*<h4 className="sub-chart-label">{subChart.label}</h4>*/}
            {/* Llamada recursiva o directa según tu lógica */}
            <SingleChartRenderer config={subChart} />
          </div>
        ))}
      </div>
    );
  }

  // 3. Si es un widget simple (el comportamiento que ya tienes)
  return <SingleChartRenderer config={widget} />;
}

// Componente auxiliar para no repetir lógica de "Switch"
function SingleChartRenderer({ config }) {
  switch (config.tipo) {
    case 'heatmap':
      return <HeatmapWidget config={config} />;
    case 'line':
      return <LineChartWidget config={config} />;
    case 'gauge':
      return <GaugeWidget config={config} />;
    default:
      return <p>Tipo de gráfico no soportado</p>;
  }
}

export default WidgetRendererMulti;