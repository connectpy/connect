// src/components/widgets/WidgetRenderer.jsx
import React from 'react';
import LineChartWidget from './LineChartWidget.jsx';
import HeatmapWidget from './HeatmapWidget.jsx';
import GaugeWidget from './GaugeWidget.jsx';


function WidgetRenderer({ widget }) {
  const widgetComponents = {
    'line': LineChartWidget,
    'heatmap': HeatmapWidget,
    'gauge': GaugeWidget,
  };

  const WidgetComponent = widgetComponents[widget.tipo];

  if (!WidgetComponent) {
    return (
      <div className="widget-placeholder">
        <p>Tipo de widget "{widget.tipo}" no implementado</p>
      </div>
    );
  }

  return <WidgetComponent config={widget} />;
}

export default WidgetRenderer;


