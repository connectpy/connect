import { useSensors } from '../hooks/SensorContext';

/**
 * SpatialHeatmapWidget
 * Grilla visual de sensores posicionados espacialmente.
 *
 * JSON de configuración:
 * {
 *   layout: [
 *     // Modo string (usa último segmento como label):
 *     ["caaty/secadero/T1", "caaty/secadero/T2", "caaty/secadero/T3"],
 *     ["caaty/secadero/T4", null, "caaty/secadero/T5"],  // null = espacio vacío
 *
 *     // Modo objeto (label personalizado):
 *     [{ sensor_id: "caaty/secadero/T7", label: "Zona A1" }, ...]
 *   ],
 *   min: 0,          // valor mínimo del rango
 *   max: 100,        // valor máximo del rango
 *   unit: "°C",      // unidad a mostrar
 *   label: "Mapa de Temperaturas"
 * }
 *
 * Para dejar un espacio vacío usa: null o undefined
 *
 * Props:
 *   layout  : (string | { sensor_id: string, label: string } | null)[][]
 *   unit    : string
 *   min     : number
 *   max     : number
 *   label   : string
 */
export default function SpatialHeatmapWidget({
  layout     = [],
  unit:      unitProp,
  min = 0,
  max = 100,
  label,
}) {
  // Normalizar layout: strings → { sensor_id, label }, null/undefined → null
  const normalizedLayout = layout.map(row =>
    row.map(cell => {
      if (cell === null || cell === undefined) {
        return null;
      }
      if (typeof cell === 'string') {
        return { sensor_id: cell, label: cell.split('/').pop() };
      }
      return { sensor_id: cell.sensor_id, label: cell.label ?? cell.sensor_id.split('/').pop() };
    })
  );

  const allIds = normalizedLayout.flat().filter(Boolean).map(c => c.sensor_id);

  const sensorData = useSensorsSafe(allIds);

  function resolveCell(cell) {
    if (!cell) return null;
    const s = sensorData[cell.sensor_id];
    return {
      value: s?.value  ?? null,
      label: cell.label,
    };
  }

  const unit = unitProp ?? Object.values(sensorData).find(s => s?.unit)?.unit ?? '';

  const totalCount  = allIds.length;
  const activeCount = normalizedLayout.flat().filter(c => c && resolveCell(c)?.value !== null).length;
  const hasAnyData  = activeCount > 0;

  return (
    <div style={{ width: '100%', padding: '8px 0' }}>

      {/* Leyenda */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, justifyContent:'center' }}>
        <span style={{ fontSize:11, color:'#475569' }}>{min}{unit}</span>
        <div style={{
          flex:1, maxWidth:200, height:8, borderRadius:4,
          background:'linear-gradient(90deg,#3b82f6,#10b981,#f59e0b,#ef4444)', opacity:0.8,
        }} />
        <span style={{ fontSize:11, color:'#475569' }}>{max}{unit}</span>
      </div>

      {/* Grilla */}
      {!hasAnyData ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', minHeight:160, gap:12 }}>
          <div style={{ display:'flex', gap:5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:7, height:7, borderRadius:'50%', background:'#334155',
                animation:`shPulse 1.2s ease-in-out ${i*0.2}s infinite`,
              }} />
            ))}
          </div>
          <p style={{ margin:0, color:'#475569', fontSize:12 }}>Esperando datos de sensores...</p>
          <style>{`@keyframes shPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2);background:#06b6d4}}`}</style>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${normalizedLayout[0]?.length || 1}, 72px)`,
          gap: 8,
          justifyContent: 'center'
        }}>
          {normalizedLayout.flat().map((cell, flatIdx) => {
            if (cell === null) {
              return (
                <div key={`empty-${flatIdx}`}
                  style={{
                    width: 72, height: 72, borderRadius: 10,
                    background: 'transparent', border: '1px dashed rgba(255,255,255,0.05)',
                    flexShrink: 0,
                  }}
                />
              );
            }
            const { value, label: cellLabel } = resolveCell(cell);
            const { bg, text, border } = getTempColor(value, min, max);
            return (
              <div key={`cell-${flatIdx}`}
                title={`${cellLabel}: ${value !== null ? `${value}${unit}` : 'Sin datos'}`}
                style={{
                  width: 72, height: 72, borderRadius: 10,
                  background: bg, border: `1.5px solid ${border}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 2, cursor: 'default', position: 'relative',
                  overflow: 'hidden', transition: 'background 0.6s, border-color 0.6s',
                }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(circle at 30% 30%, ${border}22, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', zIndex: 1 }}>
                  {cellLabel}
                </span>
                <span style={{
                  fontSize: value !== null ? 18 : 14, fontWeight: 800, lineHeight: 1, zIndex: 1,
                  color: value !== null ? text : '#334155',
                  fontVariantNumeric: 'tabular-nums', transition: 'color 0.6s',
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
      )}

      {hasAnyData && (
        <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:'#334155' }}>
          {activeCount}/{totalCount} sensores activos
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function getTempColor(value, min, max) {
  if (value === null || value === undefined) {
    return { bg:'#1e293b', text:'#334155', border:'#334155' };
  }
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const stops = [
    { p:0,   r:59,  g:130, b:246 },
    { p:0.4, r:16,  g:185, b:129 },
    { p:0.7, r:245, g:158, b:11  },
    { p:1,   r:239, g:68,  b:68  },
  ];
  let lo = stops[0], hi = stops[stops.length-1];
  for (let i = 0; i < stops.length-1; i++) {
    if (pct >= stops[i].p && pct <= stops[i+1].p) { lo = stops[i]; hi = stops[i+1]; break; }
  }
  const t = (pct - lo.p) / (hi.p - lo.p || 1);
  const r = Math.round(lo.r + t*(hi.r-lo.r));
  const g = Math.round(lo.g + t*(hi.g-lo.g));
  const b = Math.round(lo.b + t*(hi.b-lo.b));
  return {
    bg:     `rgba(${r},${g},${b},0.25)`,
    border: `rgba(${r},${g},${b},0.7)`,
    text:   `rgb(${r},${g},${b})`,
  };
}

function useSensorsSafe(ids) {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSensors(ids);
  } catch {
    return {};
  }
}