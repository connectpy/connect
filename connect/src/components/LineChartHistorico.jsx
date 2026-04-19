import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useHistoricoContext } from './HistoricoContainer';
import { WaitingPlaceholder } from './GaugeWidget';

/**
 * LineChartHistorico
 * Gráfico de línea que usa el contexto de HistoricoProvider
 * 
 * Uso:
 * <LineChartHistorico sensorIds={['sensor1']} label="Temperatura" />
 */
export default function LineChartHistorico({
  sensorIds = [],
  fields = 'value',
  label = 'Gráfico',
  unit = '°C',
  color = '#06b6d4',
  showArea = true,
}) {
  const { data, loading, error, handleQuery, registerSensors, queried, setQueried } = useHistoricoContext();
  
  // Registrar sensores al montar
  useEffect(() => {
    if (sensorIds.length) {
      registerSensors(sensorIds);
    }
  }, [sensorIds, registerSensors]);

  // Obtener datos del primer sensor
  const sensorId = sensorIds[0];
  const rawData = data?.[sensorId] || [];
  
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current || !rawData.length || !queried) return;

    const { xData, yData } = formatChartData(rawData);

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
          return `<span style="color:#64748b;font-size:11px">${p.name}</span><br/>` +
                 `<b style="color:${color};font-size:15px">${p.value}${unit}</b>`;
        },
      },
      grid: { left: '3%', right: '4%', bottom: '18%', top: '16%', containLabel: true },
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
        {
          type: 'slider',
          height: 20,
          bottom: 0,
          borderColor: '#1e293b',
          backgroundColor: '#0f172a',
          fillerColor: color + '33',
          handleStyle: { color },
          textStyle: { color: '#475569', fontSize: 10 },
        },
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
  }, [rawData, label, unit, color, showArea, queried]);

  // Mostrar estados
  if (!queried) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#475569', fontSize: 12 }}>
          Presione "Consultar" para cargar datos
        </p>
      </div>
    );
  }

  if (loading) {
    return <WaitingPlaceholder text={`Cargando ${label}…`} />;
  }

  if (error) {
    return <WaitingPlaceholder text={`Error: ${error}`} />;
  }

  if (!rawData.length) {
    return <WaitingPlaceholder text="Sin datos" />;
  }

  return (
    <div ref={chartRef} style={{ width: '100%', height: 300 }} />
  );
}

function formatChartData(points) {
  const xData = points.map(d =>
    new Date(d.timestamp).toLocaleString('es-PY', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
  
  const yData = points.map(d => {
    const v = parseFloat(d.value);
    return isNaN(v) ? null : v;
  });

  return { xData, yData };
}