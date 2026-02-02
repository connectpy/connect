import { supabase } from './supabaseClient'

const Dashboard = () => {
  const [config, setConfig] = useState(null)

  // Primero: Cargar la estructura del dashboard (el JSON)
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('empresas').select('dashboard_config').single()
      setConfig(data.dashboard_config)
    }
    loadConfig()
  }, [])

  // Segundo: Pedir datos para un widget específico
  const getWidgetData = async (widget) => {
    const { data, error } = await supabase.functions.invoke('query-influx', {
      body: { 
        bucket: widget.bucket, // Viene del JSON
        measurement: widget.medicion 
      }
    })
    console.log("Datos para el gráfico:", data)
  }

  return (
    <div>
      {config?.widgets.map(w => (
        <button key={w.id} onClick={() => getWidgetData(w)}>
          Actualizar {w.label}
        </button>
      ))}
    </div>
  )
}