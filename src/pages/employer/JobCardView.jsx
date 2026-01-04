// src/pages/employer/JobCardView.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Clock, Package, Send, CheckCircle, 
  Play, Pause, ChevronRight, Info, AlertCircle
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function JobCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1); // ERP Workflow Stepper
  
  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchJobCard();
    return () => clearInterval(timerRef.current);
  }, [id]);

  const fetchJobCard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_cards')
        .select(`*, order:orders(*)`)
        .eq('id', id).single();
      
      if (data) {
        setJobCard(data);
        // Calculate current time: saved time + (now - started_at if running)
        let initialSeconds = Math.floor((data.total_time_ms || 0) / 1000);
        
        if (data.status === 'in_progress' && !data.is_paused && data.started_at) {
          const sessionStart = new Date(data.started_at).getTime();
          const now = new Date().getTime();
          initialSeconds += Math.floor((now - sessionStart) / 1000);
          setIsTimerRunning(true);
          startLocalTimer();
        }
        setSeconds(initialSeconds);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const startLocalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const handleToggleTimer = async () => {
    const now = new Date().toISOString();
    const isStarting = !isTimerRunning;
    
    try {
      if (isStarting) {
        // CLOCK IN
        const { error } = await supabase.from('job_cards').update({ 
          is_paused: false, 
          started_at: now, 
          status: 'in_progress' 
        }).eq('id', id);
        
        if (!error) {
          setIsTimerRunning(true);
          startLocalTimer();
          await supabase.from('orders').update({ status: 'in_progress' }).eq('id', jobCard.order_id);
        }
      } else {
        // CLOCK OUT (Calculate and Save)
        clearInterval(timerRef.current);
        const elapsedMs = new Date().getTime() - new Date(jobCard.started_at).getTime();
        const totalMs = (jobCard.total_time_ms || 0) + elapsedMs;

        const { error } = await supabase.from('job_cards').update({ 
          is_paused: true, 
          total_time_ms: totalMs 
        }).eq('id', id);

        if (!error) setIsTimerRunning(false);
      }
      fetchJobCard(); // Refresh data to sync started_at
    } catch (err) { alert("Timer Error: " + err.message); }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 mb-6 font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* WORKFLOW STEPPER */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { step: 1, label: 'Time Log', icon: <Clock size={14}/> },
            { step: 2, label: 'Materials', icon: <Package size={14}/> },
            { step: 3, label: 'Proofing', icon: <Send size={14}/> }
          ].map((s) => (
            <button key={s.step} onClick={() => setActiveStep(s.step)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all ${activeStep === s.step ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-400'}`}
            >
              {s.icon}
              <span className="text-[10px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>

        {/* PHASE 1: THE ERP TIMER */}
        {activeStep === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-12 shadow-xl border dark:border-gray-800 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-6">
              <Info size={14} />
              <span className="text-[10px] font-black uppercase">Clock in to start production</span>
            </div>
            <h2 className="text-7xl font-black dark:text-white mb-10 font-mono tracking-tighter italic">
              {formatTime(seconds)}
            </h2>
            <button 
              onClick={handleToggleTimer}
              className={`flex items-center gap-4 px-12 py-6 rounded-3xl font-black uppercase tracking-widest mx-auto transition-transform active:scale-95 ${isTimerRunning ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600 hover:shadow-lg hover:shadow-green-100'}`}
            >
              {isTimerRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              {isTimerRunning ? 'Pause Session' : 'Start Session'}
            </button>
          </div>
        )}

        {/* PHASE 2: MATERIAL LOGGING GUIDE */}
        {activeStep === 2 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border dark:border-gray-800 shadow-sm">
            <div className="flex items-start gap-6 mb-8">
               <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl"><Package size={32} /></div>
               <div>
                  <h3 className="text-xl font-black dark:text-white uppercase">Log Resources</h3>
                  <p className="text-gray-500 text-sm font-bold">Record every frame and glass unit consumed for this job.</p>
               </div>
            </div>
            <button 
              onClick={() => navigate(`/employer/material-usage?jobCard=${id}`)}
              className="w-full py-6 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl font-black uppercase border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-all flex items-center justify-center gap-3"
            >
              Open Material Logger <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* PHASE 3: SUBMIT DRAFT */}
        {activeStep === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border dark:border-gray-800 shadow-sm text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-black dark:text-white uppercase mb-2">Submit Proof</h3>
            <p className="text-gray-500 text-xs font-black uppercase mb-8 tracking-widest">Upload photos of the finished frame</p>
            <button 
              onClick={() => navigate(`/employer/submit-draft/${jobCard.order_id}?jobCard=${id}`)}
              className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all"
            >
              Submit for Admin Approval
            </button>
          </div>
        )}

        {/* SPEC SIDEBAR (BOTTOM ON MOBILE) */}
        <div className="mt-8 grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dimensions</p>
              <p className="text-lg font-bold dark:text-white">{jobCard?.order?.width} x {jobCard?.order?.height}</p>
           </div>
           <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target</p>
              <p className="text-lg font-bold text-red-500 uppercase italic">{jobCard?.order?.priority}</p>
           </div>
        </div>
      </div>
    </div>
  );
}