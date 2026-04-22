# Dashboard — Guía de configuración

Esta guía explica cómo definir la configuración del dashboard. Cada dashboard se describe con un objeto JavaScript/JSON que define pestañas, y dentro de cada pestaña, widgets.

---

## Estructura general

```js
const CONFIG = {
  client_id: 'mi_empresa',   // identificador del cliente (usado en la API)
  api_base:  'https://nodered.connectparaguay.com', // URL base del backend

  tabs: [
    {
      id:   'resumen',        // identificador único de la pestaña
      name: 'Resumen',        // texto visible en el menú lateral
      icon: 'activity',       // icono: 'activity' | 'bar-chart' | 'settings'
      widgets: [ /* ... */ ], // array de widgets
    },
  ],
};
```

---

## Sensor IDs

Los `sensor_id` siguen el patrón:

```
<client_id>/<medicion>.fields.<campo>
```

Ejemplos:
| sensor_id | Descripción |
|---|---|
| `demo/estacion.fields.temperatura` | Campo `temperatura` del sensor `estacion` |
| `demo/silo1.fields.fan` | Campo `fan` del sensor `silo1` |
| `demo/T/S0/C0/T3.fields.temperatura` | Temperatura en silo 0, cabo 0, nivel 3 |

Para widgets en **tiempo real**, el `sensor_id` completo (con `.fields.<campo>`) se usa para leer un campo específico del sensor.

Para widgets **históricos**, el `sensorId` es solo la parte antes de `.fields.` (ej: `demo/T/S0/C0/T3`), y el campo se especifica con la prop `fields`.

---

## Widgets de Tiempo Real

Estos widgets se actualizan automáticamente cada 5 segundos via polling.

---

### `WeatherCard` — Tarjeta meteorológica

Muestra temperatura, humedad y punto de rocío.

```js
{
  id:    'widget-clima',
  tipo:  'WeatherCard',
  size:  'full',             // 'full' | 'half'
  label: 'Estación',         // título de la tarjeta en el dashboard

  stationName:    'Planta Norte',           // nombre visible en la card
  sensor_temp:    'demo/estacion.fields.temperatura',
  sensor_humedad: 'demo/estacion.fields.humedad',
  sensor_rocio:   'demo/estacion.fields.rocio',
}
```

---

### `SiloResumen` — Tarjeta resumen de silo

Muestra nivel, temperatura, humedad y estado del ventilador de un silo.

```js
{
  id:      'silo1-resumen',
  tipo:    'SiloResumen',
  size:    'half',
  label:   'Silo 1',

  siloName:       'SILO CENTRAL N° 1',      // nombre en la card
  grano:          'SOJA',                   // texto estático
  fecha:          '15/03/2026',             // texto estático

  sensor_nivel:   'demo/silo1.fields.nivel',
  sensor_temp:    'demo/silo1.fields.temperaturaMedia',
  sensor_humedad: 'demo/silo1.fields.humedad',
  sensor_fans:    'demo/silo1.fields.fan',
}
```

---

### `SiloControl` — Panel de control de aireación

Muestra y permite monitorear el sistema de aireación del silo.

```js
{
  id:      'silo1-control',
  tipo:    'SiloControl',
  size:    'full',
  label:   'Control de Aireación — Silo 1',

  siloName: 'Silo Nro. 1',
  grano:    'SOJA',

  nivel:     'demo/silo1.fields.nivel',
  hum_grano: 'demo/silo1.fields.humedad',
  temp_max:  'demo/silo1.fields.temperaturaMaxima',
  temp_avg:  'demo/silo1.fields.temperaturaMedia',
  temp_min:  'demo/silo1.fields.temperaturaMinima',
  activo:    'demo/silo1.fields.connected',
  fans:      'demo/silo1.fields.fan',
  mode:      'demo/silo1.fields.fanMode',
  timer:     'demo/silo1.fields.fanTimer',
  start:     'demo/silo1.fields.fanTimerStart',
  end:       'demo/silo1.fields.fanTimerEnd',
}
```

---

### `SiloHeatmap` — Termometría en tiempo real

