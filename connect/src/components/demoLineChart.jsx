'use client';

import { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { demoData } from '../influxDemoClient';

export default function DemoLineChart({ 
  bucket,
  measurement, 
  field, 
  timeRange = '-1h',
  title = 'Gráfico de Línea',
  unit = '',
  refreshInterval = 30000
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const resizeObserver = useRef(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    resizeObserver.current = new ResizeObserver(() => chartInstance.current?.resize());
    resizeObserver.current.observe(chartRef.current);
    return () => resizeObserver.current?.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!chartInstance.current) return;

      try {
        if (!chartInstance.current.getOption()) setLoading(true);

        const data = await demoData({ bucket, measurement, field, timeRange });

        if (!data || data.length === 0) {
          setError('No hay datos disponibles');
          setLoading(false);
          chartInstance.current.clear(); 
          return;
        }

        // Formateo de datos según tu estructura {time, value}
        const chartPoints = data.map(d => [new Date(d.time).getTime(), parseFloat(d.value)]);

        const option = {
          backgroundColor: 'transparent',
          
          title: {
            text: title,
            left: '10',
            top: '10',
            textStyle: { 
              color: '#ffffff', // Texto blanco para modo oscuro
              fontSize: 16,
              fontWeight: 600
            }
          },

          tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderColor: '#475569',
            borderWidth: 1,
            textStyle: { color: '#ffffff', fontSize: 13 },
            formatter: (params) => {
              const point = params[0];
              const date = new Date(point.value[0]);
              const dateStr = date.toLocaleString('es-PY', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              });
              return `
                <div style="padding: 5px;">
                  <strong>${dateStr}</strong><br/>
                  Valor: <strong>${point.value[1].toFixed(2)} ${unit}</strong>
                </div>
              `;
            }
          },

          grid: {
            left: '10%',
            right: '5%',
            bottom: '15%',
            top: '20%',
            containLabel: true
          },

          xAxis: {
            type: 'time', // Usamos tipo tiempo para mejor espaciado
            axisLabel: { 
              color: '#94a3b8', // Gris pizarra
              fontSize: 11,
              formatter: (value) => {
                const date = new Date(value);
                return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
              }
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { show: false }
          },

          yAxis: {
            type: 'value',
            name: unit,
            nameTextStyle: { color: '#94a3b8', fontSize: 12 },
            axisLabel: { 
              color: '#94a3b8', 
              fontSize: 11,
              formatter: (value) => value.toFixed(1)
            },
            axisLine: { lineStyle: { color: '#475569' } },
            splitLine: { 
              lineStyle: { color: '#334155', type: 'dashed' } 
            }
          },

          series: [{
            name: field,
            type: 'line',
            data: chartPoints,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { 
              color: '#06b6d4', // Cyan intenso
              width: 3 
            },
            itemStyle: { color: '#06b6d4' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
                { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
              ])
            },
            animationDuration: 1000
          }]
        };

        chartInstance.current.setOption(option, true);
        setError(null);
      } catch (err) {
        setError('Error al conectar con la base de datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [bucket, measurement, field, timeRange, title, unit, refreshInterval]);

  return (
    <div className="chart-wrapper" style={{ 
      position: 'relative', 
      width: '100%', 
      height: '350px', 
      background: '#1e293b', // Fondo oscuro tipo Slate-900
      borderRadius: '12px', 
      padding: '10px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
    }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px' }}>
          <p style={{ color: '#94a3b8' }}>Cargando...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(30, 41, 59, 0.9)', borderRadius: '12px' }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}
      
      <div 
        ref={chartRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          visibility: error ? 'hidden' : 'visible'
        }} 
      />
    </div>
  );
}