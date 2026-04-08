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
  sensor_nivel, sensor_hum_grano,
  sensor_temp_max, sensor_temp_avg, sensor_temp_min,
  sensor_activo, sensor_fans, sensor_mode,
  siloName, label, grano,
}) {
  const nivel     = useSensorValue(sensor_nivel);
  const humGrano  = useSensorValue(sensor_hum_grano);
  const tempMax   = useSensorValue(sensor_temp_max);
  const tempAvg   = useSensorValue(sensor_temp_avg);
  const tempMin   = useSensorValue(sensor_temp_min);
  const activo    = useSensorValue(sensor_activo);
  const fans      = useSensorValue(sensor_fans);
  const mode      = useSensorValue(sensor_mode);

  return (
    <SiloControlCard
      data={{
        nivel:         nivel    ?? 0,
        humedad_grano: humGrano ?? null,
        temp_max:      tempMax  ?? null,
        temp_avg:      tempAvg  ?? null,
        temp_min:      tempMin  ?? null,
        grano:         grano    ?? 'S/D',
        activo:        activo   ? activo > 0 : false,
        fans_state:    fans     ? fans   > 0 : false,
        mode:          mode     ?? 'auto',
      }}
      siloName={siloName || label || 'Silo'}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SiloHeatmapRenderer
// Lee la matriz completa de sensor_ids y arma los datos para SiloHeatmapWidget.
// sensor_matrix: string[][]  →  [cabo][nivel] = sensor_id
// cabos:         string[]    →  etiquetas de columnas
// niveles:       string[]    →  etiquetas de filas
// ─────────────────────────────────────────────────────────────────────────────
function SiloHeatmapRenderer({ sensor_matrix = [], cabos = [], niveles = [], temp_min = 15, temp_max = 40, label }) {
  const allIds   = sensor_matrix.flat();
  const sensors  = useSensorsSafe(allIds);

  // Construir data en formato [caboIdx, nivelIdx, valor]
  const data      = [];
  const showColor = [];

  sensor_matrix.forEach((caboSensors, caboIdx) => {
    showColor[caboIdx] = [];
    caboSensors.forEach((sensorId, nivelIdx) => {
      const s = sensors[sensorId];
      if (s?.value !== null && s?.value !== undefined) {
        data.push([caboIdx, nivelIdx, s.value]);
        showColor[caboIdx][nivelIdx] = true;
      } else {
        showColor[caboIdx][nivelIdx] = false;
      }
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
  WeatherCard: WeatherCardRenderer,
  SiloResumen: SiloResumenRenderer,
  SiloControl: SiloControlRenderer,
  SiloHeatmap: SiloHeatmapRenderer,
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
        <ChartRenderer key={chart.id} chart={chart} />
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