import { useTopic } from '../hooks/MqttContext';

/**
 * SpatialHeatmapWidget
 * Grilla visual de sensores coloreados por temperatura.
 *
 * Props del config:
 *   topic   : "secadero/temperaturas"
 *   fields  : ["T1","T2",...,"T12"]
 *   layout  : [ ["T7","T8"], ["T5","T6"], ["T1","T2","T3","T4"], ["T9","T10","T11","T12"] ]
 *   unit    : "°C"
 *   min     : 0
 *   max     : 100
 */
export default function SpatialHeatmapWidget({ topic, fields, layout, unit = '°C', min = 0, max = 100 }) {
  const { getField, status } = useTopic(topic);

  // Interpolar color entre azul → verde → amarillo → rojo segun valor
  function getTempColor(value) {
    if (value === null || value === undefined) {
      return { bg: '#1e293b', text: '#334155', border: '#334155' };
    }
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));

    const stops = [
      { p: 0,   r: 59,  g: 130, b: 246 }, // azul
      { p: 0.4, r: 16,  g: 185, b: 129 }, // verde
      { p: 0.7, r: 245, g: 158, b: 11  }, // amarillo
      { p: 1,   r: 239, g: 68,  b: 68  }, // rojo
    ];

    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (pct >= stops[i].p && pct <= stops[i + 1].p) {
        lower = stops[i]; upper = stops[i + 1]; break;
      }
    }

    const range = upper.p - lower.p || 1;
    const t = (pct - lower.p) / range;
    const r = Math.round(lower.r + t * (upper.r - lower.r));
    const g = Math.round(lower.g + t * (upper.g - lower.g));
    const b = Math.round(lower.b + t * (upper.b - lower.b));

    return {
      bg:     'rgba(' + r + ',' + g + ',' + b + ',0.25)',
      border: 'rgba(' + r + ',' + g + ',' + b + ',0.7)',
      text:   'rgb('  + r + ',' + g + ',' + b + ')',
    };
  }

  const receivedCount = fields.filter((f) => getField(f) !== null).length;
  const hasAnyData = receivedCount > 0;

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>

      {/* Leyenda de color */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>{min}{unit}</span>
        <div style={{
          flex: 1, maxWidth: 200, height: 8, borderRadius: 4,
          background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b, #ef4444)',
          opacity: 0.8,
        }} />
        <span style={{ fontSize: 11, color: '#475569' }}>{max}{unit}</span>
      </div>

      {!hasAnyData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, gap: 12 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: '#334155',
                animation: 'spatialPulse 1.2s ease-in-out ' + (i * 0.2) + 's infinite',
              }} />
            ))}
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: 12 }}>
            {status === 'connected' ? 'Esperando datos de sensores...' : 'Conectando...'}
          </p>
          <style>{`@keyframes spatialPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2);background:#06b6d4}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {layout.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {row.map((fieldName) => {
                const value = getField(fieldName);
                const { bg, text, border } = getTempColor(value);
                return (
                  <div
                    key={fieldName}
                    title={fieldName + ': ' + (value !== null ? value + unit : 'Sin datos')}
                    style={{
                      width: 72, height: 72, borderRadius: 10,
                      background: bg, border: '1.5px solid ' + border,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                      cursor: 'default',
                      transition: 'background 0.6s ease, border-color 0.6s ease',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 30% 30%, ' + border + '22, transparent 70%)',
                      pointerEvents: 'none',
                    }} />
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', zIndex: 1 }}>
                      {fieldName}
                    </span>
                    <span style={{
                      fontSize: value !== null ? 18 : 14,
                      fontWeight: 800,
                      color: value !== null ? text : '#334155',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      zIndex: 1,
                      transition: 'color 0.6s ease',
                    }}>
                      {value !== null ? parseFloat(value).toFixed(1) : '—'}
                    </span>
                    {value !== null && (
                      <span style={{ fontSize: 9, color: '#64748b', zIndex: 1 }}>{unit}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {hasAnyData && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#334155' }}>
          {receivedCount}/{fields.length} sensores activos
        </div>
      )}
    </div>
  );
}