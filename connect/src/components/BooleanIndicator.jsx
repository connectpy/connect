import { useSensor } from '../hooks/SensorContext';

/**
 * BooleanIndicator
 *
 * Indicador visual de estado booleano en tiempo real.
 * Muestra un cuadro que se ilumina cuando el valor es verdadero.
 *
 * Uso:
 * <BooleanIndicator sensor_id="horno/encendido" label="Encendido" />
 *
 * Props:
 *   sensor_id     : string   — ID del sensor booleano
 *   label         : string   — Texto a mostrar dentro del cuadro
 *   activeColor   : string   — Color cuando está activo (true)
 *   inactiveColor : string   — Color cuando está inactivo (false)
 *   size          : number   — Tamaño del cuadro (default 120)
 */
export default function BooleanIndicator({
  sensor_id,
  label = 'Estado',
  activeColor = '#10b981',
  inactiveColor = '#334155',
  size = 120,
}) {
  const sensor = useSensorSafe(sensor_id);
  const rawValue = sensor?.value;

  const isActive = rawValue === true ||
    rawValue === 1 ||
    rawValue === '1' ||
    rawValue === 'true' ||
    (typeof rawValue === 'number' && rawValue >= 1);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: 12,
      background: isActive ? activeColor + '22' : 'rgba(30,41,59,0.5)',
      border: `2px solid ${isActive ? activeColor : inactiveColor}`,
      boxShadow: isActive ? `0 0 24px ${activeColor}33` : 'none',
      transition: 'all 0.3s ease',
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: isActive ? activeColor : '#64748b',
        marginBottom: 8,
        textAlign: 'center',
      }}>
        {label}
      </div>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 6,
        background: isActive ? activeColor : inactiveColor,
        boxShadow: isActive ? `0 0 12px ${activeColor}88` : 'none',
        transition: 'all 0.3s ease',
      }} />
      {sensor && rawValue !== null && rawValue !== undefined && (
        <div style={{
          fontSize: 10,
          color: '#475569',
          marginTop: 6,
        }}>
          {isActive ? 'ACTIVO' : 'INACTIVO'}
        </div>
      )}
    </div>
  );
}

function useSensorSafe(sensorId) {
  try {
    return useSensor(sensorId || '__none__');
  } catch {
    return null;
  }
}
