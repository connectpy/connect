import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';
import { WaitingPlaceholder } from './GaugeWidget';

/** Normaliza sensorIds a array independientemente del tipo recibido. */
function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

/**
 * LineChartHistorico
 * Gráfico de línea que usa el contexto de HistoricoProvider
 * 
 * Uso:
 * <LineChartHistorico sensorIds={['sensor1']} label="Temperatura" />
 */
export default function LineChartHistorico({
  sensorIds: sensorIdsProp = [],
  fields = 'value',
  label = 'Gráfico',
  sensorLabel,          // Nombre legible del sensor (opcional, para tooltip)
  unit = '°C',
  color = '#06b6d4',
  showArea = true,
}) {
  const sensorIds = toArray(sensorIdsProp);
  // Primer field pedido (puede ser string o array)
  const fieldName = Array.isArray(fields) ? fields[0] : (fields || 'value');

  const { data, loading, error, registerSensors, queried } = useHistoricoContext();

  // Registrar sensores al montar
  useEffect(() => {
    if (sensorIds.length) registerSensors(sensorIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sensorIds)]);

  const sensorId = sensorIds[0];
  const rawData = data?.[sensorId] || [];

  // Debug — ver qué llega del backend
  useEffect(() => {
    if (!queried) return;
    console.log(`[Historico] "${label}" sensorId="${sensorId}" field="${fieldName}"`);
    console.log(`[Historico] data keys:`, data ? Object.keys(data) : 'null');
    console.log(`[Historico] rawData (${rawData.length} pts):`, rawData.slice(0, 2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queried, data]);

  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  // Inicializar ECharts — el div SIEMPRE existe en el DOM
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

  // Actualizar serie cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current || !rawData.length) return;
    const { xData, yData } = formatChartData(rawData, fieldName);
    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: label,
        left: 'center',
        textStyle: { color: '#f1f5f9', fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        textStyle: { color: '#f1f5f9', fontSize: 13 },
        formatter: params => {
          const p = params[0];
          const seriesName = sensorLabel || label;
          return `<span style="color:#64748b;font-size:11px">${p.name}</span><br/>` +
                 `<span style="color:#94a3b8;font-size:11px">${seriesName}</span>: ` +
                 `<b style="color:${color};font-size:15px">${p.value}${unit}</b>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: '16%', containLabel: true },
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
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
      ],
      series: [{
        data: yData,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        showSymbol: rawData.length < 100,
        lineStyle: { color, width: 2.5, shadowColor: color + '44', shadowBlur: 8 },
        itemStyle: { color, borderColor: '#0f172a', borderWidth: 2 },
        areaStyle: showArea ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '05' },
          ]),
        } : undefined,
      }],
    }, true);
  }, [rawData, label, unit, color, showArea, fieldName]);

  // El overlay se muestra encima del div del chart (que siempre existe)
  const overlay = (() => {
    if (!queried)        return 'Presione "Consultar" para cargar datos';
    if (loading)         return `Cargando ${label}…`;
    if (error)           return `Error: ${error}`;
    if (!rawData.length) return 'Sin datos para el período seleccionado';
    return null;
  })();

  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }}>
      {/* El div del chart siempre está montado para que ECharts pueda init */}
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

/**
 * Extrae xData/yData de los puntos del backend.
 * Lee `fieldName` primero; si no existe, busca el primer campo numérico.
 */
function formatChartData(points, fieldName = 'value') {
  const SKIP = new Set(['timestamp', 'time', '_time', '_start', '_stop', 'result', 'table']);

  const xData = points.map(d => {
    const ts = d.timestamp || d.time || d._time;
    return new Date(ts).toLocaleString('es-PY', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  });

  const yData = points.map(d => {
    // 1. Campo pedido explícitamente
    let raw = d[fieldName];
    // 2. Fallback: primer campo numérico disponible
    if (raw === undefined || raw === null) {
      const entry = Object.entries(d).find(([k, v]) => !SKIP.has(k) && !isNaN(parseFloat(v)));
      if (entry) raw = entry[1];
    }
    const v = parseFloat(raw);
    return isNaN(v) ? null : Math.round(v * 10) / 10;
  });

  return { xData, yData };
}