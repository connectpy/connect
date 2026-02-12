'use client';

import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { getDemoLatestValue } from '../influxDemoClient';

export default function DemoGauge({
  bucket,
  measurement,
  field,
  title = 'Gauge',
  unit = '',
  min = 0,
  max = 100,
  refreshInterval = 5000
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Inicializar y limpiar el gráfico
  useEffect(() => {
    // CORRECCIÓN: Si el ref existe y no hay instancia, inicializar
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Manejar redimensionamiento de ventana
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null; // Limpiar la referencia
      }
    };
  }, []);

  // 2. Fetch data y actualización
  useEffect(() => {
    async function fetchData() {
      try {
        // Solo mostrar loading la primera vez para evitar parpadeos en el refresh
        if (!chartInstance.current?.getOption()) setLoading(true);

        const value = await getDemoLatestValue({ bucket, measurement, field });
        const numValue = parseFloat(value) || 0;

        const option = {
          title: {
            text: title,
            left: 'center',
            top: '5%',
            textStyle: { fontSize: 16, fontWeight: 'bold' }
          },
          series: [{
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min,
            max,
            splitNumber: 5,
            center: ['50%', '60%'],
            radius: '75%',
            itemStyle: { color: '#3b82f6' },
            progress: { show: true, width: 15 },
            pointer: { show: true, length: '60%', width: 6 },
            axisLine: { lineStyle: { width: 15 } },
            axisTick: {
              distance: -20,
              splitNumber: 5,
              lineStyle: { width: 2, color: '#999' }
            },
            splitLine: {
              distance: -25,
              length: 10,
              lineStyle: { width: 2, color: '#999' }
            },
            axisLabel: {
              distance: -15,
              color: '#666',
              fontSize: 12,
              formatter: (v) => v.toFixed(0)
            },
            detail: {
              valueAnimation: true,
              width: '60%',
              lineHeight: 30,
              borderRadius: 8,
              offsetCenter: [0, '80%'],
              fontSize: 24,
              fontWeight: 'bolder',
              formatter: `{value}${unit}`,
              color: '#3b82f6'
            },
            data: [{ value: numValue }]
          }]
        };

        if (chartInstance.current) {
          chartInstance.current.setOption(option, true);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [bucket, measurement, field, title, unit, min, max, refreshInterval]);

  if (error) return <div className="chart-error"><p>{error}</p></div>;

  return (
    <div className="gauge-wrapper" style={{ position: 'relative', width: '100%', height: '300px' }}>
      {loading && (
        <div className="chart-loading" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      )}
      {/* Asegúrate de que este div tenga dimensiones */}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}