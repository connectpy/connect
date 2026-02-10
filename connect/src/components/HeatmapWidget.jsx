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
        if (point.field && point.value !== undefined) {
          valueMap[point.field] = parseFloat(point.value); // Asegurar que sea número
        }
      });
      
      console.log('[HeatmapWidget] Mapa de valores:', valueMap);
      
      // Layout del heatmap desde la configuración
      // Ejemplo: [["T7", "T8"], ["T5", "T6"], ["T1", "T2", "T3", "T4"]]
      const layout = config.layout || [];
      
      // Datos para ECharts en formato [col, row, value]
      const heatmapData = [];
      const fieldNameMap = {}; // Para el tooltip
      
      // Calcular el número máximo de columnas
      const maxCols = Math.max(...layout.map(row => row.length));
      
      // Iterar por cada fila del layout
      layout.forEach((row, rowIndex) => {
        // Centrar la fila si tiene menos columnas que el máximo
        const offset = Math.floor((maxCols - row.length) / 2);
        
        row.forEach((fieldName, colIndex) => {
          const value = valueMap[fieldName];
          
          if (value !== undefined && !isNaN(value)) {
            const col = colIndex + offset;
            const rowPos = rowIndex;
            
            // [columna, fila, valor] - SOLO 3 elementos para que visualMap funcione
            heatmapData.push([col, rowPos, value]);
            
            // Guardar el nombre del field para usarlo en tooltip
            fieldNameMap[`${col}_${rowPos}`] = fieldName;
          }
        });
      });
      
      console.log('[HeatmapWidget] Datos del heatmap:', heatmapData);
      console.log('[HeatmapWidget] Ejemplo de punto:', heatmapData[0]);
      console.log('[HeatmapWidget] FieldNameMap:', fieldNameMap);
      
      // Calcular min y max para la escala de colores
      const values = heatmapData.map(item => item[2]);
      
      if (values.length === 0) {
        console.error('[HeatmapWidget] No hay valores válidos');
        return;
      }
      
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      console.log('[HeatmapWidget] Rango de valores:', { minValue, maxValue, values });
      
      // Asegurar un rango mínimo para que se vean los colores
      const range = maxValue - minValue;
      const visualMin = range > 0 ? minValue : minValue - 5;
      const visualMax = range > 0 ? maxValue : maxValue + 5;
      
      console.log('[HeatmapWidget] Rango visual ajustado:', { visualMin, visualMax, range });
      
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
            const col = params.data[0];
            const row = params.data[1];
            const value = params.data[2];
            const fieldName = fieldNameMap[`${col}_${row}`] || 'Desconocido';
            const unit = config.medicion || '';
            
            return `
              <div style="padding: 8px;">
                <strong style="font-size: 14px;">${fieldName}</strong><br/>
                <span style="color: #94a3b8;">Valor:</span> <strong>${value.toFixed(2)}</strong> ${unit}
              </div>
            `;
          }
        },
        
        grid: {
          left: '5%',
          right: '5%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        
        xAxis: {
          type: 'category',
          data: Array.from({ length: maxCols }, (_, i) => ''),
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
          inverse: true
        },
        
        visualMap: {
          min: visualMin,
          max: visualMax,
          type: 'continuous',
          calculable: true,
          realtime: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '2%',
          textStyle: { 
            color: '#ffffff',
            fontSize: 11
          },
          itemWidth: 20,
          itemHeight: 140,
          // Paleta de colores de frío a caliente
          inRange: {
            color: [
              '#1e40af',  // Azul oscuro (frío)
              '#3b82f6',  // Azul medio
              '#06b6d4',  // Cyan
              '#14b8a6',  // Teal
              '#10b981',  // Verde
              '#84cc16',  // Lima
              '#fbbf24',  // Amarillo
              '#fb923c',  // Naranja claro
              '#f97316',  // Naranja
              '#ef4444',  // Rojo
              '#dc2626'   // Rojo oscuro (caliente)
            ]
          },
          text: [
            `${visualMax.toFixed(1)}${config.medicion || ''}`, 
            `${visualMin.toFixed(1)}${config.medicion || ''}`
          ],
          textGap: 10,
          splitNumber: 6,
          precision: 1,
          // CRÍTICO: especificar que use la dimensión 2 (el valor)
          dimension: 2,
          // Forzar el mapeo de valores
          seriesIndex: 0
        },
        
        series: [{
          name: config.label,
          type: 'heatmap',
          data: heatmapData,
          
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 'bold',
            formatter: (params) => {
              const col = params.data[0];
              const row = params.data[1];
              const value = params.data[2];
              const fieldName = fieldNameMap[`${col}_${row}`] || '?';
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
            borderWidth: 2,
            borderColor: '#1e293b'
          }
        }]
      };
      
      console.log('[HeatmapWidget] Configuración de visualMap:', {
        min: option.visualMap.min,
        max: option.visualMap.max,
        dimension: option.visualMap.dimension,
        dataCount: heatmapData.length
      });
      
      chartInstanceRef.current.setOption(option, true);
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