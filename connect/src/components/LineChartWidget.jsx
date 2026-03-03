import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useTopic } from '../hooks/MqttContext';
import { WaitingPlaceholder } from './GaugeWidget';

const RANGE_MS = {
  '-1h':  3_600_000,
  '-3h':  10_800_000,
  '-6h':  21_600_000,
  '-24h': 86_400_000,
  '-7d':  604_800_000,
};

/**
 * LineChartWidget — Tema oscuro
 *
 * NO acumula datos. Muestra lo que Node-RED envía como array completo.
 * Cada vez que llega un nuevo array por WS, reemplaza el grafico.
 *
 * Modo tiempo real (pestaña principal):
 *   Node-RED envia el array de los ultimos N puntos cada vez que hay dato nuevo.
 *   timeRange filtra los puntos por ventana de tiempo.
 *
 * Modo historico (pestaña historico — usado por HistoricoContainer):
 *   Node-RED responde a la query con el array completo del rango pedido.
 *   timeRange = null para no filtrar, mostrar todo.
 *
 * Props del config:
 *   topic     : "horno/temperaturas"
 *   field     : "T1"       campo del payload objeto (omitir si escalar)
 *   label     : "Historico T1"
 *   unit      : "°C"
 *   timeRange : '-1h' | '-3h' | '-6h' | '-24h' | '-7d' | null
 *   color     : "#f59e0b"
 *   showArea  : true
 */
export default function LineChartWidget({
  topic,
  field,
  label = 'Grafico',
  unit = '',
  timeRange = '-24h',
  color = '#06b6d4',
  showArea = true,
}) {
  const { series, getFieldSeries } = useTopic(topic);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const onResize = () => chartInstance.current && chartInstance.current.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (chartInstance.current) { chartInstance.current.dispose(); chartInstance.current = null; }
    };
  }, []);

  // Fuente de datos: field series o serie escalar
  const rawPoints = useMemo(
    () => field ? getFieldSeries(field) : series,
    [field, series, getFieldSeries]
  );

  // Filtro de ventana de tiempo (null = mostrar todo)
  const points = useMemo(() => {
    if (!timeRange || !RANGE_MS[timeRange]) return rawPoints;
    const cutoff = Date.now() - RANGE_MS[timeRange];
    return rawPoints.filter((p) => new Date(p.timestamp).getTime() >= cutoff);
  }, [rawPoints, timeRange]);

  useEffect(() => {
    if (!chartInstance.current || points.length === 0) return;

    const xData = points.map((d) =>
      new Date(d.timestamp).toLocaleString('es-PY', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    );
    const yData = points.map((d) => {
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
        formatter: (params) => {
          const p = params[0];
          return '<span style="color:#64748b;font-size:11px">' + p.name + '</span><br/>'
            + '<b style="color:' + color + ';font-size:15px">' + p.value + unit + '</b>';
        },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '16%', containLabel: true },
      xAxis: {
        type: 'category', data: xData, boundaryGap: false,
        axisLabel: { rotate: 30, fontSize: 10, color: '#475569' },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}' + unit, color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLine: { show: false },
      },
      // Zoom por scroll y slider para series largas
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

  const hasData = points.length > 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px' }}>
      {!hasData && <WaitingPlaceholder text="Esperando datos del sensor..." />}
      <div
        ref={chartRef}
        style={{ width: '100%', height: '100%', opacity: hasData ? 1 : 0, transition: 'opacity 0.4s' }}
      />
    </div>
  );
}