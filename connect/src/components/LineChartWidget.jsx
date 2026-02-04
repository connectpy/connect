// src/components/widgets/LineChartWidget.jsx
// Componente de gráfico de líneas para mostrar datos de InfluxDB

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useWidgetData } from '../hooks/useWidgetData';

/**
 * Widget de gráfico de líneas
 * 
 * Muestra datos de InfluxDB en un gráfico de líneas temporal
 * Se actualiza automáticamente cada 5 segundos
 * 
 * @param {Object} props
 * @param {Object} props.config - Configuración del widget desde dashboard_config
 * @param {string} props.config.id - ID único del widget
 * @param {string} props.config.tipo - Tipo (debe ser "line")
 * @param {string} props.config.label - Título del gráfico
 * @param {string} props.config.bucket - Bucket de InfluxDB
 * @param {string} props.config.measurement - Medición
 * @param {string} props.config.field - Campo
 * @param {string} props.config.medicion - Unidad de medida (ej: "°C", "PSI")
 * @param {string} [props.config.aggregation] - Función de agregación
 */
function LineChartWidget({ config }) {
  
  // ==========================================================================
  // REFERENCIAS
  // ==========================================================================
  
  // Ref al div que contendrá el gráfico
  const chartRef = useRef(null);
  
  // Ref a la instancia de ECharts (para no recrearla cada vez)
  const chartInstanceRef = useRef(null);

  // ==========================================================================
  // CARGAR DATOS CON CUSTOM HOOK
  // ==========================================================================
  
  // useWidgetData se encarga de:
  // 1. Cargar datos iniciales
  // 2. Actualizar cada 5 segundos (5000ms)
  // 3. Manejar errores
  // 4. Limpiar al desmontar
  const { data, loading, error } = useWidgetData(
    config,      // Configuración del widget (bucket, measurement, field)
    '24h',        // Rango de tiempo: última 1 hora
    5000         // Actualizar cada 5 segundos
  );

  // ==========================================================================
  // EFFECT: Inicializar y actualizar el gráfico
  // ==========================================================================
  
  useEffect(() => {
    // Verificar que el div existe
    if (!chartRef.current) return;

    // -------------------------------------------------------------------------
    // INICIALIZAR ECHARTS (solo la primera vez)
    // -------------------------------------------------------------------------
    if (!chartInstanceRef.current) {
      console.log(`[LineChartWidget] Inicializando gráfico: ${config.label}`);
      
      // Crear instancia de ECharts en el div
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    // -------------------------------------------------------------------------
    // ACTUALIZAR GRÁFICO CON NUEVOS DATOS
    // -------------------------------------------------------------------------
    
    // Solo actualizar si hay datos disponibles
    if (data && data.length > 0) {
      console.log(`[LineChartWidget] Actualizando gráfico con ${data.length} puntos`);
      
      // Formatear datos para ECharts
      // formatForLineChart convierte [{time, value}] a {xAxis: [dates], series: [values]}
      const chartData = formatForLineChart(data);
      
      // -----------------------------------------------------------------------
      // CONFIGURACIÓN DEL GRÁFICO ECHARTS
      // -----------------------------------------------------------------------
      const option = {
        // Fondo transparente para que se vea el fondo del contenedor
        backgroundColor: 'transparent',
        
        // =====================================================================
        // TÍTULO
        // =====================================================================
        title: {
          text: config.label,  // ej: "Temperatura Línea 1"
          textStyle: { 
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 600
          },
          left: '10',
          top: '10'
        },
        
        // =====================================================================
        // TOOLTIP (información al pasar el mouse)
        // =====================================================================
        tooltip: {
          trigger: 'axis',  // Mostrar tooltip cuando el mouse está sobre el eje X
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          borderColor: '#475569',
          borderWidth: 1,
          textStyle: { 
            color: '#ffffff',
            fontSize: 13
          },
          // Formatear el contenido del tooltip
          formatter: (params) => {
            // params[0] es el punto de datos bajo el cursor
            const point = params[0];
            
            // point.value es un array [timestamp, valor]
            const timestamp = point.value[0];
            const value = point.value[1];
            
            // Formatear la fecha
            const date = new Date(timestamp);
            const dateStr = date.toLocaleString('es-PY', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            
            // Formatear el valor con la unidad de medida
            return `
              <div style="padding: 5px;">
                <strong>${dateStr}</strong><br/>
                Valor: <strong>${value.toFixed(2)} ${config.medicion}</strong>
              </div>
            `;
          }
        },
        
        // =====================================================================
        // GRID (área del gráfico)
        // =====================================================================
        grid: {
          left: '12%',    // Espacio para las etiquetas del eje Y
          right: '5%',
          bottom: '15%',  // Espacio para las etiquetas del eje X
          top: '20%'      // Espacio para el título
        },
        
        // =====================================================================
        // EJE X (tiempo)
        // =====================================================================
        xAxis: {
          type: 'time',  // Eje temporal
          
          // Estilo de las etiquetas (horas)
          axisLabel: { 
            color: '#94a3b8',
            fontSize: 11,
            // Formatear solo hora:minuto
            formatter: (value) => {
              const date = new Date(value);
              return date.toLocaleTimeString('es-PY', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
            }
          },
          
          // Línea del eje
          axisLine: { 
            lineStyle: { color: '#475569' } 
          },
          
          // No mostrar líneas de división verticales
          splitLine: { show: false }
        },
        
        // =====================================================================
        // EJE Y (valores)
        // =====================================================================
        yAxis: {
          type: 'value',  // Eje numérico
          
          // Nombre del eje (la unidad de medida)
          name: config.medicion,  // ej: "°C", "PSI"
          nameTextStyle: { 
            color: '#94a3b8',
            fontSize: 12
          },
          
          // Estilo de las etiquetas numéricas
          axisLabel: { 
            color: '#94a3b8',
            fontSize: 11,
            // Formatear con 1 decimal
            formatter: (value) => value.toFixed(1)
          },
          
          // Línea del eje
          axisLine: { 
            lineStyle: { color: '#475569' } 
          },
          
          // Líneas de división horizontales
          splitLine: { 
            lineStyle: { 
              color: '#334155',
              type: 'dashed'  // Líneas punteadas
            } 
          }
        },
        
        // =====================================================================
        // SERIE DE DATOS
        // =====================================================================
        series: [{
          name: config.label,
          type: 'line',  // Tipo: gráfico de líneas
          
          // Combinar arrays de tiempo y valores en pares [timestamp, valor]
          data: chartData.xAxis.map((time, index) => [
            time,                    // Timestamp
            chartData.series[index]  // Valor
          ]),
          
          // Línea suavizada (curva en lugar de líneas rectas)
          smooth: true,
          
          // Estilo de los puntos
          symbol: 'circle',
          symbolSize: 6,
          
          // Estilo de la línea
          lineStyle: { 
            color: '#06b6d4',  // Color cyan
            width: 3 
          },
          
          // Color de los puntos
          itemStyle: { 
            color: '#06b6d4' 
          },
          
          // Área rellena bajo la línea (gradiente)
          areaStyle: {
            color: new echarts.graphic.LinearGradient(
              0, 0,  // x1, y1 (inicio del gradiente: arriba)
              0, 1,  // x2, y2 (fin del gradiente: abajo)
              [
                // Stops del gradiente
                { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },   // Arriba: más opaco
                { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }   // Abajo: casi transparente
              ]
            )
          },
          
          // Animación al actualizar datos
          animation: true,
          animationDuration: 300
        }]
      };
      
      // -----------------------------------------------------------------------
      // APLICAR CONFIGURACIÓN AL GRÁFICO
      // -----------------------------------------------------------------------
      chartInstanceRef.current.setOption(option);
      
    } else if (data && data.length === 0) {
      // Si hay data pero está vacía, mostrar mensaje
      console.log(`[LineChartWidget] No hay datos disponibles`);
      
      // Podríamos mostrar un gráfico vacío con un mensaje
      chartInstanceRef.current.setOption({
        title: {
          text: config.label,
          subtext: 'No hay datos disponibles',
          left: 'center',
          top: 'center',
          textStyle: { color: '#ffffff' },
          subtextStyle: { color: '#94a3b8' }
        }
      });
    }
    
    // Este effect se ejecuta cada vez que `data` cambia
  }, [data, config]);

  // ==========================================================================
  // EFFECT: Hacer el gráfico responsive
  // ==========================================================================
  
  useEffect(() => {
    // Función que se ejecuta cuando la ventana cambia de tamaño
    const handleResize = () => {
      if (chartInstanceRef.current) {
        console.log('[LineChartWidget] Redimensionando gráfico');
        chartInstanceRef.current.resize();
      }
    };

    // Escuchar evento de resize de la ventana
    window.addEventListener('resize', handleResize);
    
    // Cleanup: remover listener al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ==========================================================================
  // EFFECT: Limpiar instancia de ECharts al desmontar
  // ==========================================================================
  
  useEffect(() => {
    // Este return se ejecuta al desmontar el componente
    return () => {
      if (chartInstanceRef.current) {
        console.log(`[LineChartWidget] Destruyendo gráfico: ${config.label}`);
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [config.label]);

  // ==========================================================================
  // RENDERIZADO CONDICIONAL
  // ==========================================================================
  
  // -------------------------------------------------------------------------
  // Estado: CARGANDO (primera vez)
  // -------------------------------------------------------------------------
  if (loading && !data) {
    return (
      <div className="widget-loading">
        <div className="spinner"></div>
        <p>Cargando datos...</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Estado: ERROR
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="widget-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p className="error-message">Error al cargar datos</p>
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Estado: NORMAL (mostrando gráfico)
  // -------------------------------------------------------------------------
  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '350px'
      }}
    />
  );
}

export default LineChartWidget;