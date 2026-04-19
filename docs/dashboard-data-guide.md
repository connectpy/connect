# Guia de datos para widgets de dashboard

Esta guia esta basada en la implementacion actual de:

- [WidgetRendererMulti.jsx](/connect/src/components/WidgetRendererMulti.jsx)
- [SensorContext.jsx](/connect/src/hooks/SensorContext.jsx)
- [GaugeWidget.jsx](/connect/src/components/GaugeWidget.jsx)
- [LineChartWidget.jsx](/connect/src/components/LineChartWidget.jsx)
- [ValueCardWidget.jsx](/connect/src/components/ValueCardWidget.jsx)
- [SpatialHeatmapWidget.jsx](/connect/src/components/SpatialHeatmapWidget.jsx)
- [WeatherCArd.jsx](/connect/src/components/WeatherCArd.jsx)
- [Siloresumencard.jsx](/connect/src/components/Siloresumencard.jsx)
- [Silocontrolcard.jsx](/connect/src/components/Silocontrolcard.jsx)
- [SiloHeatmapWidget.jsx](/connect/src/components/SiloHeatmapWidget.jsx)
- [historicoCabo.jsx](/connect/src/components/historicoCabo.jsx)
- [LineChartZones.jsx](/connect/src/components/LineChartZones.jsx)

## 1. Como fluye la data hoy

El dashboard tiene dos fuentes principales:

1. Tiempo real por polling HTTP desde `SensorContext`.
2. Historico bajo demanda usando `useHistorico()`.

### Tiempo real

`SensorProvider` consulta:

- `GET {apiBase}/api/estado/{clientId}`

La respuesta esperada es:

```json
{
  "sensor/id": {
    "id": "sensor/id",
    "measurement": "temperatura",
    "tags": {
      "unit": "°C"
    },
    "fields": {
      "value": 26.4
    }
  }
}
```

Tambien puede traer varios `fields` dentro del mismo sensor:

```json
{
  "demo/estacion": {
    "id": "demo/estacion",
    "tags": {
      "unit": "Â°C"
    },
    "fields": {
      "temperatura": 26.4,
      "humedad": 71,
      "rocio": 20.1
    }
  }
}
```

Internamente se guarda como:

```js
sensorData[sensorId] = {
  value: sensor.fields?.value ?? null,
  tags: sensor.tags || {},
  fields: sensor.fields || {}
}
```

Notas importantes:

- Se guardan todos los `fields` del sensor.
- Si existe `fields.value`, sigue siendo el valor por defecto para compatibilidad.
- `useSensor(sensorId)` devuelve el valor por defecto del sensor.
- `useSensor('demo/estacion.fields.temperatura')` devuelve ese field puntual.
- `useSensors(sensorRefs)` devuelve un objeto por cada referencia pedida.

### Historico

`useHistorico().query()` consulta:

- `GET {apiBase}/api/consulta/{clientId}?sensorId=...&desde=...&hasta=...&field=...&window=...&fn=...`

La respuesta puede ser:

```json
{
  "sensor/id": [
    { "timestamp": "2026-03-01T00:00:00Z", "value": 26.1 }
  ]
}
```

Para `historicoCabo`, cada punto puede incluir tambien:

```json
{
  "timestamp": "2026-03-01T00:00:00Z",
  "value": 26.1,
  "hay_grano": true,
  "aireacion": false
}
```

## 2. Tipos de widget soportados

`WidgetRendererMulti` hoy reconoce estos tipos:

- `gauge`
- `line`
- `ValueCardWidget`
- `WeatherCard`
- `SiloResumen`
- `SiloControl`
- `SiloHeatmap`
- `SpatialHeatmap`
- `historico_cabo`
- `container`

## 3. Widgets simples

## `gauge`

Renderiza [GaugeWidget.jsx](/connect/src/components/GaugeWidget.jsx).

### Configuracion minima

```json
{
  "id": "temp-gauge",
  "tipo": "gauge",
  "sensor_id": "planta/secadero/T1"
}
```

### Props soportadas

- `id`: identificador unico del widget.
- `tipo`: debe ser `"gauge"`.
- `sensor_id`: sensor a leer desde `SensorContext`.
- `label`: titulo visible del gauge.
- `min`: minimo de escala.
- `max`: maximo de escala.
- `thresholds`: arreglo de umbrales con color.

### Formato de `thresholds`