Muestra una grilla de calor con las temperaturas de todos los sensores del silo.

```js
{
  id:    'silo1-heatmap',
  tipo:  'SiloHeatmap',
  size:  'full',
  label: 'Termometría — Silo 1',

  cabos:   ['Cabo 1', 'Cabo 2', 'Cabo 3'],  // etiquetas columnas (X)
  niveles: ['1', '2', '3', '4', '5', '6'],  // etiquetas filas (Y)

  temp_min: 15,
  temp_max: 40,

  // Matriz [cabo][nivel] con el sensor_id de temperatura
  sensor_matrix: [
    ['demo/T/S0/C0/T0.fields.temperatura', 'demo/T/S0/C0/T1.fields.temperatura', /* ... */],
    ['demo/T/S0/C1/T0.fields.temperatura', /* ... */],
  ],

  // Matriz [cabo][nivel] con el sensor_id de hayGrano (1 = mostrar, 0 = ocultar)
  sensor_hay_grano_matrix: [
    ['demo/T/S0/C0/T0.fields.hayGrano', /* ... */],
    ['demo/T/S0/C1/T0.fields.hayGrano', /* ... */],
  ],
}
```

---

### `gauge` — Medidor circular

```js
{
  id:        'gauge-presion',
  tipo:      'gauge',
  size:      'half',
  label:     'Presión',
  sensor_id: 'demo/bomba.fields.presion',
  min:       0,
  max:       100,
  thresholds: [
    { value: 60,  color: '#22c55e' },
    { value: 80,  color: '#f59e0b' },
    { value: 100, color: '#ef4444' },
  ],
}
```

---

### `line` — Gráfico de línea en tiempo real

```js
{
  id:        'line-temp',
  tipo:      'line',
  size:      'half',
  label:     'Temperatura',
  sensor_id: 'demo/estacion.fields.temperatura',
  color:     '#06b6d4',
  showArea:  true,
  timeRange: 60,             // minutos de historia a mostrar
}
```

---

## Widgets Históricos

Los widgets históricos se agrupan dentro de un contenedor de tipo `historico`. Este contenedor provee los controles de fecha, ventana y función de agregación, y un botón **Consultar** que dispara la petición al backend.

```js
{
  id:   'historico-silo1',
  tipo: 'historico',         // tipo contenedor — OBLIGATORIO
  size: 'full',
  label: 'Histórico — Silo 1',

  // Valores iniciales de los controles (opcionales)
  defaultFromDays: 7,        // días hacia atrás desde hoy  (default: 7)
  defaultWindow:   '1h',     // ventana de agregación       (default: '1h')
  defaultFn:       'mean',   // función: 'mean'|'max'|'min'|'last' (default: 'mean')

  charts: [
    /* uno o más gráficos históricos — ver tipos abajo */
  ],
}
```

> **Nota:** el backend recibe una sola petición con **todos** los `sensorIds` y **todos** los `fields` requeridos por los gráficos hijos. Los gráficos se registran automáticamente al montarse.

---

### Tipos de gráficos históricos

#### `LineChartHistorico` / `line` — Línea simple

Gráfico de línea para un único sensor y un campo numérico.

```js
{
  id:          'chart-temp-media',
  tipo:        'LineChartHistorico',  // o 'line'
  sensorIds:   ['demo/T/S0/C0/T3'],  // un sensor
  fields:      'temperatura',         // campo a graficar
  label:       'Temperatura Media',   // título del gráfico
  sensorLabel: 'Cabo 1 — Nivel 3',   // nombre en el tooltip
  unit:        '°C',
  color:       '#06b6d4',
  showArea:    true,
}
```

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `sensorIds` | `string \| string[]` | — | ID del sensor (sin `.fields.*`) |
| `fields` | `string` | `'value'` | Campo numérico a graficar |
| `label` | `string` | `'Gráfico'` | Título del gráfico |
| `sensorLabel` | `string` | igual a `label` | Nombre en el tooltip |
| `unit` | `string` | `'°C'` | Unidad |
| `color` | `string` | `'#06b6d4'` | Color de la línea |
| `showArea` | `boolean` | `true` | Área bajo la curva |

