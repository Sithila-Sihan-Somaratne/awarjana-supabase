import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import {
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Eye,
  Check,
  X,
  XCircle,
  Database,
  Key,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, completed: 0 });
  const [orders, setOrders] = useState([]);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *, 
          customer:users!customer_id(full_name, email),
          employer:users!assigned_employer_id(full_name, email),
          materials:order_materials(quantity, material:materials(name))
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // 2. Fetch Pending Drafts
      const { data: draftsData } = await supabase
        .from("drafts")
        .select(`*, order:orders(order_number, title)`)
        .eq("status", "pending");

      // 3. Fetch Employers
      const { data: usersData } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "employer");

      // 4. Fetch Registration Codes
      const { data: codesData } = await supabase.from("registration_codes").select("*");

      setOrders(ordersData || []);
      setPendingDrafts(draftsData || []);
      setEmployers(usersData || []);
      setCodes(codesData || []);

      setStats({
        total: ordersData.length,
        pending: ordersData.filter((o) => o.status === "pending").length,
        active: ordersData.filter((o) => ["assigned", "in_progress", "review"].includes(o.status)).length,
        completed: ordersData.filter((o) => o.status === "completed").length,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (actionType, details) => {
    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action_type: actionType,
        action_details: details,
      });
    } catch (e) {
      console.error("Logging failed", e);
    }
  };

  const handleAssignWorker = async (orderId, employerId) => {
    if (!employerId) return;
    try {
      await supabase.from("orders").update({ status: "assigned", assigned_employer_id: employerId }).eq("id", orderId);
      await supabase.from("job_cards").upsert(
        { order_id: orderId, employer_id: employerId, status: "assigned" },
        { onConflict: "order_id" }
      );
      await logActivity("ASSIGN_ORDER", { orderId, employerId });
      fetchData();
    } catch (err) {
      alert("Assignment failed: " + err.message);
    }
  };

  const handleApproveDraft = async (draftId, orderId) => {
    try {
      const now = new Date().toISOString();
      await supabase.from("drafts").update({ status: "approved" }).eq("id", draftId);
      await supabase.from("orders").update({ status: "completed", completed_at: now }).eq("id", orderId);
      await supabase.from("job_cards").update({ status: "completed", completed_at: now }).eq("order_id", orderId);
      await logActivity("APPROVE_DRAFT", { draftId, orderId });
      fetchData();
    } catch (err) {
      alert("Approval Error: " + err.message);
    }
  };

  const handleRejectDraft = async (draftId, orderId) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await supabase.from("drafts").update({ status: "rejected", admin_notes: reason }).eq("id", draftId);
      await supabase.from("orders").update({ status: "in_progress" }).eq("id", orderId);
      await supabase.from("job_cards").update({ status: "in_progress" }).eq("order_id", orderId);
      await logActivity("REJECT_DRAFT", { draftId, orderId, reason });
      fetchData();
    } catch (err) {
      alert("Rejection Error: " + err.message);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center dark:bg-black">
      <RefreshCw className="animate-spin text-indigo-600" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black dark:text-white uppercase italic tracking-tighter">
              Awarjana <span className="text-indigo-600 italic">Supervisor</span>
            </h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-1">Production Control Center</p>
          </div>
          <button onClick={fetchData} className="p-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-sm hover:rotate-180 transition-all duration-500">
            <RefreshCw size={20} className="dark:text-white" />
          </button>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard title="Total Orders" value={stats.total} icon={Package} color="indigo" />
          <StatCard title="New Requests" value={stats.pending} icon={Clock} color="amber" />
          <StatCard title="In Production" value={stats.active} icon={TrendingUp} color="blue" />
          <StatCard title="Ready/Done" value={stats.completed} icon={CheckCircle} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {pendingDrafts.length > 0 && (
              <section className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2.5rem] border-2 border-dashed border-amber-200 dark:border-amber-900/30">
                <h2 className="text-lg font-black uppercase text-amber-600 flex items-center gap-2 mb-6">
                  <Camera size={20} /> Proofs Awaiting Approval
                </h2>
                <div className="grid gap-4">
                  {pendingDrafts.map((draft) => (
                    <div key={draft.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                        <img src={draft.draft_url} className="w-16 h-16 rounded-xl object-cover border-2 border-amber-100" alt="Proof" />
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase">Order {draft.order?.order_number}</p>
                          <p className="font-bold dark:text-white text-sm">{draft.order?.title}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveDraft(draft.id, draft.order_id)} className="p-3 bg-green-500 text-white rounded-xl hover:bg-green-600">
                          <Check size={18} />
                        </button>
                        <button onClick={() => handleRejectDraft(draft.id, draft.order_id)} className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600">
                          <XCircle size={18} />
                        </button>
                        <a href={draft.draft_url} target="_blank" rel="noreferrer" className="p-3 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-xl">
                          <Eye size={18} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Database size={20} className="text-indigo-600" /> Production Queue
              </h2>
              <div className="space-y-4">
                {orders.filter(o => o.status !== 'completed').map((order) => (
                  <div key={order.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full uppercase">{order.order_number}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{order.status}</span>
                      </div>
                      <h3 className="font-bold dark:text-white uppercase tracking-tight">{order.title}</h3>
                      <p className="text-xs text-gray-500 font-medium">Cust: {order.customer?.full_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select value={order.assigned_employer_id || ""} onChange={(e) => handleAssignWorker(order.id, e.target.value)} className="bg-gray-50 dark:bg-gray-800 dark:text-white border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none min-w-[160px]">
                        <option value="">Assign Worker...</option>
                        {employers.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name || emp.email}</option>))}
                      </select>
                      <button onClick={() => navigate(`/orders/${order.id}`)} className="p-3 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-xl"><Eye size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="space-y-6">
             <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-sm border dark:border-gray-800">
                <h3 className="text-sm font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><Key size={16} /> Access Keys</h3>
                <div className="space-y-3">
                  {codes.map(code => (
                    <div key={code.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border dark:border-gray-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-mono font-black text-indigo-600 break-all">{code.plain_code}</p>
                        <p className="text-[9px] font-black text-gray-500 uppercase mt-1">{code.role}</p>
                      </div>
                      {code.used ? <CheckCircle size={14} className="text-green-500 shrink-0" /> : <Clock size={14} className="text-gray-300 shrink-0" />}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
  };
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-800">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}><Icon size={20} /></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black dark:text-white mt-1 tracking-tighter">{value}</p>
    </div>
  );
}