import { useState, useEffect } from 'react';
import GaugeWidget          from './GaugeWidget';
import LineChartWidget      from './LineChartWidget';
import SpatialHeatmapWidget from './SpatialHeatmapWidget';
import HistoricoContainer   from './HistoricoContainer';
import WeatherCard          from './WeatherCArd';
import SiloResumenCard      from './Siloresumencard';
import SiloControlCard      from './Silocontrolcard';
import SiloHeatmapWidget    from './SiloHeatmapWidget';
import { useSensor, useSensors } from '../hooks/SensorContext';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// WeatherCardRenderer
// Lee temperatura, humedad y rocío de sensor_ids individuales.
// Si no hay sensor_ids configurados muestra la card con valores nulos.
// ─────────────────────────────────────────────────────────────────────────────
function WeatherCardRenderer({ sensor_temp, sensor_humedad, sensor_rocio, stationName, label }) {
  const temp    = useSensorValue(sensor_temp);
  const humedad = useSensorValue(sensor_humedad);
  const rocio   = useSensorValue(sensor_rocio);

  return (
    <WeatherCard
      temp={temp}
      humedad={humedad}
      rocio={rocio}
      stationName={stationName || label || 'Estación'}
      connected={temp !== null || humedad !== null}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SiloResumenRenderer
// Lee cada campo del silo desde su sensor_id correspondiente.
// Los campos estáticos (grano, fecha) vienen directo de la config.
// ─────────────────────────────────────────────────────────────────────────────
function SiloResumenRenderer({
  sensor_nivel, sensor_temp, sensor_humedad, sensor_fans,
  siloName, label, grano, fecha,
}) {
  const nivel    = useSensorValue(sensor_nivel);
  const temp     = useSensorValue(sensor_temp);
  const humedad  = useSensorValue(sensor_humedad);
  const fans     = useSensorValue(sensor_fans);

  // SiloResumenCard espera un topic para hacer useTopic internamente.
  // Pasamos los datos como overrides directos usando un topic ficticio
  // y sobreescribimos via el prop "data" si el componente lo soporta.
  // Si no lo soporta aún, renderizamos directamente con las props.
  return (
    <SiloResumenCard
      // Props directas — SiloResumenCard las usa si existen,
      // si no existe el prop "data" aún, se puede migrar el componente.
      data={{
        nivel:    nivel   ?? 0,
        temp:     temp    ?? null,
        humedad:  humedad ?? null,
        fans:     fans    ? fans > 0 : false,
        grano:    grano   ?? 'S/D',
        fecha:    fecha   ?? '—',
        connected: nivel !== null || temp !== null,
      }}
      siloName={siloName || label || 'Silo'}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SiloControlRenderer
// ─────────────────────────────────────────────────────────────────────────────
function SiloControlRenderer({
  nivel, hum_grano,
  temp_max, temp_avg, temp_min,
  activo, fans, mode,
  timer, start, end,
  siloName, label, grano,
}) {
  const nivelVal     = useSensorValue(nivel);
  const humGranoVal  = useSensorValue(hum_grano);
  const tempMaxVal   = useSensorValue(temp_max);
  const tempAvgVal   = useSensorValue(temp_avg);
  const tempMinVal   = useSensorValue(temp_min);
  const activoVal    = useSensorValue(activo);
  const fansVal      = useSensorValue(fans);
  const modeVal      = useSensorValue(mode);
  const timerVal     = useSensorValue(timer);
  const startVal     = useSensorValue(start);
  const endVal       = useSensorValue(end);

  return (
    <SiloControlCard
      data={{
        nivel:         nivelVal    ?? 0,
        humedad_grano: humGranoVal ?? null,
        temp_max:      tempMaxVal  ?? null,
        temp_avg:      tempAvgVal  ?? null,
        temp_min:      tempMinVal  ?? null,
        grano:         grano    ?? 'S/D',
        activo:        activoVal   ? activoVal > 0 : false,
        fans_state:    fansVal     ? fansVal   > 0 : false,
        mode:          modeVal     ?? 'auto',
        timer:         timerVal    ? timerVal > 0 : false,
        start:         startVal    ?? '--:--',
        end:           endVal      ?? '--:--',
      }}
      siloName={siloName || label || 'Silo'}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SiloHeatmapRenderer
// Lee la matriz completa de sensor_ids y arma los datos para SiloHeatmapWidget.
// sensor_matrix:          string[][]  →  [cabo][nivel] = sensor_id de temperatura
// sensor_hay_grano_matrix: string[][]  →  [cabo][nivel] = sensor_id de hayGrano (1=mostrar, 0=no mostrar)
// cabos:         string[]    →  etiquetas de columnas
// niveles:       string[]    →  etiquetas de filas
// ─────────────────────────────────────────────────────────────────────────────
function SiloHeatmapRenderer({ sensor_matrix = [], sensor_hay_grano_matrix = [], cabos = [], niveles = [], temp_min = 15, temp_max = 40, label }) {
  const tempIds = sensor_matrix.flat();
  const granoIds = sensor_hay_grano_matrix.flat();
  const allIds = [...tempIds, ...granoIds].filter(Boolean);

  const sensors  = useSensorsSafe(allIds);

  const data      = [];
  const showColor = [];

  sensor_matrix.forEach((caboSensors, caboIdx) => {
    showColor[caboIdx] = [];
    caboSensors.forEach((sensorId, nivelIdx) => {
      const s = sensors[sensorId];
      const granoId = sensor_hay_grano_matrix[caboIdx]?.[nivelIdx];
      const g = granoId ? sensors[granoId] : null;

      const hasTemp = s?.value !== null && s?.value !== undefined;
      const hasGrano = g?.value !== null && g?.value !== undefined;
      const showColorFlag = hasGrano ? g.value >= 1 : hasTemp;

      if (hasTemp) {
        data.push([caboIdx, nivelIdx, s.value]);
      }
      showColor[caboIdx][nivelIdx] = showColorFlag;
    });
  });

  return (
    <SiloHeatmapWidget
      data={{ labels: cabos, days: niveles, data, showColor, temp_max, temp_min }}
      label={label || 'Termometría'}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SpatialHeatmapRenderer
// Grilla espacial de sensores con temperatura.
// layout: string[][] | { sensor_id: string, label: string }[][]
// ─────────────────────────────────────────────────────────────────────────────
function SpatialHeatmapRenderer({ layout = [], min = 0, max = 100, unit, label }) {
  return (
    <SpatialHeatmapWidget
      layout={layout}
      min={min}
      max={max}
      unit={unit}
      label={label}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — hooks seguros fuera de contexto
// ─────────────────────────────────────────────────────────────────────────────
function useSensorValue(sensorId) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const s = useSensor(sensorId || '__none__');
    return s?.value ?? null;
  } catch {
    return null;
  }
}

function useSensorsSafe(ids) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSensors(ids);
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderers con sensor_id — gauge y line
// ─────────────────────────────────────────────────────────────────────────────
function SensorGaugeRenderer({ sensor_id, label, min, max, thresholds }) {
  const { value, unit, tags } = useSensor(sensor_id);
  return (
    <GaugeWidget
      value={value} unit={unit}
      label={label || tags?.sensor || sensor_id}
      min={min} max={max} thresholds={thresholds}
    />
  );
}

function SensorLineRenderer({ sensor_id, label, color, showArea, timeRange }) {
  const { value, unit, tags, series } = useSensor(sensor_id);
  return (
    <LineChartWidget
      series={series} value={value} unit={unit}
      label={label || tags?.sensor || sensor_id}
      color={color} showArea={showArea} timeRange={timeRange}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapas de tipos
// ─────────────────────────────────────────────────────────────────────────────
const SENSOR_RENDERERS = {
  gauge: SensorGaugeRenderer,
  line:  SensorLineRenderer,
};

const COMPLEX_RENDERERS = {
  WeatherCard:     WeatherCardRenderer,
  SiloResumen:     SiloResumenRenderer,
  SiloControl:     SiloControlRenderer,
  SiloHeatmap:     SiloHeatmapRenderer,
  SpatialHeatmap:  SpatialHeatmapRenderer,
};

// ─────────────────────────────────────────────────────────────────────────────
// ChartRenderer
// ─────────────────────────────────────────────────────────────────────────────
function ChartRenderer({ chart }) {
  const { id, tipo, sensor_id, ...rest } = chart;
  const isMobile = useIsMobile();
  const wrapStyle = { flex: isMobile ? '1 1 100%' : '1 1 auto', minWidth: 0 };

  // sensor_id simple → gauge / line
  if (sensor_id && SENSOR_RENDERERS[tipo]) {
    const R = SENSOR_RENDERERS[tipo];
    return <div style={wrapStyle}><R key={id} sensor_id={sensor_id} {...rest} /></div>;
  }

  // Widgets complejos
  const R = COMPLEX_RENDERERS[tipo];
  if (R) return <div style={wrapStyle}><R key={id} {...rest} /></div>;

  return (
    <div style={{ padding:12, color:'#ef4444', fontSize:12,
      background:'rgba(239,68,68,0.08)', borderRadius:8 }}>
      Tipo desconocido: <b>{tipo}</b>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContainerWidget — fila con wrap responsivo
// ─────────────────────────────────────────────────────────────────────────────
function ContainerWidget({ widget }) {
  return (
    <div style={{ display:'flex', flexDirection:'row', gap:16, width:'100%', flexWrap:'wrap' }}>
      {(widget.charts || []).map(chart => (
        <div key={chart.id} style={{ flex: '1 1 300px', minWidth: 0 }}>
          <ChartRenderer chart={chart} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WidgetRendererMulti — punto de entrada
// ─────────────────────────────────────────────────────────────────────────────
export default function WidgetRendererMulti({ widget }) {
  if (!widget) return null;

  // historico_cabo — heatmap + línea por cabo
  if (widget.tipo === 'historico_cabo') {
    return (
      <HistoricoContainer
        cabos={widget.cabos   || []}
        siloId={widget.siloId || 'silo'}
        unit={widget.unit     || '°C'}
        min={widget.min       ?? 15}
        max={widget.max       ?? 40}
      />
    );
  }

  // container — grupo de charts en fila
  if (widget.tipo === 'container') return <ContainerWidget widget={widget} />;

  // widget directo (WeatherCard, SiloResumen, SiloControl, SiloHeatmap, gauge, line)
  return <ChartRenderer chart={widget} />;
}