---

#### `HeatmapHistorico` / `heatmap` — Mapa de calor histórico

Heatmap con tiempo en X, sensores en Y y valor como color. Ideal para termometría multi-cabo.

```js
{
  id:        'chart-heat-cabos',
  tipo:      'HeatmapHistorico',  // o 'heatmap'
  sensorIds: [
    'demo/T/S0/C0/T3',
    'demo/T/S0/C1/T3',
    'demo/T/S0/C2/T3',
  ],
  labels:  ['Cabo 1', 'Cabo 2', 'Cabo 3'],  // etiqueta por fila (mismo orden)
  fields:  'temperatura',
  label:   'Termometría Histórica — Nivel 3',
  unit:    '°C',
  min:     15,
  max:     40,
  colorFrom: '#0ea5e9',  // color mínimo del gradiente
  colorTo:   '#ef4444',  // color máximo del gradiente
}
```

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `sensorIds` | `string \| string[]` | — | Uno por fila del heatmap |
| `labels` | `string[]` | `['Sensor 1', ...]` | Etiquetas del eje Y |
| `fields` | `string` | `'value'` | Campo numérico a visualizar |
| `label` | `string` | `'Heatmap'` | Título del gráfico |
| `unit` | `string` | `''` | Unidad |
| `min` | `number` | `0` | Mínimo de la escala de color |
| `max` | `number` | `100` | Máximo de la escala de color |
| `colorFrom` | `string` | `'#0ea5e9'` | Color para valores bajos |
| `colorTo` | `string` | `'#ef4444'` | Color para valores altos |

---

#### `LineAreaHistorico` / `lineArea` — Línea con área(s) sombreada(s) condicional(es)

Línea de temperatura con zonas sombreadas que se activan cuando un campo booleano es `1`. Soporta **una o varias áreas simultáneas**, cada una con su propio color y etiqueta.

**Modo simple — una sola área (`fieldBool`):**

```js
{
  id:          'chart-temp-fan',
  tipo:        'LineAreaHistorico',  // o 'lineArea'
  sensorIds:   ['demo/silo1'],
  fieldTemp:   'temperatura',        // campo numérico → dibuja la línea
  fieldBool:   'fan',                // campo 0/1 → activa el sombreado
  label:       'Temperatura con ventilación',
  sensorLabel: 'Silo 1',
  unit:        '°C',
  color:       '#06b6d4',            // color de la línea
  areaColor:   '#f59e0b',            // color del sombreado
  areaLabel:   'Ventilador activo',  // texto en la leyenda y tooltip
}
```

**Modo múltiple — varias áreas con distintos colores (`areas`):**

```js
{
  id:          'chart-temp-condiciones',
  tipo:        'LineAreaHistorico',
  sensorIds:   ['demo/silo1'],
  fieldTemp:   'temperatura',
  label:       'Temperatura — condiciones operativas',
  sensorLabel: 'Silo 1',
  unit:        '°C',
  color:       '#06b6d4',
  areas: [
    { field: 'fan',      color: '#f59e0b', label: 'Ventilador activo' },
    { field: 'hayGrano', color: '#10b981', label: 'Hay grano'         },
    { field: 'alarma',   color: '#ef4444', label: 'Alarma activa'     },
  ],
}
```

> Si se provee `areas`, tiene prioridad sobre `fieldBool/areaColor/areaLabel`.  
> Cada área genera su propia franja sombreada independiente y aparece en la leyenda del gráfico.

| Prop | Tipo | Default | Descripción |
|---|---|---|---|
| `sensorIds` | `string \| string[]` | — | ID del sensor |
| `fieldTemp` | `string` | `'temperatura'` | Campo numérico para la línea |
| `areas` | `{field, color, label}[]` | — | **Múltiples áreas** — tiene prioridad si se define |
| `fieldBool` | `string` | `'activo'` | Campo 0/1 — modo simple (una sola área) |
| `areaColor` | `string` | `'#f59e0b'` | Color del sombreado — modo simple |
| `areaLabel` | `string` | `'Activo'` | Texto en leyenda y tooltip — modo simple |
| `label` | `string` | `'Gráfico'` | Título del gráfico |
| `sensorLabel` | `string` | igual a `label` | Nombre en el tooltip |
| `unit` | `string` | `'°C'` | Unidad |
| `color` | `string` | `'#06b6d4'` | Color de la línea |