```json
[
  { "value": 20, "color": "#10b981" },
  { "value": 35, "color": "#f59e0b" },
  { "value": 50, "color": "#ef4444" }
]
```

### Que datos necesita del backend

- En tiempo real puede leer `fields.value` o cualquier referencia tipo `sensor_id.fields.campo`.
- La unidad se toma de `tags.unit`.

### Ejemplo completo

```json
{
  "id": "temp-silo",
  "tipo": "gauge",
  "sensor_id": "caaty/silo1/TEMP_AVG",
  "label": "Temp. Promedio",
  "min": 0,
  "max": 50,
  "thresholds": [
    { "value": 20, "color": "#10b981" },
    { "value": 32, "color": "#f59e0b" },
    { "value": 50, "color": "#ef4444" }
  ]
}
```

## `line`

Renderiza [LineChartWidget.jsx](/connect/src/components/LineChartWidget.jsx).

### Configuracion minima

```json
{
  "id": "temp-line",
  "tipo": "line",
  "sensor_id": "planta/secadero/T1"
}
```

### Props soportadas

- `id`
- `tipo`: debe ser `"line"`.
- `sensor_id`
- `label`
- `color`
- `showArea`
- `timeRange`

### Valores validos para `timeRange`

- `-1h`
- `-3h`
- `-6h`
- `-24h`
- `-7d`

### Importante

El componente espera una serie de puntos `[{ timestamp, value }]`, pero hoy `useSensor()` no arma ni persiste `series`. Eso significa:

- Si usas `tipo: "line"` con solo `sensor_id`, probablemente no muestre datos historicos por si solo.
- El componente si funciona en modo directo si le pasas `series` manualmente.

### Ejemplo ideal si luego agregas series al contexto

```json
{
  "id": "linea-temp",
  "tipo": "line",
  "sensor_id": "caaty/silo1/TEMP_AVG",
  "label": "Temperatura promedio",
  "color": "#06b6d4",
  "showArea": true,
  "timeRange": "-24h"
}
```

## `ValueCardWidget`

Renderiza [ValueCardWidget.jsx](/connect/src/components/ValueCardWidget.jsx). Muestra el valor actual de un sensor en una tarjeta con estilo visual.

### Configuracion minima

```json
{
  "id": "temp-card",
  "tipo": "ValueCardWidget",
  "sensor_id": "planta/secadero/T1.fields.temperatura"
}
```

### Props soportadas

- `id`: identificador unico del widget.
- `tipo`: debe ser `"ValueCardWidget"`.
- `sensor_id`: sensor a leer desde `SensorContext`. Soporta referencias tipo `sensor.fields.campo`.
- `title`: titulo visible de la tarjeta.
- `unit`: unidad a mostrar (ej: "°C", "%"). Si no se especifica, usa la del sensor.
- `icon`: emoji o icono a mostrar (ej: "🌡️").
- `color`: color por defecto del valor (hex).
- `decimals`: cantidad de decimales a mostrar.
- `thresholds`: arreglo de umbrales para cambiar el color segun el valor.

### Formato de `thresholds`

```json
[
  { "max": 20, "color": "#3b82f6" },
  { "max": 35, "color": "#22c55e" },
  { "max": 50, "color": "#ef4444" }
]
```

### Ejemplo completo

```json
{
  "id": "temp-actual",
  "tipo": "ValueCardWidget",
  "sensor_id": "caaty/secadero/T1.fields.temperatura",
  "title": "Temperatura",
  "unit": "°C",
  "icon": "🌡️",
  "color": "#3b82f6",
  "decimals": 1,
  "thresholds": [
    { "max": 20, "color": "#3b82f6" },
    { "max": 35, "color": "#22c55e" },
    { "max": 50, "color": "#ef4444" }
  ]
}
```

## 4. Widgets compuestos

## `WeatherCard`

Renderiza [WeatherCArd.jsx](/connect/src/components/WeatherCArd.jsx) mediante `WeatherCardRenderer`.

### Configuracion recomendada

```json
{
  "id": "widget-weather",
  "tipo": "WeatherCard",
  "label": "Estación Meteorológica",
  "stationName": "Planta Bella Vista",
  "sensor_temp": "demo/estacion.fields.temperatura",
  "sensor_humedad": "demo/estacion.fields.humedad",
  "sensor_rocio": "demo/estacion.fields.rocio"
}
```

### Campos esperados

