import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useTopic } from '../hooks/MqttContext';

/**
 * GaugeWidget — Tema oscuro
 *
 * Props del config:
 *   topic      : "horno/temperaturas"
 *   field      : "T1"           si el payload es objeto { T1: 145, T2: 98 }
 *                               omitir si el payload es escalar directo
 *   label      : "Temperatura Horno"
 *   unit       : "°C"
 *   min        : 0
 *   max        : 300
 *   thresholds : [{ value: 100, color: '#10b981' }, ...]
 */
export default function GaugeWidget({ topic, field, label = 'Gauge', unit = '', min = 0, max = 100, thresholds }) {
  const { current, getField, status } = useTopic(topic);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const rawValue = field ? getField(field) : current;
  const hasValue = rawValue !== null && rawValue !== undefined;

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    }
    const onResize = () => chartInstance.current && chartInstance.current.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (chartInstance.current) { chartInstance.current.dispose(); chartInstance.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !hasValue) return;
    const value = parseFloat(rawValue);

    const resolvedThresholds = thresholds || [
      { value: min + (max - min) * 0.33, color: '#10b981' },
      { value: min + (max - min) * 0.66, color: '#f59e0b' },
      { value: max, color: '#ef4444' },
    ];

    const axisColors = resolvedThresholds.map((t) => [(t.value - min) / (max - min), t.color]);
    const activeColor = resolvedThresholds.find((t) => value <= t.value)?.color || resolvedThresholds.at(-1).color;

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: label, left: 'center', top: '4%',
        textStyle: { color: '#f1f5f9', fontSize: 14, fontWeight: 600 },
      },
      series: [{
        type: 'gauge', min, max,
        startAngle: 210, endAngle: -30,
        center: ['50%', '58%'], radius: '76%',
        axisLine: { lineStyle: { width: 20, color: axisColors } },
        pointer: { length: '70%', width: 6, itemStyle: { color: activeColor, shadowColor: activeColor + '88', shadowBlur: 12 } },
        anchor: { show: true, showAbove: true, size: 16, itemStyle: { color: activeColor, borderWidth: 2, borderColor: '#1e293b', shadowBlur: 8, shadowColor: activeColor + '88' } },
        axisTick: { distance: -28, length: 6, lineStyle: { color: '#334155', width: 2 } },
        splitLine: { distance: -33, length: 12, lineStyle: { color: '#475569', width: 3 } },
        axisLabel: {
          distance: -46, color: '#64748b', fontSize: 11,
          formatter: (v) => {
            const mid = Math.round((min + max) / 2);
            return (v === min || v === max || v === mid) ? Math.round(v) : '';
          },
        },
        detail: {
          valueAnimation: true, offsetCenter: [0, '72%'],
          formatter: (v) => '{val|' + v.toFixed(1) + '}\n{unit|' + unit + '}',
          rich: {
            val: { fontSize: 36, fontWeight: 'bold', color: '#f1f5f9', lineHeight: 44 },
            unit: { fontSize: 14, color: '#94a3b8', padding: [6, 0, 0, 0] },
          },
        },
        title: { show: false },
        data: [{ value, name: '' }],
        animation: true, animationDuration: 800, animationEasing: 'elasticOut',
      }],
    }, true);
  }, [rawValue, label, unit, min, max, thresholds]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px' }}>
      {!hasValue && (
        <WaitingPlaceholder text={status === 'connected' ? 'Esperando ' + (field || topic) + '...' : 'Conectando...'} />
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%', opacity: hasValue ? 1 : 0, transition: 'opacity 0.4s' }} />
    </div>
  );
}

// Placeholder compartido — importado por LineChartWidget y otros
export function WaitingPlaceholder({ text = 'Esperando datos...' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15,23,42,0.75)', borderRadius: 12, gap: 12,
    }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#334155',
            animation: 'mqttPulse 1.2s ease-in-out ' + (i * 0.2) + 's infinite',
          }} />
        ))}
      </div>
      <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>{text}</p>
      <style>{`@keyframes mqttPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2);background:#06b6d4}}`}</style>
    </div>
  );
}