---

## Ejemplo completo — pestaña con histórico mixto

```js
{
  id:   'historico',
  name: 'Histórico',
  icon: 'bar-chart',
  widgets: [
    {
      id:              'historico-silo1',
      tipo:            'historico',
      size:            'full',
      label:           'Análisis Histórico — Silo 1',
      defaultFromDays: 7,
      defaultWindow:   '1h',
      defaultFn:       'mean',
      charts: [
        // Heatmap de 3 cabos en el nivel 3
        {
          id:        'heat-nivel3',
          tipo:      'HeatmapHistorico',
          sensorIds: ['demo/T/S0/C0/T3', 'demo/T/S0/C1/T3', 'demo/T/S0/C2/T3'],
          labels:    ['Cabo 1', 'Cabo 2', 'Cabo 3'],
          fields:    'temperatura',
          label:     'Termometría — Nivel 3',
          unit:      '°C',
          min:       15,
          max:       40,
        },

        // Temperatura media con períodos de ventilación sombreados
        {
          id:          'temp-fan',
          tipo:        'LineAreaHistorico',
          sensorIds:   ['demo/silo1'],
          fieldTemp:   'temperaturaMedia',
          fieldBool:   'fan',
          label:       'Temperatura Media + Ventilación',
          sensorLabel: 'Silo 1',
          unit:        '°C',
          color:       '#06b6d4',
          areaColor:   '#f59e0b',
          areaLabel:   'Ventilador activo',
        },

        // Temperatura de un punto específico
        {
          id:          'temp-cabo1-nivel3',
          tipo:        'LineChartHistorico',
          sensorIds:   ['demo/T/S0/C0/T3'],
          fields:      'temperatura',
          label:       'Temperatura Cabo 1 — Nivel 3',
          sensorLabel: 'Cabo 1, Nivel 3',
          unit:        '°C',
          color:       '#10b981',
        },
      ],
    },
  ],
}
```

---

## Referencia rápida de tipos

| `tipo` | Datos | Uso |
|---|---|---|
| `WeatherCard` | Tiempo real | Temperatura, humedad, rocío de una estación |
| `SiloResumen` | Tiempo real | Resumen compacto de un silo |
| `SiloControl` | Tiempo real | Panel de control de aireación |
| `SiloHeatmap` | Tiempo real | Termometría completa del silo |
| `gauge` | Tiempo real | Medidor circular para un campo |
| `line` | Tiempo real | Gráfico de línea para un campo |
| `historico` | **Contenedor** | Agrupa gráficos históricos con controles de fecha |
| `LineChartHistorico` / `line` | Histórico | Línea simple (un sensor, un campo) |
| `HeatmapHistorico` / `heatmap` | Histórico | Heatmap temporal multi-sensor |
| `LineAreaHistorico` / `lineArea` | Histórico | Línea + área sombreada por campo booleano |

---

## Propiedades comunes a todos los widgets

| Prop | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único del widget en la pestaña |
| `tipo` | `string` | Tipo del widget (ver tabla anterior) |
| `size` | `'full' \| 'half'` | Ancho: `'full'` = 100%, `'half'` = 50% |
| `label` | `string` | Texto del encabezado de la tarjeta en el dashboard |

---

## Ventanas de agregación disponibles (histórico)

| Valor | Descripción |
|---|---|
| `'1h'` | 1 hora |
| `'12h'` | 12 horas |
| `'1d'` | 1 día |
| `'7d'` | 7 días |

## Funciones de agregación disponibles (histórico)

| Valor | Descripción |
|---|---|
| `'mean'` | Promedio |
| `'max'` | Máximo |
| `'min'` | Mínimo |
| `'last'` | Último valor del período |