- `sensor_temp`: sensor de temperatura exterior.
- `sensor_humedad`: sensor de humedad relativa.
- `sensor_rocio`: sensor de punto de rocio.
- `stationName`: nombre visible.
- `label`: fallback si no hay `stationName`.

### Como se usan

- `temp` sale de `sensor_temp`.
- `humedad` sale de `sensor_humedad`.
- `rocio` sale de `sensor_rocio`.
- `connected` se considera verdadero si existe `temp` o `humedad`.

### Opcionales reales del componente

El componente tambien acepta:

- `tempHist`
- `humHist`

Pero hoy `WeatherCardRenderer` no se los pasa.

## `SiloResumen`

Renderiza [Siloresumencard.jsx](/connect/src/components/Siloresumencard.jsx) mediante `SiloResumenRenderer`.

### Configuracion recomendada

```json
{
  "id": "widget-silo1-resumen",
  "tipo": "SiloResumen",
  "label": "Silo Central N° 1",
  "siloName": "SILO CENTRAL N° 1",
  "sensor_nivel": "caaty/silo1/NIVEL",
  "sensor_temp": "caaty/silo1/TEMP_MAX",
  "sensor_humedad": "caaty/silo1/HUM",
  "sensor_fans": "caaty/silo1/FANS",
  "grano": "SOJA",
  "fecha": "15/03/2026"
}
```

### Campos esperados

- `sensor_nivel`
- `sensor_temp`
- `sensor_humedad`
- `sensor_fans`
- `siloName`
- `label`
- `grano`
- `fecha`

### Data interna que finalmente recibe la card

```js
{
  nivel: number,
  temp: number | null,
  humedad: number | null,
  fans: boolean,
  grano: string,
  fecha: string,
  connected: boolean
}
```

### Regla importante para booleanos

`fans` se calcula asi:

```js
fans ? fans > 0 : false
```

Eso funciona bien si el backend manda `0` o `1`. Si manda `"auto"`, `"true"` o `true`, el resultado puede no ser el esperado.

## `SiloControl`

Renderiza [Silocontrolcard.jsx](/connect/src/components/Silocontrolcard.jsx) mediante `SiloControlRenderer`.

### Configuracion recomendada

```json
{
  "id": "silo1-control",
  "tipo": "SiloControl",
  "label": "Control de Aireación — Silo 1",
  "siloName": "Silo Nro. 1",
  "sensor_nivel": "demo/silo1/NIVEL",
  "sensor_hum_grano": "demo/silo1/HUM",
  "sensor_temp_max": "demo/silo1/TEMP_MAX",
  "sensor_temp_avg": "demo/silo1/TEMP_AVG",
  "sensor_temp_min": "demo/silo1/TEMP_MIN",
  "sensor_activo": "demo/silo1/ACTIVO",
  "sensor_fans": "demo/silo1/FANS",
  "sensor_mode": "demo/silo1/MODE",
  "grano": "SOJA"
}
```

### Campos esperados

- `sensor_nivel`
- `sensor_hum_grano`
- `sensor_temp_max`
- `sensor_temp_avg`
- `sensor_temp_min`
- `sensor_activo`
- `sensor_fans`
- `sensor_mode`
- `siloName`
- `label`
- `grano`

### Data interna que recibe la card

```js
{
  nivel: number,
  humedad_grano: number | null,
  temp_max: number | null,
  temp_avg: number | null,
  temp_min: number | null,
  grano: string,
  activo: boolean,
  fans_state: boolean,
  mode: string
}
```

### Limitaciones actuales

- La card soporta `timer`, `start` y `end`, pero `SiloControlRenderer` no los mapea desde sensores ni desde config.
- `mode` llega desde `useSensorValue(sensor_mode)`. Si apuntas a `demo/silo1.fields.mode`, puede leer texto como `"auto"` o `"manual"` siempre que el backend lo envie en ese field.
- Igual que en `SiloResumen`, `activo` y `fans_state` se calculan como `valor > 0`.

## `SiloHeatmap`

Renderiza [SiloHeatmapWidget.jsx](/connect/src/components/SiloHeatmapWidget.jsx) mediante `SiloHeatmapRenderer`.

### Configuracion recomendada

