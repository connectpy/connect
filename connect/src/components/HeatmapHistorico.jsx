import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';
import { WaitingPlaceholder } from './GaugeWidget';

/** Normaliza a array independientemente del tipo recibido. */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

const SKIP_KEYS = new Set(['timestamp', 'time', '_time', '_start', '_stop', 'result', 'table']);

/** Lee el valor numérico de un punto: campo pedido → primer numérico disponible */
function extractValue(point, fieldName) {
  let raw = point[fieldName];
  if (raw === undefined || raw === null) {
    const entry = Object.entries(point).find(([k, v]) => !SKIP_KEYS.has(k) && !isNaN(parseFloat(v)));
    if (entry) raw = entry[1];
  }
  const v = parseFloat(raw);
  return isNaN(v) ? null : Math.round(v * 10) / 10;
}

/** Formatea timestamp para eje X */
function fmtTime(ts) {
  return new Date(ts).toLocaleString('es-PY', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * HeatmapHistorico
 *
 * Heatmap histórico con:
 *   - Eje X: tiempo
 *   - Eje Y: sensores (cada sensorId es una fila)
 *   - Color: valor numérico
 *
 * Props (vienen de la config del widget):
 *   sensorIds  string | string[]   IDs de sensores (una fila por sensor)
 *   labels     string[]            Etiquetas para cada fila (mismo orden que sensorIds)
 *   fields     string | string[]   Campo a leer de cada punto
 *   label      string              Título del gráfico
 *   unit       string              Unidad (ej: '°C')
 *   min        number              Mínimo del rango de color
 *   max        number              Máximo del rango de color
 *   colorFrom  string              Color inicio del gradiente
 *   colorTo    string              Color fin del gradiente
 */
export default function HeatmapHistorico({
  sensorIds: sensorIdsProp = [],
  labels: labelsProp = [],
  fields = 'value',
  label = 'Heatmap',
  unit = '',
  min = 0,
  max = 100,
  colorFrom = '#0ea5e9',
  colorTo   = '#ef4444',
}) {
  const sensorIds = toArray(sensorIdsProp);
  const fieldName = Array.isArray(fields) ? fields[0] : (fields || 'value');

  // Etiquetas de fila: usa labelsProp si existe, sino "Sensor N" (nunca el ID interno)
  const rowLabels = sensorIds.map((id, i) => labelsProp[i] || `Sensor ${i + 1}`);

  const { data, loading, error, registerSensors, queried } = useHistoricoContext();

  // Registrar todos los sensores al montar
  useEffect(() => {
    if (sensorIds.length) registerSensors(sensorIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sensorIds)]);

  // Debug
  useEffect(() => {
    if (!queried) return;
    console.log(`[HeatmapHistorico] "${label}" sensorIds:`, sensorIds, 'field:', fieldName);
    console.log(`[HeatmapHistorico] data keys:`, data ? Object.keys(data) : 'null');
    sensorIds.forEach(id => {
      console.log(`  [${id}] ${data?.[id]?.length ?? 0} pts`, data?.[id]?.slice(0, 1));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queried, data]);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Init ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current?.dispose();
    chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sensorIds)]);

  // Actualizar chart cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current) return;

    // Recolectar todos los timestamps únicos (eje X)
    const tsSet = new Set();
    sensorIds.forEach(id => {
      (data?.[id] || []).forEach(pt => {
        const ts = pt.timestamp || pt.time || pt._time;
        if (ts) tsSet.add(ts);
      });
    });
    const timestamps = Array.from(tsSet).sort();
    if (!timestamps.length) return;

    const xLabels = timestamps.map(fmtTime);

    // Construir datos: [xIdx, yIdx, value]
    const heatData = [];
    sensorIds.forEach((id, yIdx) => {
      const points = data?.[id] || [];
      const ptMap = {};
      points.forEach(pt => {
        const ts = pt.timestamp || pt.time || pt._time;
        if (ts) ptMap[ts] = extractValue(pt, fieldName);
      });
      timestamps.forEach((ts, xIdx) => {
        const v = ptMap[ts] ?? null;
        heatData.push([xIdx, yIdx, v]);
      });
    });

    const chartHeight = Math.max(200, sensorIds.length * 50 + 80);
    if (chartRef.current) chartRef.current.style.height = `${chartHeight}px`;
    chartInstance.current.resize();

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: label,
        left: 'center',
        textStyle: { color: '#f1f5f9', fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: params => {
          const val = params.data[2];
          return `<span style="color:#64748b;font-size:11px">${xLabels[params.data[0]]}</span><br/>` +
                 `<b style="color:#f1f5f9">${rowLabels[params.data[1]]}</b>: ` +
                 `<b style="color:${colorTo}">${val !== null ? val + unit : 'N/D'}</b>`;
        },
      },
      grid: { left: '5%', right: '8%', bottom: '10%', top: '14%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xLabels,
        splitArea: { show: true },
        axisLabel: { rotate: 30, fontSize: 9, color: '#475569' },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: rowLabels,
        splitArea: { show: true },
        axisLabel: { fontSize: 11, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: [colorFrom, colorTo] },
        textStyle: { color: '#94a3b8', fontSize: 10 },
        formatter: v => `${v}${unit}`,
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: 0, start: 0, end: 100 },
      ],
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: sensorIds.length <= 5 && timestamps.length <= 48,
          formatter: p => p.data[2] !== null ? String(p.data[2]) : '',
          fontSize: 9,
          color: '#fff',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      }],
    }, true);
  }, [data, sensorIds, rowLabels, fieldName, label, unit, min, max, colorFrom, colorTo]);

  // Overlay de estado sobre el chart (el div siempre existe)
  const overlay = (() => {
    if (!queried)        return 'Presione "Consultar" para cargar datos';
    if (loading)         return `Cargando ${label}…`;
    if (error)           return `Error: ${error}`;
    const hasData = sensorIds.some(id => (data?.[id]?.length ?? 0) > 0);
    if (!hasData)        return 'Sin datos para el período seleccionado';
    return null;
  })();

  const chartH = Math.max(200, sensorIds.length * 50 + 80);

  return (
    <div style={{ position: 'relative', width: '100%', height: chartH }}>
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
      {overlay && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15,23,42,0.85)', borderRadius: 8,
          color: '#475569', fontSize: 13, pointerEvents: 'none',
        }}>
          {overlay}
        </div>
      )}
    </div>
  );
}
