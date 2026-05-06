import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';
import { useHistorico } from '../hooks/SensorContext';

/** Normaliza a array sin importar el tipo de entrada. */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

const SKIP_KEYS = new Set(['timestamp', 'time', '_time', '_start', '_stop', 'result', 'table']);

/** Lee el valor numérico de un punto; fallback al primer campo numérico. */
function extractNum(point, fieldName) {
  let raw = point[fieldName];
  if (raw === undefined || raw === null) {
    const entry = Object.entries(point).find(([k, v]) => !SKIP_KEYS.has(k) && !isNaN(parseFloat(v)));
    if (entry) raw = entry[1];
  }
  const v = parseFloat(raw);
  return isNaN(v) ? null : Math.round(v * 10) / 10;
}

/** Formatea timestamp para eje X. */
function fmtTime(ts) {
  return new Date(ts || 0).toLocaleString('es-PY', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * LineAreaHistorico
 *
 * Gráfico de línea histórico con áreas sombreadas condicionales.
 *
 * - La línea principal (fieldTemp) se muestra siempre sin relleno.
 * - Por cada campo booleano (areas[].field), se crea una serie de área
 *   separada que solo rellena los intervalos donde el valor >= 1.
 * - Si ningún campo está activo, no hay sombreado (área transparente).
 *
 * Modo simple (un área):
 *   fieldBool  = 'encendido'
 *   areaColor  = '#ef4444'
 *   areaLabel  = 'Encendido'
 *
 * Modo múltiple (varios áreas):
 *   areas = [
 *     { field: 'encendido',  color: '#ef4444', label: 'Encendido' },
 *     { field: 'automatico', color: '#06b6d4', label: 'Automático' },
 *   ]
 *
 * Props:
 *   deviceIds   string | string[]  Dispositivo a consultar
 *   fieldTemp   string             Campo numérico para la línea
 *   areas       object[]           Array de { field, color, label }
 *   fieldBool   string             Campo booleano — modo simple
 *   areaColor   string             Color — modo simple
 *   areaLabel   string             Etiqueta — modo simple
 *   label       string             Título del gráfico
 *   sensorLabel string             Nombre legible en tooltip
 *   unit        string             Unidad
 *   color       string             Color de la línea principal
 */
export default function LineAreaHistorico({
  deviceIds: deviceIdsProp = [],
  fieldTemp  = 'temperatura',
  // Múltiples áreas
  areas: areasProp,
  // Modo simple (compatibilidad)
  fieldBool  = 'activo',
  areaColor  = '#f59e0b',
  areaLabel  = 'Activo',
  // Estilo
  label       = 'Gráfico',
  sensorLabel,
  unit        = '°C',
  color       = '#06b6d4',
  window: timeWindow = '1h',  // renombrado para no pisar el global window
}) {
  const deviceIds = toArray(deviceIdsProp);
  const deviceId  = deviceIds[0];

  // Normalizar la definición de áreas
  const areaDefs = areasProp?.length
    ? areasProp
    : [{ field: fieldBool, color: areaColor, label: areaLabel }];

  // Todos los fields que hay que pedir al backend: línea + áreas
  const allFields = [fieldTemp, ...areaDefs.map(a => a.field)].filter(Boolean);

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
      fields: allFields,
      window: timeWindow,
      fn,
    });
    setQueried(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryCount]);

  const rawData = data?.[deviceId] || [];

  // Debug
  useEffect(() => {
    if (!queried) return;
    console.log(`[LineAreaHistorico] "${label}" deviceId="${deviceId}" fields:`, allFields);
    console.log(`[LineAreaHistorico] data keys:`, data ? Object.keys(data) : 'null');
    console.log(`[LineAreaHistorico] rawData (${rawData.length} pts):`, rawData.slice(0, 2));
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
  }, [deviceId]);

  // Actualizar cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current || !rawData.length) return;

    const xData = rawData.map(d => fmtTime(d.timestamp || d.time || d._time));
    const yData = rawData.map(d => extractNum(d, fieldTemp));

    const seriesName = sensorLabel || label;

    // ── Series de área por cada campo booleano ─────────────────────────────
    // Cada serie solo tiene valor donde el campo es >= 1, '-' (vacío) donde no.
    // Así el relleno aparece ÚNICAMENTE en los intervalos activos.
    const areaSeries = areaDefs.map(def => {
      const areaData = rawData.map((pt, i) => {
        const val = pt[def.field];
        const active = val === true || val === 1 || val === '1' || val === 'true' || parseFloat(val) >= 1;
        return active ? yData[i] : '-';
      });

      return {
        name:        def.label,
        type:        'line',
        data:        areaData,
        symbol:      'none',
        silent:      true,
        connectNulls: false,
        z:           1, // debajo de la línea principal
        lineStyle:   { width: 0, opacity: 0 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: def.color + 'AA' },
            { offset: 1, color: def.color + '22' },
          ]),
          origin: 'start',
        },
        itemStyle: { color: def.color },
      };
    });

    // Áreas que tienen al menos un punto activo → se muestran en leyenda
    const activeAreaDefs = areaDefs.filter(def =>
      rawData.some(pt => parseFloat(pt[def.field]) >= 1)
    );
    const legendNames = [seriesName, ...activeAreaDefs.map(a => a.label)];

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: label,
        left: 'center',
        textStyle: { color: '#f1f5f9', fontSize: 14, fontWeight: 600 },
      },
      legend: {
        data: legendNames,
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 14, itemHeight: 8,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: params => {
          // El primer params es el de la línea principal
          const p     = params.find(s => s.seriesName === seriesName) || params[0];
          const ptIdx = xData.indexOf(p.axisValueLabel || p.name);
          const pt    = ptIdx >= 0 ? rawData[ptIdx] : null;

          let html = `<span style="color:#64748b;font-size:11px">${p.name}</span><br/>` +
                     `<span style="color:#94a3b8;font-size:11px">${seriesName}</span>: ` +
                     `<b style="color:${color}">${p.value ?? '—'}${unit}</b>`;

            if (pt) {
             areaDefs.forEach(a => {
               const val = pt[a.field];
               const active = val === true || val === 1 || val === '1' || val === 'true' || parseFloat(val) >= 1;
               html += `<br/><span style="
                display:inline-flex;align-items:center;gap:4px;
                margin-top:3px;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700;
                background:${active ? a.color + '28' : 'rgba(100,116,139,0.1)'};
                color:${active ? a.color : '#64748b'}">
                ${active ? '●' : '○'} ${a.label}
              </span>`;
            });
          }
          return html;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: { rotate: 30, fontSize: 10, color: '#475569' },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value}${unit}`, color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLine: { show: false },
      },
      dataZoom: [{ type: 'inside', start: 0, end: 100 }],
      series: [
        // ── Línea principal — sin areaStyle (el relleno lo dan las series de área) ──
        {
          name:       seriesName,
          type:       'line',
          data:       yData,
          smooth:     true,
          symbol:     'circle',
          symbolSize: 4,
          showSymbol: rawData.length < 100,
          z:          2,
          lineStyle:  { color, width: 2.5, shadowColor: color + '44', shadowBlur: 8 },
          itemStyle:  { color, borderColor: '#0f172a', borderWidth: 2 },
          // Sin areaStyle: el fondo solo aparece desde las series booleanas
        },

        // ── Una serie de área por cada campo booleano ─────────────────────
        ...areaSeries,
      ],
    }, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, fieldTemp, label, sensorLabel, unit, color, JSON.stringify(areaDefs)]);

  // Overlay de estado
  const overlay = (() => {
    if (!queried)        return 'Presione "Consultar" para cargar datos';
    if (loading)         return `Cargando ${label}…`;
    if (error)           return `Error: ${error}`;
    if (!rawData.length) return 'Sin datos para el período seleccionado';
    return null;
  })();

  return (
    <div style={{ position: 'relative', width: '100%', height: 320 }}>
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
