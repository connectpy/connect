// components/demo/DemoLineChart.jsx
'use client';

import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { demoData } from '../influxDemoClient';

export default function DemoLineChart({ 
  measurement, 
  field, 
  deviceId = null,
  timeRange = '-1h',
  title = 'Gráfico de Línea',
  unit = '',
  aggregateWindow = null,
  refreshInterval = 30000 // 30 segundos
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Inicializar el gráfico
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        const data = await demoData({
          bucket: process.env.NEXT_PUBLIC_INFLUX_BUCKET,
          measurement,
          field,
          deviceId,
          timeRange,
          aggregateWindow
        });

        // Formatear datos para ECharts
        const times = data.map(d => new Date(d._time).toLocaleTimeString());
        const values = data.map(d => d._value);

        const option = {
          title: {
            text: title,
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            formatter: (params) => {
              const param = params[0];
              return `${param.name}<br/>${param.seriesName}: ${param.value}${unit}`;
            }
          },
          xAxis: {
            type: 'category',
            data: times,
            axisLabel: {
              rotate: 45
            }
          },
          yAxis: {
            type: 'value',
            name: unit,
            axisLabel: {
              formatter: `{value}${unit}`
            }
          },
          series: [
            {
              name: field || measurement,
              type: 'line',
              data: values,
              smooth: true,
              itemStyle: {
                color: '#5470c6'
              },
              areaStyle: {
                opacity: 0.3
              }
            }
          ],
          grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
          }
        };

        if (chartInstance.current) {
          chartInstance.current.setOption(option);
        }

        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Auto-refresh
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [measurement, field, deviceId, timeRange, title, unit, aggregateWindow, refreshInterval]);

  // Manejar resize
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center border rounded bg-red-50">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-96 relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      )}
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
}