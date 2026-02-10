//este componente crea un widget con controles para seleccionar un rango de fechas y un botón para consultar los datos históricos

import { useState } from 'react';
import LineChartWidget from './LineChartWidget.jsx';
import HeatmapWidget from './HeatmapWidget.jsx';
import GaugeWidget from './GaugeWidget.jsx';


function HistoricalWidget({ widget }) {
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
  });
  const [appliedDateRange, setAppliedDateRange] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  function getDefaultStartDate() {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 días atrás por defecto
    return date.toISOString().slice(0, 16);
  }

  function getDefaultEndDate() {
    return new Date().toISOString().slice(0, 16);
  }

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConsult = () => {
    setIsLoading(true);
    // Aplicamos el rango de fechas
    setAppliedDateRange({
      start: new Date(dateRange.start).toISOString(),
      end: new Date(dateRange.end).toISOString()
    });
    
    // Simulamos un pequeño delay para el loading
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="historical-widget-container">
      {/* Panel de controles de fecha */}
      <div className="historical-controls">
        <div className="date-inputs">
          <div className="date-input-group">
            <label htmlFor={`start-${widget.id}`}>Desde:</label>
            <input
              id={`start-${widget.id}`}
              type="datetime-local"
              value={dateRange.start}
              onChange={(e) => handleDateChange('start', e.target.value)}
              max={dateRange.end}
            />
          </div>
          
          <div className="date-input-group">
            <label htmlFor={`end-${widget.id}`}>Hasta:</label>
            <input
              id={`end-${widget.id}`}
              type="datetime-local"
              value={dateRange.end}
              onChange={(e) => handleDateChange('end', e.target.value)}
              min={dateRange.start}
              max={getDefaultEndDate()}
            />
          </div>
        </div>

        <button 
          className="consult-button"
          onClick={handleConsult}
          disabled={isLoading}
        >
          {isLoading ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* Área de gráficos */}
      <div className="historical-charts-area">
        {isLoading ? (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Cargando datos históricos...</p>
          </div>
        ) : appliedDateRange ? (
          <div className="internal-widget-grid">
            {widget.charts?.map((subChart) => (
              <div key={subChart.id} className="sub-chart-item">
                <h4 className="sub-chart-label">{subChart.label}</h4>
                <SingleChartRenderer 
                  config={subChart} 
                  dateRange={appliedDateRange}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <p>Selecciona un rango de fechas y presiona "Consultar" para ver los datos históricos</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para renderizar cada gráfico individual
function SingleChartRenderer({ config, dateRange }) {
  // Extendemos la config con el rango de fechas
  const configWithDateRange = {
    ...config,
    dateRange // Pasamos el rango de fechas a cada gráfico
  };

  switch (config.tipo) {
    case 'heatmap':
      return <HeatmapWidget config={configWithDateRange} />;
    case 'line':
      return <LineChartWidget config={configWithDateRange} />;
    case 'gauge':
      return <GaugeWidget config={configWithDateRange} />;
    default:
      return <p>Tipo de gráfico no soportado</p>;
  }
}

export default HistoricalWidget;