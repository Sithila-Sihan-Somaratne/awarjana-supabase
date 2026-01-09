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

/**
 * JobCardView
 * The primary interface for workers to track production time,
 * log material usage, and submit final proofs for admin approval.
 */
export default function JobCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1); // ERP Workflow Stepper (1: Time, 2: Materials, 3: Proof)
  
  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchJobCard();
    // Cleanup timer on component unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  /**
   * Fetches Job Card details and initializes the production timer
   * based on the current database status.
   */
  const fetchJobCard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_cards')
        .select(`*, order:orders(*)`)
        .eq('id', id)
        .single();
      
      if (error) throw error;

      if (data) {
        setJobCard(data);
        
        // Calculate initial display time: saved time + (now - started_at if currently running)
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
    } catch (err) {
      console.error("Error fetching job card:", err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Starts the UI-side interval to tick the clock every second.
   */
  const startLocalTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  };

  /**
   * Handles "Clock In" and "Clock Out" logic, updating both
   * the job_cards and orders tables to maintain production status.
   */
  const handleToggleTimer = async () => {
    const now = new Date().toISOString();
    const isStarting = !isTimerRunning;
    
    try {
      if (isStarting) {
        // CLOCK IN: Update DB status to 'in_progress' and mark start time
        const { error: jcErr } = await supabase.from('job_cards').update({ 
          is_paused: false, 
          started_at: now, 
          status: 'in_progress' 
        }).eq('id', id);
        
        if (jcErr) throw jcErr;

        // Sync order status to in_progress
        await supabase.from('orders').update({ status: 'in_progress' }).eq('id', jobCard.order_id);

        setIsTimerRunning(true);
        startLocalTimer();
      } else {
        // CLOCK OUT: Calculate elapsed time and save to total_time_ms
        if (timerRef.current) clearInterval(timerRef.current);
        
        const startTime = new Date(jobCard.started_at).getTime();
        const endTime = new Date().getTime();
        const sessionElapsedMs = endTime - startTime;
        const totalMs = (jobCard.total_time_ms || 0) + sessionElapsedMs;

        const { error: jcErr } = await supabase.from('job_cards').update({ 
          is_paused: true, 
          total_time_ms: totalMs,
          started_at: null // Reset start for next session
        }).eq('id', id);

        if (jcErr) throw jcErr;
        
        setIsTimerRunning(false);
      }
      
      // Refresh to sync the latest started_at/total_time_ms from DB
      fetchJobCard();
    } catch (err) {
      alert("Timer Sync Error: " + err.message);
    }
  };

  /**
   * Formats raw seconds into a HH:MM:SS display string.
   */
  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <LoadingSpinner />;
  if (!jobCard) return <div className="p-20 text-center dark:text-white font-black uppercase">Job Card not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        
        {/* BACK NAVIGATION */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 mb-6 font-black text-[10px] uppercase tracking-widest hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* WORKFLOW STEPPER */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { step: 1, label: 'Time Log', icon: <Clock size={14}/> },
            { step: 2, label: 'Materials', icon: <Package size={14}/> },
            { step: 3, label: 'Proofing', icon: <Send size={14}/> }
          ].map((s) => (
            <button 
              key={s.step} 
              onClick={() => setActiveStep(s.step)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all duration-300 ${
                activeStep === s.step 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-400 hover:border-gray-300'
              }`}
            >
              {s.icon}
              <span className="text-[10px] font-black uppercase tracking-tighter">{s.label}</span>
            </button>
          ))}
        </div>

        {/* STEP 1: PRODUCTION TIMER */}
        {activeStep === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 md:p-12 shadow-xl border dark:border-gray-800 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-6">
              <Info size={14} />
              <span className="text-[10px] font-black uppercase">Production Tracking Active</span>
            </div>
            
            <h2 className="text-6xl md:text-8xl font-black dark:text-white mb-10 font-mono tracking-tighter italic">
              {formatTime(seconds)}
            </h2>
            
            <button 
              onClick={handleToggleTimer}
              className={`flex items-center gap-4 px-12 py-6 rounded-3xl font-black uppercase tracking-widest mx-auto transition-all active:scale-95 ${
                isTimerRunning 
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                  : 'bg-green-100 text-green-600 hover:bg-green-200 hover:shadow-lg hover:shadow-green-100/50'
              }`}
            >
              {isTimerRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              {isTimerRunning ? 'Pause Session' : 'Start Session'}
            </button>
          </div>
        )}

        {/* STEP 2: MATERIAL LOGGING GATEWAY */}
        {activeStep === 2 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border dark:border-gray-800 shadow-sm">
            <div className="flex items-start gap-6 mb-8">
               <div className="p-4 bg-orange-100 text-orange-600 rounded-2xl">
                 <Package size={32} />
               </div>
               <div>
                  <h3 className="text-xl font-black dark:text-white uppercase">Resource Inventory</h3>
                  <p className="text-gray-500 text-sm font-bold">Log used materials (Frames, Glass, Sheets) to keep ERP stock levels accurate.</p>
               </div>
            </div>
            <button 
              onClick={() => navigate(`/employer/material-usage?jobCard=${id}`)}
              className="w-full py-6 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-2xl font-black uppercase border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:bg-white dark:hover:bg-gray-900 transition-all flex items-center justify-center gap-3"
            >
              Launch Material Logger <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 3: SUBMISSION PORTAL */}
        {activeStep === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-10 border dark:border-gray-800 shadow-sm text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${jobCard.status === 'review' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white uppercase mb-2">Final Quality Check</h3>
            <p className="text-gray-500 text-xs font-black uppercase mb-8 tracking-widest">Upload high-res proofs of the finished item for review</p>
            
            <button 
              onClick={() => navigate(`/employer/submit-draft/${jobCard.order_id}?jobCard=${id}`)}
              disabled={isTimerRunning}
              className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTimerRunning ? 'Stop Timer Before Submitting' : 'Submit for Admin Approval'}
            </button>
          </div>
        )}

        {/* BOTTOM SPECIFICATION GRID */}
        <div className="mt-8 grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Title</p>
              <p className="text-sm font-black dark:text-white uppercase truncate">
                {jobCard.order?.title || 'No Title'}
              </p>
           </div>
           <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border dark:border-gray-800">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dimensions</p>
              <p className="text-lg font-bold dark:text-white">
                {jobCard.order?.width || 'N/A'} x {jobCard.order?.height || 'N/A'}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}