```json
{
  "id": "silo1-heatmap",
  "tipo": "SiloHeatmap",
  "label": "Termometría — Silo 1",
  "cabos": ["Cabo 1", "Cabo 2", "Cabo 3"],
  "niveles": ["N1", "N2", "N3", "N4", "N5", "N6", "N7"],
  "sensor_matrix": [
    ["caaty/silo1/C1N1", "caaty/silo1/C1N2", "caaty/silo1/C1N3"],
    ["caaty/silo1/C2N1", "caaty/silo1/C2N2", "caaty/silo1/C2N3"],
    ["caaty/silo1/C3N1", "caaty/silo1/C3N2", "caaty/silo1/C3N3"]
  ],
  "temp_min": 15,
  "temp_max": 40
}
```

### Campos esperados

- `cabos`: etiquetas de columnas.
- `niveles`: etiquetas de filas.
- `sensor_matrix`: matriz `string[][]` con forma `[cabo][nivel]`.
- `temp_min`
- `temp_max`
- `label`

### Como se transforma

El renderer construye:

```js
{
  labels: cabos,
  days: niveles,
  data: [[caboIdx, nivelIdx, valor], ...],
  showColor: [[boolean]],
  temp_max,
  temp_min
}
```

### Regla clave

Solo se agrega un punto a `data` si el sensor tiene valor. Si no tiene valor:

- no se agrega la celda a `data`
- `showColor[cabo][nivel] = false`

### Importante

En la config demo existe `sensor_hay_grano`, pero `SiloHeatmapRenderer` no lo usa. Hoy el heatmap en tiempo real decide si colorear una celda solo por disponibilidad del valor, no por un sensor real de presencia de grano.

## `SpatialHeatmap`

Renderiza [SpatialHeatmapWidget.jsx](/connect/src/components/SpatialHeatmapWidget.jsx). Muestra una grilla visual de sensores posicionados espacialmente.

### Configuracion minima (modo string)

```json
{
  "id": "mapa-temp",
  "tipo": "SpatialHeatmap",
  "layout": [
    ["caaty/silo1/T1", "caaty/silo1/T2"],
    ["caaty/silo1/T3", "caaty/silo1/T4"]
  ]
}
```

### Configuracion con labels personalizados

```json
{
  "id": "mapa-temp",
  "tipo": "SpatialHeatmap",
  "label": "Mapa de Temperaturas",
  "min": 15,
  "max": 40,
  "unit": "°C",
  "layout": [
    [
      { "sensor_id": "caaty/silo1/T1", "label": "F1-A" },
      { "sensor_id": "caaty/silo1/T2", "label": "F1-B" }
    ],
    [
      { "sensor_id": "caaty/silo1/T3", "label": "F2-A" },
      null
    ]
  ]
}
```

### Props soportadas

- `id`
- `tipo`: debe ser `"SpatialHeatmap"`.
- `label`: titulo del widget.
- `layout`: matriz 2D de sensores. Cada elemento puede ser:
  - String: usa el ID como label (ultimo segmento).
  - Objeto `{ sensor_id, label }`: label personalizado.
  - `null` o `undefined`: espacio vacio.
- `min`: valor minimo del rango de temperatura.
- `max`: valor maximo del rango de temperatura.
- `unit`: unidad a mostrar.

### Como se usa layout

El layout define la estructura visual de la grilla. Cada fila es un array y cada celda puede ser:

- `"sensor/id"`: usa el ultimo segmento como label
- `{ sensor_id: "sensor/id", label: "Zona A1" }`: con label personalizado
- `null`: deja un espacio vacio en esa posicion

### Importante

- El widget usa CSS Grid con numero fijo de columnas (toma el ancho de la primera fila).
- Las posiciones son fijas y no se reordenan en mobile.
- El gradiente de color va de azul (frio) a rojo (caliente).

## `historico_cabo`

Renderiza [historicoCabo.jsx](/connect/src/components/historicoCabo.jsx).

### Configuracion recomendada

```json
{
  "id": "silo1-historico",
  "tipo": "historico_cabo",
  "label": "Análisis por Cabo — Silo 1",
  "siloId": "silo1",
  "unit": "°C",
  "min": 15,
  "max": 40,
  "cabos": [
    {
      "id": "c1",
      "label": "Cabo 1",
      "sensorIds": [
        "caaty/silo1/C1N1",
        "caaty/silo1/C1N2",
        "caaty/silo1/C1N3"
      ],
      "queryConfig": {
        "field": "value",
        "window": "12h",
        "fn": "mean"
      }
    }
  ]
}
```

### Campos esperados del widget

- `cabos`: arreglo de cabos.
- `siloId`
- `unit`
- `min`
- `max`

