// src/components/widgets/HeatmapWidget.jsx
// Componente de heatmap con organización personalizada de sensores

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de heatmap histórico con sensores en filas y tiempo en columnas
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {Array<string>} props.config.fields - Array de campos a mostrar
 * @param {string} props.config.medicion - Unidad (ej: "°C")
 */
function HeatmapHistoricalWidget({ config }) {
  
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  
  // Cargar datos con lastValueOnly=false para obtener histórico
  const { data, loading, error } = useWidgetData(
    config,
    600000    // Actualizar cada 10 minutos
  );

  useEffect(() => {
    if (!chartRef.current) return;

    // Inicializar ECharts
    if (!chartInstanceRef.current) {
      console.log(`[HeatmapHistoricalWidget] Inicializando heatmap: ${config.label}`);
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    // Actualizar con datos
    if (data && data.length > 0) {
      console.log(`[HeatmapHistoricalWidget] Datos recibidos (primeros 5):`, data.slice(0, 5));
      console.log(`[HeatmapHistoricalWidget] Estructura de un dato:`, data[0]);
      
      // Preparar datos para ECharts en formato [col, row, value]
      const prepareData = (rawData) => {
        // 1. Extraer valores únicos para los ejes
        const times = [...new Set(rawData.map(d => d.time))].sort();
        const fields = [...new Set(rawData.map(d => d.field))].sort((a, b) => {
          // Orden natural para T1, T2... T10 (evita que T10 vaya tras T1)
          return a.localeCompare(b, undefined, { numeric: true });
        });

        console.log('[prepareData] Times encontrados:', times.length);
        console.log('[prepareData] Fields encontrados:', fields);
        console.log('[prepareData] Primer time:', times[0]);
        console.log('[prepareData] Último time:', times[times.length - 1]);

        // 2. Crear el mapa de datos [x, y, valor]
        // IMPORTANTE: Para heatmap de ECharts, el formato es [xIndex, yIndex, value]
        const heatmapData = rawData.map(item => {
          const xIndex = times.indexOf(item.time);
          const yIndex = fields.indexOf(item.field);
          const value = parseFloat(item.value); // Asegurar que sea número
          
          return [xIndex, yIndex, value];
        });

        console.log('[prepareData] Heatmap data (primeros 5):', heatmapData.slice(0, 5));
        console.log('[prepareData] Ejemplo de punto:', {
          indices: [heatmapData[0][0], heatmapData[0][1]],
          value: heatmapData[0][2],
          tipo: typeof heatmapData[0][2]
        });

        // 3. Formatear las fechas para el eje X
        const formattedTimes = times.map(time => {
          const date = new Date(time);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          return `${day}/${month} ${hours}:${minutes}`;
        });

        // Crear un mapa para acceder a la información original
        const dataMap = new Map();
        rawData.forEach(item => {
          const key = `${item.time}_${item.field}`;
          dataMap.set(key, item);
        });

        return { times: formattedTimes, fields, heatmapData, rawTimes: times, dataMap };
      };

      const { times, fields, heatmapData, rawTimes, dataMap } = prepareData(data);
      console.log(`[HeatmapHistoricalWidget] Datos preparados:`, { 
        timesCount: times.length, 
        fieldsCount: fields.length,
        dataPointsCount: heatmapData.length 
      });
      
      // Calcular min y max para la escala de colores
      const values = heatmapData.map(item => item[2]).filter(v => !isNaN(v));
      
      if (values.length === 0) {
        console.error('[HeatmapWidget] No hay valores numéricos válidos');
        return;
      }
      
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      console.log('[HeatmapWidget] Rango de valores:', { 
        minValue, 
        maxValue,
        valuesCount: values.length,
        sample: values.slice(0, 10)
      });
      
      // Asegurar que hay variación en el rango
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
          text: config.label || 'Heatmap',
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
            console.log('[Tooltip] Params recibidos:', params);
            
            const xIndex = params.data[0];
            const yIndex = params.data[1];
            const value = params.data[2];
            
            const fieldName = fields[yIndex];
            const timeLabel = times[xIndex];
            const rawTime = rawTimes[xIndex];
            
            // Buscar el dato original
            const key = `${rawTime}_${fieldName}`;
            const originalData = dataMap.get(key);
            
            console.log('[Tooltip] Valores:', { 
              xIndex, 
              yIndex, 
              value, 
              fieldName, 
              timeLabel,
              originalData 
            });
            
            const unit = config.medicion || '';
            
            return `
              <div style="padding: 8px;">
                <strong style="font-size: 14px;">${fieldName}</strong><br/>
                <span style="color: #94a3b8;">Tiempo:</span> ${timeLabel}<br/>
                <span style="color: #94a3b8;">Valor:</span> <strong>${value.toFixed(2)}</strong> ${unit}
              </div>
            `;
          }
        },
        
        grid: {
          left: '10%',
          right: '5%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        
        xAxis: {
          type: 'category',
          data: times,
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(51, 65, 85, 0.1)', 'rgba(51, 65, 85, 0.2)']
            }
          },
          axisLine: { 
            show: true,
            lineStyle: { color: '#475569' }
          },
          axisTick: { show: false },
          axisLabel: { 
            color: '#94a3b8',
            fontSize: 9,
            rotate: 45,
            interval: Math.floor(times.length / 10) // Mostrar cada N etiquetas
          }
        },
        
        yAxis: {
          type: 'category',
          data: fields,
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(51, 65, 85, 0.1)', 'rgba(51, 65, 85, 0.2)']
            }
          },
          axisLine: { 
            show: true,
            lineStyle: { color: '#475569' }
          },
          axisTick: { show: false },
          axisLabel: { 
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 'bold'
          }
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
          // Paleta de colores más contrastada
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
          precision: 1
        },
        
        series: [{
          name: config.label || 'Heatmap',
          type: 'heatmap',
          data: heatmapData,
          
          label: {
            show: true,
            color: '#ffffff',
            fontSize: 10,
            fontWeight: 'bold',
            formatter: (params) => {
              const value = params.data[2];
              return `${value.toFixed(1)}`;
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
      
      console.log('[HeatmapWidget] Aplicando configuración:', {
        seriesDataLength: option.series[0].data.length,
        xAxisLength: option.xAxis.data.length,
        yAxisLength: option.yAxis.data.length
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

export default HeatmapHistoricalWidget;