import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';

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
 * Calcula los intervalos [xLabel_inicio, xLabel_fin] donde el campo booleano es verdadero (>= 1).
 * Devuelve el array de pairs para markArea.
 */
function calcMarkAreas(points, fieldBool, xLabels) {
  const areas = [];
  let start = null;
  points.forEach((pt, i) => {
    const active = parseFloat(pt[fieldBool]) >= 1;
    if (active && start === null) start = i;
    if (!active && start !== null) {
      areas.push([{ xAxis: xLabels[start] }, { xAxis: xLabels[i - 1] }]);
      start = null;
    }
  });
  if (start !== null) {
    areas.push([{ xAxis: xLabels[start] }, { xAxis: xLabels[points.length - 1] }]);
  }
  return areas;
}/**
 * LineAreaHistorico
 *
 * Gráfico de línea histórico con una o varias áreas sombreadas condicionales.
 *
 * Modo simple (un solo área):
 *   fieldBool  = 'fan'
 *   areaColor  = '#f59e0b'
 *   areaLabel  = 'Ventilador activo'
 *
 * Modo múltiple (varios áreas):
 *   areas = [
 *     { field: 'fan',      color: '#f59e0b', label: 'Ventilador activo' },
 *     { field: 'hayGrano', color: '#10b981', label: 'Hay grano' },
 *   ]
 *
 * Si se proveen ambos, `areas` tiene prioridad.
 *
 * Props desde config JSON:
 *   sensorIds   string | string[]  Sensor a consultar
 *   fieldTemp   string             Campo numérico para la línea
 *   areas       object[]           Array de { field, color, label } — múltiples áreas
 *   fieldBool   string             Campo booleano — modo simple (un área)
 *   areaColor   string             Color — modo simple
 *   areaLabel   string             Etiqueta — modo simple
 *   label       string             Título del gráfico
 *   sensorLabel string             Nombre legible en tooltip
 *   unit        string             Unidad
 *   color       string             Color de la línea
 */
export default function LineAreaHistorico({
  sensorIds: sensorIdsProp = [],
  fieldTemp  = 'temperatura',
  // Múltiples áreas
  areas: areasProp,
  // Modo simple (compatibilidad)
  fieldBool  = 'activo',
  areaColor  = '#f59e0b',
  areaLabel  = 'Activo',
  // Estilo de la línea
  label       = 'Gráfico',
  sensorLabel,
  unit        = '°C',
  color       = '#06b6d4',
}) {
  const sensorIds = toArray(sensorIdsProp);
  const sensorId  = sensorIds[0];

  // Normalizar la definición de áreas:
  // si viene `areas`, la usamos; si no, construimos una desde las props simples
  const areaDefs = areasProp?.length
    ? areasProp
    : [{ field: fieldBool, color: areaColor, label: areaLabel }];

  const { data, loading, error, registerSensors, registerFields, queried } = useHistoricoContext();

  // Registrar sensor y TODOS los fields necesarios
  useEffect(() => {
    if (sensorIds.length) registerSensors(sensorIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sensorIds)]);

  useEffect(() => {
    const allFields = [fieldTemp, ...areaDefs.map(a => a.field)].filter(Boolean);
    registerFields(allFields);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldTemp, JSON.stringify(areaDefs)]);

  const rawData = data?.[sensorId] || [];

  // Debug
  useEffect(() => {
    if (!queried) return;
    console.log(`[LineAreaHistorico] "${label}" sensorId="${sensorId}"`);
    console.log(`[LineAreaHistorico] data keys:`, data ? Object.keys(data) : 'null');
    console.log(`[LineAreaHistorico] rawData (${rawData.length} pts):`, rawData.slice(0, 2));
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
  }, [sensorId]);

  // Actualizar cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current || !rawData.length) return;

    const xData = rawData.map(d => fmtTime(d.timestamp || d.time || d._time));
    const yData = rawData.map(d => extractNum(d, fieldTemp));

    const seriesName = sensorLabel || label;

    // Calcular intervalos activos para cada área
    const computedAreas = areaDefs.map(def => ({
      ...def,
      intervals: calcMarkAreas(rawData, def.field, xData),
    }));

    // Series de la línea principal + una serie fantasma por área (para leyenda)
    const legendNames = [seriesName, ...computedAreas.filter(a => a.intervals.length > 0).map(a => a.label)];

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
        itemWidth: 14, itemHeight: 10,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: params => {
          const p = params[0];
          const ptIdx = xData.indexOf(p.name);
          const pt = ptIdx >= 0 ? rawData[ptIdx] : null;

          let html = `<span style="color:#64748b;font-size:11px">${p.name}</span><br/>` +
                     `<span style="color:#94a3b8;font-size:11px">${seriesName}</span>: ` +
                     `<b style="color:${color}">${p.value}${unit}</b>`;

          if (pt) {
            computedAreas.forEach(a => {
              const active = parseFloat(pt[a.field]) >= 1;
              if (active) {
                html += `<br/><span style="color:${a.color};font-size:11px">● ${a.label}</span>`;
              }
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
        // ── Línea principal ──────────────────────────────────────────────
        {
          name: seriesName,
          type: 'line',
          data: yData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: rawData.length < 100,
          lineStyle: { color, width: 2.5, shadowColor: color + '44', shadowBlur: 8 },
          itemStyle: { color, borderColor: '#0f172a', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: color + '33' },
              { offset: 1, color: color + '03' },
            ]),
          },
          // Todas las zonas sombreadas van en markArea de la misma serie
          // ECharts no admite múltiples estilos por markArea en una sola serie,
          // por eso cada área tiene su propia serie fantasma con su markArea.
        },

        // ── Serie fantasma por cada área (markArea + entrada en leyenda) ─
        ...computedAreas.map(a => ({
          name: a.label,
          type: 'line',
          data: [],
          lineStyle: { color: a.color, type: 'dashed', width: 1.5 },
          itemStyle: { color: a.color },
          areaStyle: { color: a.color + '28' },
          symbol: 'none',
          silent: true,
          markArea: {
            silent: true,
            label: { show: false },
            itemStyle: {
              color: a.color + '28',
              borderColor: a.color + '66',
              borderWidth: 1,
              borderType: 'dashed',
            },
            data: a.intervals,
          },
        })),
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
