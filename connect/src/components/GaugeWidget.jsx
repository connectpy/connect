// src/components/widgets/GaugeWidget.jsx
// Componente de gauge (medidor) para mostrar datos de InfluxDB

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de gauge (medidor circular)
 * 
 * Muestra el último valor de un sensor en un medidor circular
 * Se actualiza automáticamente cada 5 segundos
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {string} props.config.field - Campo
 * @param {string} props.config.min - Valor mínimo de la escala
 * @param {string} props.config.max - Valor máximo de la escala
 */
function GaugeWidget({ config }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const { data, loading, error } = useWidgetData(
    {
      bucket: config.bucket,
      measurement: config.measurement,
      field: config.field
    },
    config.timeRange || '1h',
    5000
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }

    if (loading) {
      chartRef.current.setOption({
        series: [
          {
            type: 'gauge',
            progress: {
              show: true
            },
            axisLine: {
              lineStyle: {
                width: 30
              }
            },
            axisTick: {
              show: false
            },
            splitLine: {
              show: false
            },
            axisLabel: {
              show: false
            },
            detail: {
              valueAnimation: true,
              formatter: '{value}%',
              color: '#64748b'
            },
            data: [
              {
                value: 50,
                name: 'Cargando...'
              }
            ]
          }
        ]
      });
      return;
    }

    if (error) {
      chartRef.current.setOption({
        series: [
          {
            type: 'gauge',
            data: [
              {
                value: 0,
                name: 'Error'
              }
            ]
          }
        ]
      });
      return;
    }

    // Obtener el último valor
    const latestValue = data && data.length > 0 ? data[data.length - 1].value : 0;
    const minValue = parseFloat(config.min) || 0;
    const maxValue = parseFloat(config.max) || 100;

    // Normalizar el valor a una escala de 0-100
    const normalizedValue = Math.max(
      minValue,
      Math.min(maxValue, latestValue)
    );
    const percentage = ((normalizedValue - minValue) / (maxValue - minValue)) * 100;

    chartRef.current.setOption({
      series: [
        {
          type: 'gauge',
          startAngle: 225,
          endAngle: -45,
          progress: {
            show: true,
            width: 30,
            itemStyle: {
              color: '#3b82f6'
            }
          },
          axisLine: {
            lineStyle: {
              width: 30,
              color: [[1, '#e2e8f0']]
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: true,
            color: '#64748b'
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: '#1e293b',
            fontSize: 16
          },
          data: [
            {
              value: percentage,
              name: config.field || 'Valor'
            }
          ]
        }
      ]
    });
  }, [data, loading, error, config]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '300px',
        minHeight: '200px'
      }}
    />
  );
}

export default GaugeWidget;
