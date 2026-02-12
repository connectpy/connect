// src/components/widgets/GaugeWidget.jsx
// Componente de medidor circular (gauge) para valores instantáneos

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de Gauge (Medidor circular)
 * 
 * Muestra el último valor de un sensor como un medidor circular
 * Ideal para presión, temperatura, velocidad, porcentaje, etc.
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {string} props.config.field - Campo del sensor
 * @param {string} props.config.label - Título del gauge
 * @param {string} props.config.medicion - Unidad (ej: "PSI", "°C", "%")
 * @param {number} [props.config.min] - Valor mínimo del gauge (default: 0)
 * @param {number} [props.config.max] - Valor máximo del gauge (default: 100)
 * @param {Array} [props.config.thresholds] - Umbrales de color
 *   Ejemplo: [
 *     { value: 30, color: '#10b981' },  // Verde hasta 30
 *     { value: 70, color: '#f59e0b' },  // Amarillo de 30-70
 *     { value: 100, color: '#ef4444' }  // Rojo de 70-100
 *   ]
 */
function GaugeWidget({ config }) {
  
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  
  // Cargar datos - solo necesitamos el último valor
  const { data, loading, error } = useWidgetData(
    {
      ...config,
      lastValueOnly: true  // Solo el último valor
    },
    '5m',    // Rango pequeño ya que solo queremos el último
    5000     // Actualizar cada 5 segundos
  );

  useEffect(() => {
    if (!chartRef.current) return;

    // Inicializar ECharts
    if (!chartInstanceRef.current) {
      //console.log(`[GaugeWidget] Inicializando gauge: ${config.label}`);
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    // Actualizar con datos
    if (data && data.length > 0) {
      // Obtener el último valor
      const latestValue = data[data.length - 1].value;
      
      //console.log(`[GaugeWidget] Valor actual: ${latestValue} ${config.medicion}`);
      
      // Configuración de rangos
      const min = config.min !== undefined ? config.min : 0;
      const max = config.max !== undefined ? config.max : 100;
      
      // Umbrales de color por defecto
      const defaultThresholds = [
        { value: (max - min) * 0.33 + min, color: '#10b981' },  // Verde: 0-33%
        { value: (max - min) * 0.66 + min, color: '#f59e0b' },  // Amarillo: 33-66%
        { value: max, color: '#ef4444' }                         // Rojo: 66-100%
      ];
      
      const thresholds = config.thresholds || defaultThresholds;
      
      // ==================================================================
      // CONFIGURACIÓN DEL GAUGE
      // ==================================================================
      
      const option = {
        backgroundColor: 'transparent',
        
        title: {
          text: config.label,
          textStyle: { 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 600
          },
          left: 'center',
          top: '5%'
        },
        
        series: [{
          type: 'gauge',
          min: min,
          max: max,
          
          // Dividir el gauge en secciones de color según umbrales
          axisLine: {
            lineStyle: {
              width: 20,
              color: thresholds.map((threshold, index) => {
                const prevValue = index === 0 ? min : thresholds[index - 1].value;
                const percentage = (threshold.value - min) / (max - min);
                return [percentage, threshold.color];
              })
            }
          },
          
          // Configuración del puntero
          pointer: {
            itemStyle: {
              color: '#06b6d4',
              shadowColor: 'rgba(6, 182, 212, 0.5)',
              shadowBlur: 10
            },
            length: '70%',
            width: 6
          },
          
          // Centro del gauge
          anchor: {
            show: true,
            showAbove: true,
            size: 15,
            itemStyle: {
              color: '#06b6d4',
              borderWidth: 2,
              borderColor: '#ffffff',
              shadowBlur: 5,
              shadowColor: 'rgba(6, 182, 212, 0.5)'
            }
          },
          
          // Etiquetas de los ejes
          axisLabel: {
            color: '#94a3b8',
            fontSize: 11,
            distance: -45,
            formatter: (value) => {
              // Mostrar solo algunos valores para no saturar
              if (value === min || value === max || value === (min + max) / 2) {
                return Math.round(value);
              }
              return '';
            }
          },
          
          // Líneas divisorias
          axisTick: {
            distance: -30,
            length: 6,
            lineStyle: {
              color: '#475569',
              width: 2
            }
          },
          
          splitLine: {
            distance: -35,
            length: 10,
            lineStyle: {
              color: '#475569',
              width: 3
            }
          },
          
          // Valor central (número grande)
          detail: {
            valueAnimation: true,
            formatter: (value) => {
              return `{value|${value.toFixed(1)}}\n{unit|${config.medicion}}`;
            },
            rich: {
              value: {
                fontSize: 40,
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: 50
              },
              unit: {
                fontSize: 18,
                color: '#94a3b8',
                padding: [10, 0, 0, 0]
              }
            },
            offsetCenter: [0, '70%']
          },
          
          // Título dentro del gauge
          title: {
            show: false  // Ya tenemos título arriba
          },
          
          // El valor actual
          data: [{
            value: latestValue,
            name: ''
          }],
          
          // Animación
          animation: true,
          animationDuration: 1000,
          animationEasing: 'elasticOut'
        }]
      };
      
      chartInstanceRef.current.setOption(option);
    }
  }, [data, config]);

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
        <p>Cargando medidor...</p>
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
        <p className="error-message">Error al cargar gauge</p>
        <p className="error-detail">{error}</p>
      </div>
    );
  }
  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '350px'
      }}
    />
  );
}

export default GaugeWidget;