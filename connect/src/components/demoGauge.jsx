import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTopic } from '../hooks/MqttContext';

/**
 * GaugeWidget
 *
 * Config:
 *   topic    : "estacion/temperatura"
 *   title    : "Temperatura Actual"
 *   unit     : "°C"
 *   min      : -10
 *   max      : 50
 *   color    : "#3b82f6"   (opcional)
 */
export default function GaugeWidget({ topic, title = 'Gauge', unit = '', min = 0, max = 100, color = '#3b82f6' }) {
  const { current, status } = useTopic(topic);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;

    const value = parseFloat(current) || 0;

    chartInstance.current.setOption({
      title: {
        text: title,
        left: 'center',
        top: '5%',
        textStyle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
      },
      series: [{
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min, max,
        splitNumber: 5,
        center: ['50%', '60%'],
        radius: '78%',
        itemStyle: { color },
        progress: { show: true, width: 14 },
        pointer: { show: true, length: '58%', width: 5 },
        axisLine: { lineStyle: { width: 14, color: [[1, '#e2e8f0']] } },
        axisTick: { distance: -18, splitNumber: 5, lineStyle: { width: 2, color: '#94a3b8' } },
        splitLine: { distance: -22, length: 9, lineStyle: { width: 2, color: '#94a3b8' } },
        axisLabel: { distance: -14, color: '#64748b', fontSize: 11, formatter: (v) => v.toFixed(0) },
        detail: {
          valueAnimation: true,
          width: '60%',
          lineHeight: 30,
          borderRadius: 8,
          offsetCenter: [0, '80%'],
          fontSize: 26,
          fontWeight: 'bolder',
          formatter: `{value}${unit}`,
          color,
        },
        data: [{ value }],
      }],
    }, true);
  }, [current, title, unit, min, max, color]);

  const isLoading = current === null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '280px' }}>
      {isLoading && <WidgetLoader text={status === 'connected' ? 'Esperando datos...' : 'Conectando...'} />}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

function WidgetLoader({ text }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.85)', gap: 10,
    }}>
      <div className="spinner" />
      <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>{text}</p>
    </div>
  );
}