### Campos esperados por cada cabo

- `id`
- `label`
- `sensorIds`: arreglo de sensores que forman ese cabo.
- `queryConfig.field`
- `queryConfig.window`
- `queryConfig.fn`

### Backend esperado

Por cada `sensorId`, la respuesta ideal es:

```json
{
  "caaty/silo1/C1N1": [
    {
      "timestamp": "2026-03-01T00:00:00Z",
      "value": 26.1,
      "hay_grano": true,
      "aireacion": false
    }
  ]
}
```

### Como usa cada campo

- `value`: temperatura usada en heatmap y linea promedio.
- `hay_grano`: pinta cada celda como activa o gris.
- `aireacion`: genera las zonas marcadas en el grafico de linea.

## `container`

Agrupa varios widgets en una fila y los renderiza con [WidgetRendererMulti.jsx](/connect/src/components/WidgetRendererMulti.jsx).

### Estructura

```json
{
  "id": "fila-1",
  "tipo": "container",
  "charts": [
    {
      "id": "g1",
      "tipo": "gauge",
      "sensor_id": "sensor/a"
    },
    {
      "id": "w1",
      "tipo": "WeatherCard",
      "sensor_temp": "sensor/temp",
      "sensor_humedad": "sensor/hum"
    }
  ]
}
```

### Campo obligatorio

- `charts`: arreglo de widgets validos.

## 5. Resumen rapido por tipo

| Tipo | Fuente | Campos minimos |
| --- | --- | --- |
| `gauge` | tiempo real | `id`, `tipo`, `sensor_id` |
| `line` | serie/manual | `id`, `tipo`, `sensor_id` o `series` |
| `ValueCardWidget` | tiempo real | `id`, `tipo`, `sensor_id` |
| `WeatherCard` | tiempo real | `id`, `tipo`, `sensor_temp`, `sensor_humedad` |
| `SiloResumen` | tiempo real + config | `id`, `tipo`, `sensor_nivel`, `sensor_temp`, `sensor_humedad`, `sensor_fans` |
| `SiloControl` | tiempo real + config | `id`, `tipo`, sensores de nivel, humedad, temps, activo, fans, mode |
| `SiloHeatmap` | tiempo real | `id`, `tipo`, `cabos`, `niveles`, `sensor_matrix` |
| `SpatialHeatmap` | tiempo real | `id`, `tipo`, `layout` |
| `historico_cabo` | consulta historica | `id`, `tipo`, `cabos` |
| `container` | composicion | `id`, `tipo`, `charts` |

## 6. Convenciones recomendadas para tus datos

Para que todos los widgets funcionen de forma consistente, conviene que el backend siga estas reglas:

- Sensores analogicos: enviar `fields.value` numerico, o varios `fields` numericos si un mismo sensor expone varias metricas.
- Unidades: enviar `tags.unit`.
- Booleanos de estado: enviar `0` o `1`.
- Historicos: enviar siempre `timestamp` ISO y `value`.
- Historicos de silo: incluir `hay_grano` y `aireacion` cuando aplique.

## 7. Observaciones de la revision

Estas son las cosas mas importantes que vi al revisar el codigo:

- `LineChartWidget` espera `series`, pero `SensorContext` hoy no construye series en tiempo real.
- `SensorContext` ya soporta referencias tipo `sensor.fields.campo` en tiempo real.
- `SiloControlCard` soporta `timer`, `start` y `end`, pero el renderer actual no los alimenta.
- `SiloHeatmap` en tiempo real no usa `sensor_hay_grano`; solo usa presencia o ausencia de valor.
- `ValueCardWidget` fue migrate de MqttContext a SensorContext.
- `SpatialHeatmap` usa CSS Grid para mantener posiciones fijas en mobile.
- `historicoCabo` filtra datos: solo promedia temperaturas donde hay grano y excluye timestamps con aireacion activa.
- El dashboard real (dashboard.jsx) usa `SensorProvider` (HTTP polling) en lugar de MQTT.
- El container ahora asigna ancho fijo (`flex: 1 1 300px`) a cada widget para que gauges uniformes tengan el mismo tamano.

## 8. Plantilla base para crear un widget nuevo en config

```json
{
  "id": "mi-widget",
  "tipo": "WeatherCard",
  "size": "full",
  "label": "Mi widget"
}
```

Luego completas los campos propios del tipo elegido segun las secciones anteriores.
