import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';
import { useHistorico } from '../hooks/SensorContext';

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
 * Lanza su propia query al backend cuando el usuario presiona Consultar
 * (reaccionando al queryCount del HistoricoProvider).
 *
 * Modos:
 *   - N devices × 1 field  → deviceIds: ["d1","d2"], fields: "value"
 *   - 1 device  × N fields → deviceIds: ["secadero"], fields: ["T1","T2",...,"T12"]
 */
export default function HeatmapHistorico({
  deviceIds: deviceIdsProp = [],
  labels: labelsProp = [],
  fields = 'value',
  label = 'Heatmap',
  unit = '',
  min = 0,
  max = 100,
  colorFrom   = '#06b6d4',
  colorMiddle = '#f59e0b',
  colorTo     = '#ef4444',
  window: timeWindow = '1h',  // renombrado para no pisar el global window
}) {
  const deviceIds = toArray(deviceIdsProp);

  // Normalizar fields siempre a array
  const fieldsArray = (Array.isArray(fields) ? fields : toArray(fields)).filter(Boolean);
  if (!fieldsArray.length) fieldsArray.push('value');
  const fieldName = fieldsArray[0]; // campo para modo normal (N devices × 1 field)

  // Modo multi-field: 1 device + N fields → cada field es una fila del heatmap
  const isMultiFieldMode = fieldsArray.length > 1 && deviceIds.length === 1;

  // Etiquetas de fila según modo
  const rowLabels = isMultiFieldMode
    ? fieldsArray.map((f, i) => labelsProp[i] || f)
    : deviceIds.map((id, i) => labelsProp[i] || `Dispositivo ${i + 1}`);

  // ── Estado y query propia ──────────────────────────────────────────────────
  const { from, to, fn, queryCount } = useHistoricoContext();
  const { query, data, loading, error } = useHistorico();
  const [queried, setQueried] = useState(false);

  // Lanzar query propia cuando el usuario presiona Consultar
  useEffect(() => {
    if (queryCount === 0 || !deviceIds.length) return;
    query({
      deviceIds,
      desde:  `${from}T00:00:00Z`,
      hasta:  `${to}T23:59:59Z`,
      fields: fieldsArray,
      window: timeWindow,
      fn,
    });
    setQueried(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryCount]);

  // Debug
  useEffect(() => {
    if (!queried) return;
    console.log(`[HeatmapHistorico] "${label}" mode=${isMultiFieldMode ? 'multi-field' : 'multi-device'}`);
    console.log(`[HeatmapHistorico] deviceIds:`, deviceIds, 'fields:', fieldsArray);
    console.log(`[HeatmapHistorico] data keys:`, data ? Object.keys(data) : 'null');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queried, data]);

  const chartRef      = useRef(null);
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
  }, [JSON.stringify(deviceIds)]);

  // Actualizar chart cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current) return;

    // ── Recolectar timestamps y construir heatData según el modo ──────────────
    let timestamps, heatData;

    if (isMultiFieldMode) {
      // Modo: 1 device × N fields → rows = fields, cols = timestamps
      // Backend: { deviceId: [{ timestamp, T1, T2, ..., T12 }] }
      const deviceId = deviceIds[0];
      const points   = data?.[deviceId] || [];

      const tsSet = new Set();
      points.forEach(pt => {
        const ts = pt.timestamp || pt.time || pt._time;
        if (ts) tsSet.add(ts);
      });
      timestamps = Array.from(tsSet).sort();
      if (!timestamps.length) return;

      // Mapa timestamp → punto completo (acceso a cualquier field)
      const ptMap = {};
      points.forEach(pt => {
        const ts = pt.timestamp || pt.time || pt._time;
        if (ts) ptMap[ts] = pt;
      });

      heatData = [];
      fieldsArray.forEach((fld, yIdx) => {
        timestamps.forEach((ts, xIdx) => {
          const pt = ptMap[ts];
          const v  = pt ? extractValue(pt, fld) : null;
          heatData.push([xIdx, yIdx, v]);
        });
      });
    } else {
      // Modo original: N devices × 1 field → rows = deviceIds, cols = timestamps
      const tsSet = new Set();
      deviceIds.forEach(id => {
        (data?.[id] || []).forEach(pt => {
          const ts = pt.timestamp || pt.time || pt._time;
          if (ts) tsSet.add(ts);
        });
      });
      timestamps = Array.from(tsSet).sort();
      if (!timestamps.length) return;

      heatData = [];
      deviceIds.forEach((id, yIdx) => {
        const points = data?.[id] || [];
        const ptMap  = {};
        points.forEach(pt => {
          const ts = pt.timestamp || pt.time || pt._time;
          if (ts) ptMap[ts] = extractValue(pt, fieldName);
        });
        timestamps.forEach((ts, xIdx) => {
          const v = ptMap[ts] ?? null;
          heatData.push([xIdx, yIdx, v]);
        });
      });
    }

    // xLabels siempre después del if/else, cuando timestamps ya está definido
    const xLabels = timestamps.map(fmtTime);

    const rowCount    = isMultiFieldMode ? fieldsArray.length : deviceIds.length;
    const chartHeight = Math.max(200, rowCount * 50 + 80);
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
        inRange: { color: [colorFrom, colorMiddle, colorTo] },
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
          show: rowLabels.length <= 20 && timestamps.length <= 100,
          formatter: p => p.data[2] !== null ? String(p.data[2]) : '',
          fontSize: 9,
          color: '#fff',
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      }],
    }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, JSON.stringify(deviceIds), JSON.stringify(fieldsArray), isMultiFieldMode, JSON.stringify(rowLabels), label, unit, min, max, colorFrom, colorTo]);

  // Overlay de estado
  const overlay = (() => {
    if (!queried)  return 'Presione "Consultar" para cargar datos';
    if (loading)   return `Cargando ${label}…`;
    if (error)     return `Error: ${error}`;
    const hasData = isMultiFieldMode
      ? (data?.[deviceIds[0]]?.length ?? 0) > 0
      : deviceIds.some(id => (data?.[id]?.length ?? 0) > 0);
    if (!hasData)  return 'Sin datos para el período seleccionado';
    return null;
  })();

  const rowCount = isMultiFieldMode ? fieldsArray.length : deviceIds.length;
  const chartH   = Math.max(200, rowCount * 50 + 80);

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
