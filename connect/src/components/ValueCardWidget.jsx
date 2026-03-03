import { useTopic } from '../hooks/MqttContext';

/**
 * ValueCardWidget
 * Muestra el valor actual de un topic con estilo de tarjeta.
 *
 * Config:
 *   topic      : "estacion/temperatura"
 *   title      : "Temperatura"
 *   unit       : "°C"
 *   icon       : "🌡️"         (opcional, emoji o string)
 *   color      : "#3b82f6"    (opcional, color del acento)
 *   decimals   : 1            (opcional)
 *   thresholds : [            (opcional, colorea el valor según rangos)
 *     { max: 20, color: '#3b82f6' },
 *     { max: 35, color: '#22c55e' },
 *     { max: 50, color: '#ef4444' },
 *   ]
 */
export default function ValueCardWidget({
  topic,
  title = 'Valor',
  unit = '',
  icon = null,
  color = '#3b82f6',
  decimals = 1,
  thresholds = null,
}) {
  const { current, lastUpdate } = useTopic(topic);

  const displayValue = current !== null ? parseFloat(current).toFixed(decimals) : '—';

  // Determinar color según thresholds
  let valueColor = color;
  if (thresholds && current !== null) {
    const val = parseFloat(current);
    const matched = thresholds.find((t) => val <= t.max);
    if (matched) valueColor = matched.color;
  }

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: 140,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '18px 20px',
      background: '#fff',
      borderRadius: 12,
      border: `1px solid #e2e8f0`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      boxSizing: 'border-box',
    }}>
      {/* Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
      </div>

      {/* Valor */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 48, fontWeight: 800, color: valueColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {displayValue}
        </span>
        <span style={{ fontSize: 20, color: '#94a3b8', fontWeight: 500 }}>{unit}</span>
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: 11, color: '#cbd5e1' }}>
        {timeStr ? `Actualizado: ${timeStr}` : 'Sin datos aún'}
      </div>

      {/* Barra de acento inferior */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        borderRadius: '0 0 12px 12px',
        background: valueColor,
        opacity: 0.6,
      }} />
    </div>
  );
}