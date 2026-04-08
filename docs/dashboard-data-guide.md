# Guia de datos para widgets de dashboard

Esta guia esta basada en la implementacion actual de:

- [WidgetRendererMulti.jsx](/d:/connect/connect/connect/src/components/WidgetRendererMulti.jsx)
- [SensorContext.jsx](/d:/connect/connect/connect/src/hooks/SensorContext.jsx)
- [GaugeWidget.jsx](/d:/connect/connect/connect/src/components/GaugeWidget.jsx)
- [LineChartWidget.jsx](/d:/connect/connect/connect/src/components/LineChartWidget.jsx)
- [WeatherCArd.jsx](/d:/connect/connect/connect/src/components/WeatherCArd.jsx)
- [Siloresumencard.jsx](/d:/connect/connect/connect/src/components/Siloresumencard.jsx)
- [Silocontrolcard.jsx](/d:/connect/connect/connect/src/components/Silocontrolcard.jsx)
- [SiloHeatmapWidget.jsx](/d:/connect/connect/connect/src/components/SiloHeatmapWidget.jsx)
- [HistoricoContainer.jsx](/d:/connect/connect/connect/src/components/HistoricoContainer.jsx)

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

Internamente se guarda como:

```js
sensorData[sensorId] = {
  value: Number(sensor.fields?.value),
  tags: sensor.tags || {},
  fields: sensor.fields || {}
}
```

Notas importantes:

- Solo se guarda `fields.value`.
- Si `fields.value` viene `null` o `undefined`, ese sensor no se actualiza.
- `useSensor(sensorId)` devuelve `value`, `unit`, `tags` y `connected`.
- `useSensors(sensorIds)` devuelve un objeto por `sensorId`.

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

Para `HistoricoContainer`, cada punto puede incluir tambien:

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
- `WeatherCard`
- `SiloResumen`
- `SiloControl`
- `SiloHeatmap`
- `historico_cabo`
- `container`

## 3. Widgets simples

## `gauge`

Renderiza [GaugeWidget.jsx](/d:/connect/connect/connect/src/components/GaugeWidget.jsx).

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

- En tiempo real solo necesita `fields.value`.
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

Renderiza [LineChartWidget.jsx](/d:/connect/connect/connect/src/components/LineChartWidget.jsx).

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

## 4. Widgets compuestos

## `WeatherCard`

Renderiza [WeatherCArd.jsx](/d:/connect/connect/connect/src/components/WeatherCArd.jsx) mediante `WeatherCardRenderer`.

### Configuracion recomendada

```json
{
  "id": "widget-weather",
  "tipo": "WeatherCard",
  "label": "Estación Meteorológica",
  "stationName": "Planta Bella Vista",
  "sensor_temp": "demo/estacion/temperatura",
  "sensor_humedad": "demo/estacion/humedad",
  "sensor_rocio": "demo/estacion/rocio"
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

Renderiza [Siloresumencard.jsx](/d:/connect/connect/connect/src/components/Siloresumencard.jsx) mediante `SiloResumenRenderer`.

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

Renderiza [Silocontrolcard.jsx](/d:/connect/connect/connect/src/components/Silocontrolcard.jsx) mediante `SiloControlRenderer`.

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
- `mode` llega desde `useSensorValue(sensor_mode)`, que siempre devuelve `value`. Como `SensorContext` convierte `fields.value` con `Number(value)`, hoy `mode` solo sirve bien si backend envia algo numerico. Si backend quisiera mandar `"auto"` o `"manual"`, se perderia.
- Igual que en `SiloResumen`, `activo` y `fans_state` se calculan como `valor > 0`.

## `SiloHeatmap`

Renderiza [SiloHeatmapWidget.jsx](/d:/connect/connect/connect/src/components/SiloHeatmapWidget.jsx) mediante `SiloHeatmapRenderer`.

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

## `historico_cabo`

Renderiza [HistoricoContainer.jsx](/d:/connect/connect/connect/src/components/HistoricoContainer.jsx).

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

Agrupa varios widgets en una fila y los renderiza con [WidgetRendererMulti.jsx](/d:/connect/connect/connect/src/components/WidgetRendererMulti.jsx).

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
| `WeatherCard` | tiempo real | `id`, `tipo`, `sensor_temp`, `sensor_humedad` |
| `SiloResumen` | tiempo real + config | `id`, `tipo`, `sensor_nivel`, `sensor_temp`, `sensor_humedad`, `sensor_fans` |
| `SiloControl` | tiempo real + config | `id`, `tipo`, sensores de nivel, humedad, temps, activo, fans, mode |
| `SiloHeatmap` | tiempo real | `id`, `tipo`, `cabos`, `niveles`, `sensor_matrix` |
| `historico_cabo` | consulta historica | `id`, `tipo`, `cabos` |
| `container` | composicion | `id`, `tipo`, `charts` |

## 6. Convenciones recomendadas para tus datos

Para que todos los widgets funcionen de forma consistente, conviene que el backend siga estas reglas:

- Sensores analogicos: enviar `fields.value` numerico.
- Unidades: enviar `tags.unit`.
- Booleanos de estado: enviar `0` o `1`.
- Historicos: enviar siempre `timestamp` ISO y `value`.
- Historicos de silo: incluir `hay_grano` y `aireacion` cuando aplique.

## 7. Observaciones de la revision

Estas son las cosas mas importantes que vi al revisar el codigo:

- `LineChartWidget` espera `series`, pero `SensorContext` hoy no construye series en tiempo real.
- `SensorContext` convierte `fields.value` con `Number(value)`, por lo que valores de texto como `"auto"` o `"manual"` no sobreviven bien.
- `SiloControlCard` soporta `timer`, `start` y `end`, pero el renderer actual no los alimenta.
- `SiloHeatmap` en tiempo real no usa `sensor_hay_grano`; solo usa presencia o ausencia de valor.

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
