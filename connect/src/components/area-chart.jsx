import React from 'react';
import ReactECharts from 'echarts-for-react';

const AreaChart = ({ title="grafico de prueba", color= "#4e6cc5" }) => {
    const data = [
    ["2024-01-01", 10], ["2024-01-02", 22], ["2024-01-03", 28],
    ["2024-01-04", 43], ["2024-01-05", 45], ["2024-01-06", 50],
    ["2024-01-07", 32]
  ];
  const option = {
    title: {
      text: title,
      textStyle: { fontSize: 14, color: '#666' }
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%', right: '4%', bottom: '3%', containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: 'Valor',
        type: 'line',
        smooth: true, // Hace que la línea sea curva (estilo área moderna)
        areaStyle: {
          color: color,
          opacity: 0.3
        },
        itemStyle: {
          color: color
        },
        data: data
      }
    ]
  };

  return (
    <div className="chart-wrapper" style={{ padding: '20px', background: '#fff', borderRadius: '8px' }}>
      <ReactECharts option={option} style={{ height: '300px', width: '100%' }} />
    </div>
  );
};

export default AreaChart;