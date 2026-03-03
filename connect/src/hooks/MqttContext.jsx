import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const MqttContext = createContext(null);
const MAX_SERIES = 1000;
const MAX_RECONNECT = 5;
const RECONNECT_BASE_DELAY = 3000;

/**
 * MqttProvider
 *
 * Tres tipos de payload desde Node-RED:
 *
 * A) Escalar tiempo real:
 *    { topic: "temperatura", payload: 23.5, timestamp: "..." }
 *    → agrega a series[] (hasta MAX_SERIES puntos)
 *
 * B) Objeto tiempo real (multiples fields):
 *    { topic: "horno/temperaturas", payload: { T1: 145, T2: 98 }, timestamp: "..." }
 *    → agrega a fieldSeries[field][]
 *
 * C) Array (serie completa) — REEMPLAZA, no acumula:
 *    Escalar : { topic: "temperatura",        payload: [{ timestamp, value }, ...] }
 *    Fields  : { topic: "horno/temperaturas", payload: [{ timestamp, T1, T2 }, ...] }
 */
export function MqttProvider({ url, children }) {
  const [topicData, setTopicData] = useState({});
  const [status, setStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef(null);
  const isMountedRef = useRef(false); // proteccion StrictMode

  const sendMessage = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify(payload)); return true; }
      catch (e) { console.warn('[Mqtt] sendMessage error:', e); }
    }
    return false;
  }, []);

  const connect = useCallback(() => {
    if (!url || !isMountedRef.current) return;

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('connecting');
    let cancelled = false; // flag para StrictMode double-mount

    const ws = new WebSocket(url);

    ws.onopen = () => {
      if (cancelled) { ws.close(1000, 'cancelled'); return; }
      wsRef.current = ws;
      setStatus('connected');
      reconnectCount.current = 0;
    };

    ws.onmessage = (event) => {
      if (cancelled) return;
      try {
        const raw = JSON.parse(event.data);
        const messages = Array.isArray(raw) ? raw : [raw];

        setTopicData((prev) => {
          const next = { ...prev };

          messages.forEach((msg) => {
            const { topic, payload, timestamp } = msg;
            if (!topic) return;

            const ts = timestamp || new Date().toISOString();
            const existing = next[topic] || { current: null, series: [], fieldSeries: {} };

            if (Array.isArray(payload)) {
              // ── C) Array: REEMPLAZA serie completa ────────────────────────
              const first = payload[0];
              const isFieldObj = first &&
                typeof first === 'object' &&
                Object.keys(first).some(
                  (k) => k !== 'timestamp' && k !== 'time' && k !== '_time' &&
                         k !== 'value' && k !== '_value'
                );

              if (isFieldObj) {
                // [{ timestamp, T1, T2, ... }]
                const newFieldSeries = {};
                payload.forEach((item) => {
                  const iTs = item.timestamp || item.time || item._time || ts;
                  Object.entries(item).forEach(([k, v]) => {
                    if (k === 'timestamp' || k === 'time' || k === '_time') return;
                    if (!newFieldSeries[k]) newFieldSeries[k] = [];
                    newFieldSeries[k].push({ timestamp: iTs, value: v });
                  });
                });
                next[topic] = { ...existing, fieldSeries: newFieldSeries };
              } else {
                // [{ timestamp, value }]
                const series = payload.map((item) => ({
                  timestamp: item.timestamp || item.time || item._time || ts,
                  value: item.value !== undefined ? item.value
                       : item._value !== undefined ? item._value
                       : item.payload,
                }));
                next[topic] = { ...existing, series };
              }

            } else if (payload !== null && typeof payload === 'object') {
              // ── B) Objeto: multiples fields tiempo real ───────────────────
              const newFieldSeries = { ...existing.fieldSeries };
              Object.entries(payload).forEach(([field, value]) => {
                const prev = newFieldSeries[field] || [];
                newFieldSeries[field] = [...prev, { timestamp: ts, value }].slice(-MAX_SERIES);
              });
              next[topic] = { ...existing, current: payload, fieldSeries: newFieldSeries };

            } else {
              // ── A) Escalar tiempo real ────────────────────────────────────
              const series = [...existing.series, { timestamp: ts, value: payload }].slice(-MAX_SERIES);
              next[topic] = { ...existing, current: payload, series };
            }
          });

          return next;
        });

        setLastUpdate(new Date());
      } catch (err) {
        console.warn('[Mqtt] Parse error:', err);
      }
    };

    ws.onerror = () => { if (!cancelled) setStatus('error'); };

    ws.onclose = (e) => {
      if (cancelled) return;
      setStatus('disconnected');
      if (e.code !== 1000 && reconnectCount.current < MAX_RECONNECT && isMountedRef.current) {
        reconnectCount.current += 1;
        const delay = RECONNECT_BASE_DELAY * reconnectCount.current;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    wsRef.current = ws;
    wsRef.current.__cancel = () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    isMountedRef.current = true;
    setTopicData({});
    setLastUpdate(null);
    reconnectCount.current = 0;
    connect();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        if (typeof wsRef.current.__cancel === 'function') wsRef.current.__cancel();
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  return (
    <MqttContext.Provider value={{ topicData, status, lastUpdate, sendMessage, reconnect: connect }}>
      {children}
    </MqttContext.Provider>
  );
}

/**
 * useTopic(topic)
 * @returns { current, series, getField, getFieldSeries, status, lastUpdate }
 */
export function useTopic(topic) {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useTopic debe usarse dentro de MqttProvider');
  const { topicData, status, lastUpdate } = ctx;
  const data = topicData[topic] || { current: null, series: [], fieldSeries: {} };

  const getField = useCallback(
    (field) => data.current && typeof data.current === 'object'
      ? (data.current[field] !== undefined ? data.current[field] : null)
      : null,
    [data.current]
  );

  const getFieldSeries = useCallback(
    (field) => data.fieldSeries[field] || [],
    [data.fieldSeries]
  );

  return { current: data.current, series: data.series, getField, getFieldSeries, status, lastUpdate };
}

/**
 * useMqttStatus()
 * @returns { status, lastUpdate, sendMessage, reconnect }
 */
export function useMqttStatus() {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error('useMqttStatus debe usarse dentro de MqttProvider');
  return {
    status: ctx.status,
    lastUpdate: ctx.lastUpdate,
    sendMessage: ctx.sendMessage,
    reconnect: ctx.reconnect,
  };
}