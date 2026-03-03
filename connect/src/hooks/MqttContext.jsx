import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// ─── Context ──────────────────────────────────────────────────────────────────
const MqttContext = createContext(null);

const MAX_HISTORY_PER_TOPIC = 500;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 3000;

// ─── Provider ─────────────────────────────────────────────────────────────────
export function MqttProvider({ url, children }) {
  // { [topic]: { current: value, series: [{ timestamp, value }] } }
  const [topicData, setTopicData] = useState({});
  const [status, setStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  
  const connect = useCallback(() => {
    if (!url) return;
    if (wsRef.current) wsRef.current.close();

    setStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const messages = Array.isArray(raw) ? raw : [raw];

          setTopicData((prev) => {
            const next = { ...prev };

            messages.forEach(({ topic, payload, timestamp }) => {
              if (!topic) return;

              const ts = timestamp || new Date().toISOString();
              const existing = next[topic] || { current: null, series: [], history: [] };

              // payload es array → histórico inicial desde Node-RED
              if (Array.isArray(payload)) {
                const history = payload.map((p) => ({
                  timestamp: p.timestamp || p.time || p._time || ts,
                  value: p.value ?? p._value ?? p.payload,
                }));
                next[topic] = { ...existing, history, current: history.at(-1)?.value ?? existing.current };
              } else {
                // payload es valor escalar → dato en tiempo real
                const point = { timestamp: ts, value: payload };
                const series = [...existing.series, point].slice(-MAX_HISTORY_PER_TOPIC);
                next[topic] = { ...existing, current: payload, series };
              }
            });

            return next;
          });

          setLastUpdate(new Date());
        } catch (err) {
          console.warn('[MqttContext] Error parseando mensaje:', err);
        }
      };

      ws.onerror = () => setStatus('error');

      ws.onclose = (e) => {
        setStatus('disconnected');
        if (e.code !== 1000 && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          const delay = RECONNECT_BASE_DELAY * reconnectAttempts.current;
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('[MqttContext] No se pudo crear WebSocket:', err);
      setStatus('error');
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close(1000, 'Provider unmounted');
    };
  }, [connect]);
  const sendMessage = useCallback((msg) => {
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify(msg));
  } else {
    console.warn('[MqttContext] WebSocket no está abierto. No se pudo enviar:', msg);
  }
}, []);
  return (
    <MqttContext.Provider value={{ topicData, status, lastUpdate, reconnect: connect, sendMessage }}>
      {children}
    </MqttContext.Provider>
  );
}

// ─── Hook para consumir un topic ──────────────────────────────────────────────
/**
 * useTopic(topic)
 * Devuelve { current, series, history, status, lastUpdate }
 *
 * - current  : último valor recibido (escalar)
 * - series   : puntos en tiempo real acumulados [{ timestamp, value }]
 * - history  : histórico inicial enviado por Node-RED [{ timestamp, value }]
 */
export function useTopic(topic) {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useTopic debe usarse dentro de <MqttProvider>');

  const { topicData, status, lastUpdate } = ctx;
  const data = topicData[topic] || { current: null, series: [], history: [] };

  return { ...data, status, lastUpdate };
}

export function useMqttStatus() {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useMqttStatus debe usarse dentro de <MqttProvider>');
  return { status: ctx.status, lastUpdate: ctx.lastUpdate, reconnect: ctx.reconnect };
}