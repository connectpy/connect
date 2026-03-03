import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useTopic } from '../hooks/MqttContext';

/**
 * HeatmapWidget
 * Muestra la distribución de valores a lo largo del tiempo (hora del día vs día).
 *
 * Config:
 *   topic    : "estacion/temperatura"
 *   title    : "Mapa de calor - Temperatura"
 *   unit     : "°C"
 *   colorMin : "#bfdbfe"    (color para valores bajos)
 *   colorMax : "#1d4ed8"    (color para valores altos)
 */
export default function HeatmapWidget({
  topic,
  title = 'Mapa de calor',
  unit = '',
  colorMin = '#bfdbfe',
  colorMax = '#1d4ed8',
}) {
  const { history, series } = useTopic(topic);
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

  // Agrupar puntos por [día, hora] y calcular promedio
  const { heatData, days, hours, minVal, maxVal } = useMemo(() => {
    const combined = [...(history || []), ...(series || [])];
    if (!combined.length) return { heatData: [], days: [], hours: [], minVal: 0, maxVal: 100 };

    // Construir mapa día → hora → [valores]
    const map = {};
    combined.forEach(({ timestamp, value }) => {
      const d = new Date(timestamp);
      const day = d.toLocaleDateString('es-PY', { month: '2-digit', day: '2-digit' });
      const hour = d.getHours();
      if (!map[day]) map[day] = {};
      if (!map[day][hour]) map[day][hour] = [];
      map[day][hour].push(parseFloat(value));
    });

    const days = Object.keys(map).slice(-14); // máximo 14 días
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const heatData = [];
    let minVal = Infinity, maxVal = -Infinity;

    days.forEach((day, di) => {
      for (let h = 0; h < 24; h++) {
        const vals = map[day]?.[h];
        if (vals && vals.length) {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          heatData.push([di, h, +avg.toFixed(2)]);
          if (avg < minVal) minVal = avg;
          if (avg > maxVal) maxVal = avg;
        }
      }
    });

    if (minVal === Infinity) { minVal = 0; maxVal = 100; }

    return { heatData, days, hours, minVal, maxVal };
  }, [history, series]);

  useEffect(() => {
    if (!chartInstance.current) return;

    chartInstance.current.setOption({
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
      },
      tooltip: {
        position: 'top',
        formatter: (p) => {
          const day = days[p.data[0]] || '';
          const hour = hours[p.data[1]] || '';
          return `${day} ${hour}<br/><b>${p.data[2]}${unit}</b>`;
        },
      },
      grid: { top: '18%', bottom: '18%', left: '12%', right: '6%' },
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: { color: '#94a3b8', fontSize: 10, rotate: 30 },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitArea: { show: true },
      },
      visualMap: {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '2%',
        inRange: { color: [colorMin, colorMax] },
        text: [unit ? `Máx ${maxVal.toFixed(1)}${unit}` : 'Máx', unit ? `Mín ${minVal.toFixed(1)}${unit}` : 'Mín'],
        textStyle: { color: '#64748b', fontSize: 11 },
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
      }],
    }, true);
  }, [heatData, days, hours, minVal, maxVal, title, unit, colorMin, colorMax]);

  const isEmpty = heatData.length === 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '340px' }}>
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)', gap: 10,
        }}>
          <div className="spinner" />
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Acumulando datos...</p>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}