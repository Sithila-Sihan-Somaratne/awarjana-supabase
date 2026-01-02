// src/pages/employer/JobCardView.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Clock, Package, Send, CheckCircle, 
  AlertCircle, Play, Pause, Save, Camera, ChevronRight
} from 'lucide-react';
import Alert from '../../components/common/Alert';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function JobCardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const [framingDetails, setFramingDetails] = useState({
    frame_type: '', glass_type: '', mount_color: '', backing_type: '', notes: ''
  });

  useEffect(() => {
    fetchJobCard();
    return () => clearInterval(timerRef.current);
  }, [id]);

  const fetchJobCard = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('job_cards')
        .select(`*, order:orders(*)`)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setJobCard(data);
      setSeconds(data.total_work_time_seconds || 0);
      if (data.framing_details) setFramingDetails(data.framing_details);
      if (data.status === 'in_progress') {
        setIsActive(true);
        startTimer();
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const startTimer = () => {
    setIsActive(true);
    timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
  };

  const stopTimer = () => {
    setIsActive(false);
    clearInterval(timerRef.current);
  };

  const handleToggleTimer = async () => {
    const newStatus = isActive ? 'assigned' : 'in_progress';
    try {
      await supabase.from('job_cards').update({ 
        status: newStatus,
        total_work_time_seconds: seconds,
        started_at: !isActive ? new Date().toISOString() : jobCard.started_at
      }).eq('id', id);
      
      if (isActive) stopTimer(); else startTimer();
      setJobCard({ ...jobCard, status: newStatus });
    } catch (err) { setError(err.message); }
  };

  const handleSaveAndNext = async () => {
    try {
      setLoading(true);
      await supabase.from('job_cards').update({ 
        framing_details: framingDetails,
        total_work_time_seconds: seconds
      }).eq('id', id);
      
      // Redirect to Material Usage as the next step
      navigate(`/employer/material-usage?jobCard=${id}`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && !jobCard) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-4 font-bold uppercase text-xs">
              <ArrowLeft size={16} /> Back
            </button>
            <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">
              Job Card: {jobCard?.order?.order_number}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-3xl border dark:border-gray-800 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Elapsed</p>
              <p className="text-2xl font-mono font-black text-indigo-600 dark:text-indigo-400">{formatTime(seconds)}</p>
            </div>
            <button onClick={handleToggleTimer} className={`p-4 rounded-2xl transition-all ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
              {isActive ? <Pause size={24} /> : <Play size={24} />}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-black mb-6 uppercase tracking-tight dark:text-white">Order Specs</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dimensions</p>
                  <p className="font-bold dark:text-white">{jobCard?.order?.width}" × {jobCard?.order?.height}"</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority</p>
                  <p className="font-bold uppercase text-xs text-red-500">{jobCard?.order?.priority || 'Medium'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] border dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-black mb-8 uppercase tracking-tight dark:text-white">Step 1: Framing Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <input type="text" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white outline-none" placeholder="Frame Type" value={framingDetails.frame_type} onChange={(e) => setFramingDetails({...framingDetails, frame_type: e.target.value})} />
                <input type="text" className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white outline-none" placeholder="Glass Type" value={framingDetails.glass_type} onChange={(e) => setFramingDetails({...framingDetails, glass_type: e.target.value})} />
              </div>
              <textarea className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold dark:text-white outline-none min-h-[120px] mb-8" placeholder="Production Notes..." value={framingDetails.notes} onChange={(e) => setFramingDetails({...framingDetails, notes: e.target.value})} />
              
              <button onClick={handleSaveAndNext} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                Next: Log Materials <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
