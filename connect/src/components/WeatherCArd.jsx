import { useState, useEffect, useRef } from "react";

// ── Mini Sparkline SVG sin dependencias ────────────────────────────────────
function Sparkline({ data = [], color = "#ff9800", height = 30 }) {
  if (data.length < 2) return null;
  const w = 120, h = height, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const linePath = "M " + pts.map((p) => p.join(",")).join(" L ");
  const areaPath =
    "M " + pts[0].join(",") + " L " + pts.map((p) => p.join(",")).join(" L ") +
    " L " + (w - pad) + "," + (h - pad) + " L " + pad + "," + (h - pad) + " Z";
  const gradId = "sg" + color.replace("#", "");
  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

// ── Icono clima + color segun temperatura ─────────────────────────────────
function WeatherIcon({ temp, size = 32 }) {
  const color = temp == null ? "#64748b"
    : temp > 35 ? "#ef4444"
    : temp > 25 ? "#f59e0b"
    : temp > 15 ? "#22c55e"
    : "#00aae4";
  const emoji = temp == null ? "—"
    : temp > 35 ? "☀️"
    : temp > 25 ? "⛅"
    : temp > 15 ? "🌤"
    : "🌧";
  return (
    <div style={{
      width: size + 16, height: size + 16, borderRadius: "50%",
      background: color + "22", border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.7, boxShadow: `0 0 16px ${color}44`, flexShrink: 0,
    }}>
      {emoji}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
/**
 * WeatherCard
 *
 * Props (todas opcionales — provienen de useTopic() / MqttContext):
 *   temp        : number | null   Temperatura actual
 *   humedad     : number | null   Humedad relativa exterior
 *   rocio       : number | null   Punto de rocio
 *   connected   : boolean         Estado de conexion del dispositivo
 *   tempHist    : number[]        Historial corto para sparkline
 *   humHist     : number[]        Historial corto para sparkline
 *   stationName : string          Nombre de la estacion
 */
export default function WeatherCard({
  temp       = null,
  humedad    = null,
  rocio      = null,
  connected  = false,
  tempHist   = [20, 22, 25, 24, 23, 26, 24],
  humHist    = [60, 65, 58, 62, 55, 60, 58],
  stationName = "Planta Bella Vista",
}) {
  const [isWide, setIsWide] = useState(false);
  const ref = useRef(null);

  // Responsive por ancho del contenedor, no del viewport
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setIsWide(e.contentRect.width >= 600));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const fmt = (v, dec = 1) =>
    v !== null && v !== undefined ? Number(v).toFixed(dec) : "--";

  return (
    <div ref={ref} style={{
      display: "flex",
      flexDirection: isWide ? "row" : "column",
      alignItems: isWide ? "center" : "stretch",
      background: "rgba(255,255,255,0.05)",
      backdropFilter: "blur(15px)",
      WebkitBackdropFilter: "blur(15px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20,
      padding: isWide ? "20px 24px" : "16px",
      color: "white",
      gap: 16,
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>

      {/* ── SECCIÓN 1: CABECERA ──────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        ...(isWide
          ? { flex: "0 0 220px", borderRight: "1px solid rgba(255,255,255,0.1)", paddingRight: 20 }
          : { borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 14 }),
      }}>
        <WeatherIcon temp={temp} size={32} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{
            fontSize: "0.58rem", letterSpacing: "1.5px", color: "#00aae4",
            fontWeight: 800, textTransform: "uppercase", display: "block",
          }}>
            Estación Meteorológica
          </span>
          <span style={{ fontSize: "0.88rem", fontWeight: 300, color: "rgba(255,255,255,0.9)" }}>
            {stationName}
          </span>
        </div>
      </div>

      {/* ── SECCIÓN 2: MÉTRICAS ──────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 12,
        flex: isWide ? 1 : undefined,
        padding: isWide ? "0 16px" : 0,
      }}>
        {/* Temperatura */}
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.04)", padding: 12,
          borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Temperatura
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{
              fontSize: "1.8rem", fontWeight: 700, lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              textShadow: temp !== null ? "0 0 20px #ff9800aa" : "none",
              transition: "text-shadow 0.4s",
            }}>
              {fmt(temp)}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#ff9800", marginLeft: 2 }}>°C</span>
          </div>
          {isWide && (
            <Sparkline data={temp !== null ? [...tempHist, temp] : tempHist} color="#ff9800" />
          )}
        </div>

        {/* Humedad */}
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.04)", padding: 12,
          borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Humedad Ext.
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{
              fontSize: "1.8rem", fontWeight: 700, lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              textShadow: humedad !== null ? "0 0 20px #00aae4aa" : "none",
              transition: "text-shadow 0.4s",
            }}>
              {fmt(humedad, 0)}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#00aae4", marginLeft: 2 }}>%</span>
          </div>
          {isWide && (
            <Sparkline data={humedad !== null ? [...humHist, humedad] : humHist} color="#00aae4" />
          )}
        </div>
      </div>

      {/* ── SECCIÓN 3: EXTRAS ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 10,
        ...(isWide
          ? { flex: "0 0 160px", alignItems: "flex-end" }
          : { width: "100%" }),
      }}>
        {/* Badge online/offline */}
        <span style={{
          fontSize: "0.6rem", padding: "4px 10px", borderRadius: 50, fontWeight: 700,
          border: connected ? "1px solid rgba(0,170,228,0.5)" : "1px solid rgba(255,255,255,0.1)",
          color: connected ? "#00aae4" : "rgba(255,255,255,0.3)",
        }}>
          {connected ? "CONECTADO" : "DESCONECTADO"}
        </span>

        {/* Punto de rocío */}
        {isWide ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Punto de Rocío
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ color: "#00aae4", fontSize: 14 }}>💧</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                {fmt(rocio)} °C
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(0,170,228,0.1)",
            border: "1px solid rgba(0,170,228,0.2)",
            borderRadius: 50, padding: "6px 14px",
          }}>
            <span style={{ color: "#00aae4", fontSize: 14 }}>💧</span>
            <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              Punto de Rocío:
            </span>
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
              {fmt(rocio)} °C
            </span>
          </div>
        )}
      </div>
    </div>
  );
}