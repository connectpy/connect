// src/components/widgets/HeatmapWidget.jsx
// Componente de heatmap con organización personalizada de sensores

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de heatmap con layout personalizado
 * 
 * Muestra valores de múltiples sensores en un layout tipo matriz
 * Ejemplo: T7, T8 en fila 1; T5, T6 en fila 2; T1, T2, T3, T4 en fila 3
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {Array<string>} props.config.fields - Array de fields (ej: ["T1", "T2", ...])
 * @param {Array<Array<string>>} props.config.layout - Layout del heatmap
 *   Ejemplo: [["T7", "T8"], ["T5", "T6"], ["T1", "T2", "T3", "T4"]]
 * @param {string} props.config.medicion - Unidad (ej: "°C")
 */
function HeatmapWidget({ config }) {
  
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  
  // Cargar datos con lastValueOnly=true para obtener solo el último valor
  const { data, loading, error } = useWidgetData(
    {
      ...config,
      lastValueOnly: true  // Solo queremos el último valor de cada sensor
    },
    '1h',    // Rango (irrelevante con lastValueOnly, pero necesario)
    10000    // Actualizar cada 10 segundos
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
      
      // ==================================================================
      // TRANSFORMAR DATOS AL FORMATO DEL LAYOUT
      // ==================================================================
      
      // Crear un mapa de field -> value para acceso rápido
      const valueMap = {};
      data.forEach(point => {
        if (point.field) {
          valueMap[point.field] = point.value;
        }
      });
      
      console.log('[HeatmapWidget] Mapa de valores:', valueMap);
      
      // Layout del heatmap desde la configuración
      // Ejemplo: [["T7", "T8"], ["T5", "T6"], ["T1", "T2", "T3", "T4"]]
      const layout = config.layout || [];
      
      // Datos para ECharts en formato [col, row, value]
      const heatmapData = [];
      
      // Calcular el número máximo de columnas
      const maxCols = Math.max(...layout.map(row => row.length));
      
      // Iterar por cada fila del layout
      layout.forEach((row, rowIndex) => {
        // Centrar la fila si tiene menos columnas que el máximo
        const offset = Math.floor((maxCols - row.length) / 2);
        
        row.forEach((fieldName, colIndex) => {
          const value = valueMap[fieldName];
          
          if (value !== undefined) {
            // [columna, fila, valor]
            heatmapData.push([
              colIndex + offset,  // Columna (con offset para centrar)
              rowIndex,           // Fila
              value,              // Valor del sensor
              fieldName           // Guardar el nombre para el tooltip
            ]);
          }
        });
      });
      
      console.log('[HeatmapWidget] Datos del heatmap:', heatmapData);
      
      // Calcular min y max para la escala de colores
      const values = heatmapData.map(item => item[2]);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      // ==================================================================
      // CONFIGURACIÓN DEL HEATMAP
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
          left: '10',
          top: '10'
        },
        
        tooltip: {
          position: 'top',
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          borderColor: '#475569',
          textStyle: { color: '#ffffff' },
          formatter: (params) => {
            const fieldName = params.data[3]; // Nombre del sensor
            const value = params.data[2];     // Valor
            return `
              <div style="padding: 5px;">
                <strong>${fieldName}</strong><br/>
                ${value.toFixed(2)} ${config.medicion}
              </div>
            `;
          }
        },
        
        grid: {
          left: '5%',
          right: '5%',
          bottom: '15%',
          top: '20%',
          containLabel: true
        },
        
        xAxis: {
          type: 'category',
          data: Array.from({ length: maxCols }, (_, i) => ''),  // Vacío, no mostrar etiquetas
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(51, 65, 85, 0.1)', 'rgba(51, 65, 85, 0.2)']
            }
          },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false }
        },
        
        yAxis: {
          type: 'category',
          data: Array.from({ length: layout.length }, (_, i) => `Fila ${i + 1}`),
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(51, 65, 85, 0.1)', 'rgba(51, 65, 85, 0.2)']
            }
          },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: '#94a3b8',
            fontSize: 11
          },
          inverse: true  // Invertir para que fila 1 esté arriba
        },
        
        visualMap: {
          min: minValue,
          max: maxValue,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          textStyle: { 
            color: '#ffffff',
            fontSize: 11
          },
          inRange: {
            // Escala de colores: azul (frío) -> verde -> amarillo -> rojo (caliente)
            color: ['#0ea5e9', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
          }
        },
        
        series: [{
          name: config.label,
          type: 'heatmap',
          data: heatmapData,
          
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 'bold',
            // Mostrar nombre del sensor y valor
            formatter: (params) => {
              const fieldName = params.data[3];
              const value = params.data[2];
              return `${fieldName}\n${value.toFixed(1)}`;
            }
          },
          
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#06b6d4',
              borderWidth: 2
            }
          },
          
          itemStyle: {
            borderWidth: 1,
            borderColor: '#1e293b'
          }
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
}

export default HeatmapWidget;