import { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import { useTopic } from '../hooks/MqttContext';

/**
 * LineChartWidget
 *
 * Config:
 *   topic          : "estacion/temperatura"
 *   title          : "Temperatura - Últimas 24h"
 *   unit           : "°C"
 *   timeRange      : '-24h' | '-7d' | '-30d' | '-90d'
 *   color          : "#3b82f6"   (opcional)
 *   showArea       : true        (opcional)
 */
export default function LineChartWidget({
  topic,
  title = 'Gráfico',
  unit = '',
  timeRange = '-24h',
  color = '#3b82f6',
  showArea = true,
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

  const filteredPoints = useMemo(() => {
    const rangeMs = {
      '-24h': 86400000,
      '-7d': 604800000,
      '-30d': 2592000000,
      '-90d': 7776000000,
    }[timeRange] || 604800000;

    const now = Date.now();
    const combined = [...(history || []), ...(series || [])].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );
    return combined.filter((d) => now - new Date(d.timestamp).getTime() <= rangeMs);
  }, [history, series, timeRange]);

  useEffect(() => {
    if (!chartInstance.current) return;

    const xData = filteredPoints.map((d) =>
      new Date(d.timestamp).toLocaleString('es-PY', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    );
    const yData = filteredPoints.map((d) => parseFloat(d.value) ?? 0);

    chartInstance.current.setOption({
      title: {
        text: title,
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#f1f5f9' },
        formatter: (params) => `${params[0].name}<br/><b>${params[0].value}${unit}</b>`,
      },
      grid: { left: '3%', right: '4%', bottom: '12%', top: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: { rotate: 30, fontSize: 10, color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: `{value}${unit}`, color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [{
        data: yData,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color, width: 2.5 },
        areaStyle: showArea ? {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '05' },
          ]),
        } : undefined,
      }],
    }, true);
  }, [filteredPoints, title, unit, color, showArea]);

  const isEmpty = filteredPoints.length === 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '280px' }}>
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)', gap: 10,
        }}>
          <div className="spinner" />
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Esperando datos...</p>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}