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
  refreshInterval = 30000
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const resizeObserver = useRef(null);

  // 1. Inicializar el gráfico (Corregido)
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      // Inicializar directamente si el DOM existe
      chartInstance.current = echarts.init(chartRef.current);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 2. Manejar resize con ResizeObserver (Optimizado)
  useEffect(() => {
    if (!chartRef.current) return;

    resizeObserver.current = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.current.observe(chartRef.current);

    return () => {
      resizeObserver.current?.disconnect();
    };
  }, []);

  // 3. Fetch data (Corregido)
  useEffect(() => {
    async function fetchData() {
      try {
        // Si por alguna razón la instancia no está lista, salimos (el intervalo reintentará)
        if (!chartInstance.current) return;

        // No mostramos loading en cada refresh para evitar parpadeos, solo al inicio o si hay error previo
        if (error || !chartInstance.current.getOption()) {
           setLoading(true);
        }
        
        const data = await demoData({
          bucket: process.env.NEXT_PUBLIC_INFLUX_BUCKET,
          measurement,
          field,
          deviceId,
          timeRange,
          aggregateWindow
        });

        if (!data || data.length === 0) {
          setError('No hay datos disponibles para el rango seleccionado');
          setLoading(false);
          return;
        }

        // Formatear datos
        const times = data.map(d => new Date(d._time).toLocaleTimeString('es-PY', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        }));
        const values = data.map(d => parseFloat(d._value).toFixed(2));

        const option = {
          title: {
            text: title,
            left: 'center',
            textStyle: { fontSize: 14, fontWeight: 'normal' }
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
            axisLabel: { rotate: 45, fontSize: 10 }
          },
          yAxis: {
            type: 'value',
            name: unit,
            axisLabel: { formatter: `{value}${unit}`, fontSize: 11 }
          },
          series: [{
            name: field || measurement,
            type: 'line',
            data: values,
            smooth: true,
            itemStyle: { color: '#3b82f6' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
              ])
            }
          }],
          grid: { left: '60px', right: '20px', bottom: '60px', top: '50px' }
        };

        chartInstance.current.setOption(option, true);
        setError(null); // Limpiar error si la carga es exitosa
      } catch (err) {
        setError(err.message);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [measurement, field, deviceId, timeRange, title, unit, aggregateWindow, refreshInterval, error]);

  // Renderizado
  return (
    <div className="chart-wrapper" style={{ position: 'relative', width: '100%', height: '350px' }}>
      {loading && (
        <div className="chart-loading" style={{ position: 'absolute', zIndex: 10, background: 'rgba(255,255,255,0.7)', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      )}
      
      {error ? (
        <div className="chart-error" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>{error}</p>
        </div>
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  );
}