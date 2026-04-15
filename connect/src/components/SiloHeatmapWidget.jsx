import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { WaitingPlaceholder } from './GaugeWidget';

/**
 * SiloHeatmapWidget
 * Heatmap de termometría de silo con cabos y días.
 *
 * Node-RED envia (topic: "silo1/heatmap"):
 * {
 *   topic: "silo1/heatmap",
 *   payload: {
 *     labels:    ["Cabo 1", "Cabo 2", "Cabo 3"],       // nombres de columnas (cabos)
 *     days:      ["1", "2", "3", "4", "5", "6", "7"],  // filas (profundidad/días)
 *     data:      [[0,0,24.5], [1,0,26.1], ...],         // [col, row, valor]
 *     showColor: [[true, false, true], ...],            // matriz booleana [col][row]
 *     temp_max:  35,
 *     temp_min:  15
 *   }
 * }
 *
 * Config en JSON:
 * {
 *   id: "silo1-heatmap",
 *   tipo: "SiloHeatmap",
 *   topic: "silo1/heatmap",
 *   label: "Termometría — Silo 1"
 * }
 */
/**
 * SiloHeatmapWidget
 * Recibe todos los valores como prop "data" desde WidgetRendererMulti (SensorContext).
 *
 * Props:
 *   data.labels    : string[]         nombres de cabos (columnas)
 *   data.days      : string[]         niveles / filas
 *   data.data      : [col, row, val][]
 *   data.showColor : boolean[][]      [col][row] — true=grano/color, false=gris
 *   data.temp_max  : number
 *   data.temp_min  : number
 *   label          : string
 */
export default function SiloHeatmapWidget({ data: dataProp = {}, label = 'Termometría' }) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);

  const labels    = dataProp.labels    ?? [];
  const days      = dataProp.days      ?? [];
  const data      = dataProp.data      ?? [];
  const showColor = dataProp.showColor ?? [];
  const tempMax   = dataProp.temp_max  ?? 40;
  const tempMin   = dataProp.temp_min  ?? 15;
  const status    = data.length > 0 ? 'connected' : 'connecting';

  const hasData = Array.isArray(data) && data.length > 0;

  // Inicializar ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    chartInstance.current = echarts.init(chartRef.current, null, { renderer: 'canvas' });
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Actualizar cuando llegan datos
  useEffect(() => {
    if (!chartInstance.current || !hasData) return;

    // Transformar data aplicando showColor — mismo algoritmo que el template Vue
    const modifiedData = data.map((item) => {
      const [col, row, value] = Array.isArray(item) ? item : [item[0], item[1], item[2]];

      // Verificar flag en la matriz showColor
      const flagRow  = Array.isArray(showColor) && showColor[col];
      const flagValue = Array.isArray(flagRow) ? flagRow[row] : (showColor?.[col]?.[row] ?? true);

      if (!flagValue) {
        // Flag false → celda gris, sin participar en visualMap
        return {
          value: [col, row, value],
          itemStyle: { color: 'rgba(255,255,255,0.06)' },
          label: { color: 'rgba(255,255,255,0.2)' },
        };
      }
      // Flag true → dejar que visualMap maneje el color
      return [col, row, value];
    });

    chartInstance.current.setOption({
      backgroundColor: 'transparent',

      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        textStyle: { color: '#f1f5f9', fontSize: 12 },
        formatter: (params) => {
          const val = Array.isArray(params.value) ? params.value[2] : params.data?.value?.[2];
          const caboLabel = Array.isArray(labels) ? (labels[params.value[0]] ?? params.value[0]) : params.value[0];
          const sensorNum = (params.value[1] ?? 0) + 1;
          return `<b style="color:#00aae4">${caboLabel}</b> — Sensor ${sensorNum}<br/>
                  <b style="font-size:15px">${typeof val === 'number' ? val.toFixed(2) : val} °C</b>`;
        },
      },

      grid: {
        top: '8%',
        bottom: '8%',
        left: '5%',
        right: '5%',
        containLabel: true,
      },

      xAxis: {
        type: 'category',
        data: Array.isArray(labels) ? labels : [],
        axisLabel: {
          color: 'rgba(255,255,255,0.6)',
          fontSize: 11,
          fontWeight: 600,
        },
        axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { show: false },
      },

      yAxis: {
        type: 'category',
        data: Array.isArray(days) ? days.map((_, i) => i + 1) : [],
        axisLabel: {
          color: 'rgba(255,255,255,0.6)',
          fontSize: 11,
        },
        axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { show: false },
      },

      visualMap: [{
        min: tempMin,
        max: tempMax,
        calculable: true,
        show: false,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        itemWidth: 14,
        itemHeight: 120,
        textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        formatter: (val) => val.toFixed(0) + '°C',
        inRange: {
          color: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        },
      }],

      series: [{
        name: '°C',
        type: 'heatmap',
        data: modifiedData,
        label: {
          show: true,
          fontSize: 10,
          fontWeight: 600,
          formatter: (params) => {
            const val = Array.isArray(params.value)
              ? params.value[2]
              : params.data?.value?.[2];
            return typeof val === 'number' ? val.toFixed(1) : '';
          },
        },
        itemStyle: {
          borderWidth: 2,
          borderType: 'solid',
          borderColor: 'rgba(15,23,42,0.8)',
          borderRadius: 3,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(0,170,228,0.5)',
            borderColor: '#00aae4',
            borderWidth: 2,
          },
        },
      }],
    }, true);

  }, [data, showColor, labels, days, tempMax, tempMin]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 320 }}>
      {!hasData && (
        <WaitingPlaceholder
          text={status === 'connected' ? 'Esperando datos de termometría...' : 'Conectando...'}
        />
      )}
      <div
        ref={chartRef}
        style={{
          width: '100%',
          height: 320,
          opacity: hasData ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      />
    </div>
  );
}