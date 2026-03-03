import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// ─── Context ──────────────────────────────────────────────────────────────────
const MqttContext = createContext(null);

const MAX_SERIES_PER_TOPIC = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 3000;

/**
 * MqttProvider
 *
 * Props:
 *   url      : string     – URL dinámica del WebSocket (puede venir de DB/config)
 *   children : ReactNode
 *
 * No solicita datos al conectar. El componente padre es responsable de enviar
 * el mensaje de inicialización usando sendMessage() desde useMqttStatus().
 */
export function MqttProvider({ url, children }) {
  // { [topic]: { current: value | null, series: [{ timestamp, value }] } }
  const [topicData, setTopicData] = useState({});
  const [status, setStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  // ── sendMessage: envía un objeto JSON al WebSocket ─────────────────────────
  const sendMessage = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(payload));
        return true;
      } catch (e) {
        console.warn('[MqttContext] Error enviando mensaje:', e);
        return false;
      }
    }
    console.warn('[MqttContext] sendMessage: WebSocket no está abierto (estado:', wsRef.current?.readyState, ')');
    return false;
  }, []);

  const connect = useCallback(() => {
    if (!url) return;

    // Cerrar conexión anterior sin disparar reconexión automática
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttempts.current = 0;
        // No enviamos nada aquí. El DashboardInner lo hace en su useEffect
        // cuando detecta status === 'connected'.
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
              const existing = next[topic] || { current: null, series: [] };

              // Valor escalar → dato en tiempo real
              const point = { timestamp: ts, value: payload };
              const series = [...existing.series, point].slice(-MAX_SERIES_PER_TOPIC);
              next[topic] = { current: payload, series };
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
          console.log(`[MqttContext] Reintentando en ${delay / 1000}s (intento ${reconnectAttempts.current})`);
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('[MqttContext] Error creando WebSocket:', err);
      setStatus('error');
    }
  }, [url]);

  // Al cambiar URL limpiar estado y reconectar
  useEffect(() => {
    setTopicData({});
    setLastUpdate(null);
    reconnectAttempts.current = 0;
    connect();

    return () => {
      clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Unmounted');
      }
    };
  }, [connect]);

  return (
    <MqttContext.Provider value={{ topicData, status, lastUpdate, sendMessage, reconnect: connect }}>
      {children}
    </MqttContext.Provider>
  );
}

// ─── useTopic ─────────────────────────────────────────────────────────────────
/**
 * useTopic(topic)
 * @returns { current, series, status, lastUpdate }
 *   current : último valor recibido (null hasta que llegue el primer dato)
 *   series  : historial acumulado en sesión [{ timestamp, value }]
 */
export function useTopic(topic) {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useTopic debe usarse dentro de <MqttProvider>');
  const { topicData, status, lastUpdate } = ctx;
  const data = topicData[topic] || { current: null, series: [] };
  return { ...data, status, lastUpdate };
}

// ─── useMqttStatus ────────────────────────────────────────────────────────────
/**
 * useMqttStatus()
 * @returns { status, lastUpdate, sendMessage, reconnect }
 */
export function useMqttStatus() {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useMqttStatus debe usarse dentro de <MqttProvider>');
  return {
    status: ctx.status,
    lastUpdate: ctx.lastUpdate,
    sendMessage: ctx.sendMessage,
    reconnect: ctx.reconnect,
  };
}