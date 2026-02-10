import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de heatmap historico con layout personalizado
 * 
 * Muestra valores de múltiples sensores en un layout tipo matriz
 * Ejemplo: T7, T8 en fila 1; T5, T6 en fila 2; T1, T2, T3, T4 en fila 3
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {Array<string>} props.config.fields - Array de fields (ej: ["T1", "T2", ...])
 * @param {string} props.config.medicion - Unidad (ej: "°C")
 * @param {Object} [props.config.dateRange] - Rango de fechas para widgets históricos (opcional, formato: { start: ISOString, end: ISOString })
 */

function HeatmapHistoricalWidget({ config }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
  
  // Cargar datos con lastValueOnly=true para obtener solo el último valor
    const { data, loading, error } = useWidgetData(
        config,
        600000    // Actualizar cada 10 minutos
    );
    useEffect(() => {
        if (!chartRef.current) return;

        // Inicializar ECharts
        if (!chartInstanceRef.current) {
        console.log(`[HeatmapWidget] Inicializando heatmap: ${config.label}`);
        chartInstanceRef.current = echarts.init(chartRef.current);
        }

        // Actualizar con datos
        if (data && data.length > 0) {
        console.log(`[HeatmapWidget] Datos recibidos:`, data);
        }
    }, [data, config]);
}

  // Responsive
useEffect(() => {
    const handleResize = () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.resize();
        }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);

  // Cleanup
useEffect(() => {
    return () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.dispose();
            chartInstanceRef.current = null;
        }
    };
}, []);

  // Estados de loading y error
if (loading && !data) {
    return (
        <div className="widget-loading">
            <div className="spinner"></div>
            <p>Cargando heatmap...</p>
        </div>
    );
}

  if (error) {
    return (
      <div className="widget-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p className="error-message">Error al cargar heatmap</p>
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '400px'
      }}
    />
  );


export default HeatmapHistoricalWidget;