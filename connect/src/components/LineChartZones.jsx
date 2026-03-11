import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/**
 * LineChartZones
 * Línea con zonas de color marcadas según un field booleano.
 * Ej: temperatura con zonas rojas donde el quemador está activo.
 *
 * Props:
 *   data      : [{ timestamp, <fieldValue>, <fieldBool> }]
 *   fieldValue: string  ← nombre del field numérico (ej: 'temp')
 *   fieldBool : string  ← nombre del field booleano (ej: 'quemador_on')
 *   label     : string
 *   unit      : string
 *   color     : string  ← color de la línea
 *   zoneColor : string  ← color de las zonas activas
 *   zoneLabel : string  ← etiqueta para el tooltip de las zonas
 */
export default function LineChartZones({
  data = [],
  fieldValue = 'value',
  fieldBool  = 'active',
  label      = '',
  unit       = '',
  color      = '#f59e0b',
  zoneColor  = 'rgba(239,68,68,0.15)',
  zoneLabel  = 'Activo',
}) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !data || data.length === 0) return;

    const times  = data.map(d => new Date(d.timestamp).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }));
    const values = data.map(d => d[fieldValue] ?? null);
    const bools  = data.map(d => {
      const v = d[fieldBool];
      return v === true || v === 1 || v === 'true' || v === 'ON';
    });

    // Calcular markAreas — rangos continuos donde bool es true
    const markAreaData = [];
    let zoneStart = null;
    bools.forEach((active, i) => {
      if (active && zoneStart === null) {
        zoneStart = i;
      } else if (!active && zoneStart !== null) {
        markAreaData.push([
          { xAxis: times[zoneStart] },
          { xAxis: times[i - 1]    },
        ]);
        zoneStart = null;
      }
    });
    // Cerrar zona si termina activa
    if (zoneStart !== null) {
      markAreaData.push([
        { xAxis: times[zoneStart] },
        { xAxis: times[times.length - 1] },
      ]);
    }

    const colorRgb = color.startsWith('#') ? hexToRgb(color) : '245,158,11';

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: (params) => {
          const p    = params[0];
          const bool = bools[p.dataIndex];
          return `<span style="color:rgba(255,255,255,0.5)">${p.name}</span><br/>
                  <b style="color:${color};font-size:16px">${p.value !== null ? Number(p.value).toFixed(2) : '--'}</b>
                  <span style="color:rgba(255,255,255,0.4)"> ${unit}</span><br/>
                  <span style="color:${bool ? '#ef4444' : 'rgba(255,255,255,0.3)'}">
                    ${bool ? '● ' + zoneLabel : '○ Inactivo'}
                  </span>`;
        },
      },
      grid: { top: 20, bottom: 30, left: 50, right: 20, containLabel: false },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, interval: Math.floor(times.length / 6) },
        axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, formatter: v => v + unit },
        axisLine:  { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      },
      series: [{
        name:  label,
        type:  'line',
        data:  values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `rgba(${colorRgb},0.2)` },
            { offset: 1, color: `rgba(${colorRgb},0.02)` },
          ]),
        },
        markArea: {
          silent: false,
          label: { show: false },
          emphasis: {
            label: {
              show: true, position: 'insideTop',
              color: 'rgba(255,255,255,0.6)', fontSize: 10,
              formatter: zoneLabel,
            },
          },
          itemStyle: { color: zoneColor },
          data: markAreaData,
        },
      }],
    }, true);

  }, [data, fieldValue, fieldBool, color, zoneColor, label, unit, zoneLabel]);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Sin datos</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Leyenda de zonas */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 10, background: zoneColor, border: '1px solid rgba(239,68,68,0.3)', borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{zoneLabel}</span>
        </div>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}