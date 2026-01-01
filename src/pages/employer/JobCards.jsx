import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Search, ClipboardCheck, RefreshCw } from 'lucide-react'
import OrderCard from '../../components/common/OrderCard' 

export default function JobCards() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [jobCards, setJobCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user?.id) {
      fetchJobCards()
    }
  }, [user?.id])

  const fetchJobCards = async () => {
    try {
      setLoading(true)
      // FIX: Query mejorada para traer detalles del cliente y asegurar que el filtro por employer_id sea estricto
      const { data, error } = await supabase
        .from('job_cards')
        .select(`
          *, 
          order:orders(
            *, 
            customer:users!orders_customer_id_fkey(
              profiles(full_name)
            )
          )
        `)
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobCards(data || [])
    } catch (err) {
      console.error("Error al cargar Job Cards:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (jobId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      // FIX: Registro automático de tiempos para métricas de 2026
      if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString();
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString();

      const { data: updatedJC, error } = await supabase
        .from('job_cards')
        .update(updateData)
        .eq('id', jobId)
        .select('order_id')
        .single();

      if (error) throw error;

      // FIX: Sincronización crítica con la tabla de Órdenes
      // Si la Job Card cambia, la orden debe reflejar ese estado para el Admin y el Cliente
      if (updatedJC) {
        let orderStatus = newStatus;
        // Mapeo de estados: si el trabajador termina, la orden pasa a revisión del Admin
        if (newStatus === 'completed') orderStatus = 'review';
        
        await supabase
          .from('orders')
          .update({ status: orderStatus })
          .eq('id', updatedJC.order_id);
      }

      await fetchJobCards(); // Refrescar lista
    } catch (err) {
      alert("Error al actualizar estado: " + err.message);
    }
  }

  // Filtrado en tiempo real
  const filtered = jobCards.filter(jc => {
    const term = searchTerm.toLowerCase();
    return (
      jc.order?.order_number?.toLowerCase().includes(term) ||
      jc.order?.title?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:scale-105 transition-transform"
          >
            <ArrowLeft size={20} className="dark:text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter dark:text-white">Mis Tareas</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Panel de Producción 2026</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por Nº de orden o título..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-none bg-white dark:bg-gray-800 shadow-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.length > 0 ? (
          filtered.map(jc => (
            <div key={jc.id} className="group transition-all hover:-translate-y-1">
              <OrderCard 
                jobCardId={jc.id}
                order={jc.order}
                status={jc.status} 
                userRole="employer"
                onAction={handleAction}
                onView={(order) => navigate(`/orders/${order.id}`)}
              />
              <div className="mt-3 px-2 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase">
                  Asignado: {new Date(jc.created_at).toLocaleDateString()}
                </span>
                {jc.status === 'in_progress' && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-500 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> EN CURSO
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-24 bg-white dark:bg-gray-800 rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-gray-700">
             <ClipboardCheck className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={64} />
             <p className="text-gray-400 font-bold uppercase tracking-widest">No tienes trabajos asignados hoy</p>
          </div>
        )}
      </main>
    </div>
  )
}