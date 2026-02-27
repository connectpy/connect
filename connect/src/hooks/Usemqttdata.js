import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useMqttData
 * Hook para conectarse al WebSocket de Node-RED y recibir datos MQTT en tiempo real.
 *
 * Node-RED debe tener un flujo: [mqtt in] → [function/change] → [websocket out]
 * El mensaje que envía Node-RED debe tener este formato JSON:
 * { "topic": "empresa/sensor/temp", "payload": 23.5, "timestamp": 1234567890 }
 *
 * @param {string} wsUrl - URL del WebSocket de Node-RED (ej: wss://tuservidor.com/ws/dashboard)
 * @param {string[]} topics - Lista de topics MQTT a escuchar (filtrado en el cliente)
 */
export function useMqttData(wsUrl, topics = []) {
  // Estado principal: { "topic/nombre": valor }
  const [data, setData] = useState({});
  const [status, setStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [lastUpdate, setLastUpdate] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    if (!wsUrl) return;

    // Limpiar conexión anterior si existe
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    console.log(`[MQTT-WS] Conectando a ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[MQTT-WS] Conectado ✓');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Soporta tanto objeto único como array de mensajes
          const messages = Array.isArray(message) ? message : [message];

          messages.forEach((msg) => {
            const { topic, payload } = msg;
            if (!topic) return;

            // Si se especificaron topics, filtrar
            if (topics.length > 0 && !topics.includes(topic)) return;

            setData((prev) => ({
              ...prev,
              [topic]: payload,
            }));
          });

          setLastUpdate(new Date());
        } catch (err) {
          console.warn('[MQTT-WS] Error parseando mensaje:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[MQTT-WS] Error de WebSocket:', err);
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log(`[MQTT-WS] Desconectado (code: ${event.code})`);
        setStatus('disconnected');

        // Reconexión automática (excepto si fue cierre intencional)
        if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
          console.log(`[MQTT-WS] Reintentando en ${delay / 1000}s... (intento ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.error('[MQTT-WS] No se pudo crear WebSocket:', err);
      setStatus('error');
    }
  }, [wsUrl]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup al desmontar
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  /**
   * Obtener el valor de un topic específico
   * @param {string} topic
   * @param {*} defaultValue - Valor por defecto si el topic aún no tiene datos
   */
  const getValue = useCallback(
    (topic, defaultValue = null) => {
      return data[topic] !== undefined ? data[topic] : defaultValue;
    },
    [data]
  );

  return {
    data,        // Objeto completo: { "topic": valor }
    getValue,    // Función helper: getValue("mi/topic", 0)
    status,      // Estado de conexión
    lastUpdate,  // Fecha del último mensaje recibido
    reconnect: connect, // Forzar reconexión manual
  };
}