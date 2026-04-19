import { useEffect, useRef, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import { useHistorico } from '../hooks/SensorContext';
import { WaitingPlaceholder } from './GaugeWidget';

const RANGE_MS = {
  '-1h':  3600000,   '-3h':  10800000,
  '-6h':  21600000,  '-24h': 86400000,
  '-7d': 604800000,
};

/**
 * LineChartWidget
 *
 * Modo consulta historica (sensor_id + timeRange):
 *   <LineChartWidget sensor_id="caaty/secadero/T1" timeRange="-24h" />
 *   → consulta api/consulta/{clientId} automaticamente
 *   → unidad automatica desde tags.unit
 *
 * Modo legacy (series como prop):
 *   <LineChartWidget series={[{timestamp, value}]} unit="°C" label="T1" />
 *
 * Props:
 *   sensor_id : string                 ← ID del sensor para consulta historica
 *   series    : [{ timestamp, value }]   ← override directo
 *   label     : string
 *   unit      : string
 *   timeRange : '-1h' | '-3h' | '-6h' | '-24h' | '-7d'
 *   color     : string
 *   showArea  : boolean
 *   window    : '1h' | '12h' | '1d'   ← ventana de agregacion
 *   fn        : 'mean' | 'last' | 'max' | 'min'  ← funcion de agregacion
 */
export default function LineChartWidget({
  sensor_id,
  series:    seriesProp,
  label = 'Gráfico',
  unit:  unitProp,
  timeRange = '-24h',
  color     = '#06b6d4',
  showArea  = true,
  window = '1h',
  fn = 'mean',
}) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);

  // Si hay sensor_id, usar useHistorico para obtener datos
  const { query, data, loading, error } = useHistorico();
  const [hasQueried, setHasQueried] = useState(false);

  // Trigger consulta cuando cambia sensor_id o timeRange
  useEffect(() => {
    if (!sensor_id || hasQueried) return;

    const now = new Date();
    const desde = new Date(now.getTime() - (RANGE_MS[timeRange] || RANGE_MS['-24h']));

    query({
      sensorIds: [sensor_id],
      desde: desde.toISOString(),
      hasta: now.toISOString(),
      fields: 'value',
      window: window,
      fn: fn,
    }).then(() => setHasQueried(true));
  }, [sensor_id, timeRange, window, fn, query, hasQueried]);

  // Fuente de datos: prop directa > historico query
  const rawSeries = seriesProp || (data?.[sensor_id] || []);
  const unit = unitProp || '';

  const hasData = rawSeries.length > 0;

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

  // Filtrar por ventana temporal
  const points = useMemo(() => {
    if (!timeRange || !RANGE_MS[timeRange]) return rawSeries;
    const cutoff = Date.now() - RANGE_MS[timeRange];
    return rawSeries.filter(p => new Date(p.timestamp).getTime() >= cutoff);
  }, [rawSeries, timeRange]);

  useEffect(() => {
    if (!chartInstance.current || points.length === 0) return;

    const xData = points.map(d =>
      new Date(d.timestamp).toLocaleString('es-PY', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    );
    const yData = points.map(d => {
      const v = parseFloat(d.value);
      return isNaN(v) ? null : v;
    });

    chartInstance.current.setOption({
      backgroundColor: 'transparent',
      title: {
        text: label, left: 'center',
        textStyle: { color: '#f1f5f9', fontSize: 14, fontWeight: 600 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 13 },
        axisPointer: { type: 'cross', lineStyle: { color: '#334155' } },
        formatter: params => {
          const p = params[0];
          return `<span style="color:#64748b;font-size:11px">${p.name}</span><br/>` +
                 `<b style="color:${color};font-size:15px">${p.value}${unit}</b>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category', data: xData, boundaryGap: false,
        axisLabel: { rotate: 30, fontSize: 10, color: '#475569' },
        axisLine:  { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value}${unit}`, color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLine:  { show: false },
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider', height: 20, bottom: 0,
          borderColor: '#1e293b', backgroundColor: '#0f172a',
          fillerColor: color + '33', handleStyle: { color },
          textStyle: { color: '#475569', fontSize: 10 },
        },
      ],
      series: [{
        data: yData, type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 4,
        showSymbol: points.length < 100,
        lineStyle: { color, width: 2.5, shadowColor: color + '44', shadowBlur: 8 },
        itemStyle: { color, borderColor: '#0f172a', borderWidth: 2 },
        connectNulls: false,
        areaStyle: showArea ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '05' },
          ]),
        } : undefined,
      }],
    }, true);
  }, [points, label, unit, color, showArea]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px' }}>
      {loading && (
        <WaitingPlaceholder text={`Cargando ${label}…`} />
      )}
      {error && (
        <WaitingPlaceholder text={`Error: ${error}`} />
      )}
      {!loading && !error && points.length === 0 && (
        <WaitingPlaceholder text={sensor_id ? `Sin datos para ${label}` : 'Sin datos'} />
      )}
      <div ref={chartRef}
        style={{ width: '100%', height: '100%', opacity: points.length > 0 ? 1 : 0, transition: 'opacity 0.4s' }} />
    </div>
  );
}