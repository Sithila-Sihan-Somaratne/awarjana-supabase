import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Loader2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function DocumentGenerator({ type, data: orderData, isAdmin }) {
  const componentRef = useRef(null);
  const [jobCard, setJobCard] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const isInvoice = type === "invoice";

  useEffect(() => {
    const fetchFullDetails = async () => {
      if (!orderData?.id) return;
      setLoading(true);
      try {
        const [jobRes, matRes] = await Promise.all([
          supabase
            .from("job_cards")
            .select(`*, worker:users!job_cards_employer_id_fkey (full_name)`)
            .eq("order_id", orderData.id)
            .maybeSingle(),
          supabase
            .from("order_materials")
            .select(`*, material:materials (name, unit)`)
            .eq("order_id", orderData.id)
        ]);
        setJobCard(jobRes.data);
        setMaterials(matRes.data || []);
      } catch (err) {
        console.error("Error fetching document data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFullDetails();
  }, [orderData]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${isInvoice ? 'Invoice' : 'JobCard'}_${orderData?.order_number || 'Doc'}`,
  });

  if (!orderData) return null;

  const isStepDone = (status) => (orderData.status === status || orderData.status === 'completed');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-800 shadow-xl">
      {/* --- WEB UI --- */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-black uppercase text-sm tracking-tighter dark:text-white">
              {isInvoice ? "Customer Invoice" : "Production Job Card"}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Single Page A4</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handlePrint()} 
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} />} 
            Print Document
          </button>
        )}
      </div>

      {/* --- PRINTABLE AREA (A4 FIXED) --- */}
      <div className="hidden">
        <div 
          ref={componentRef} 
          className="p-10 text-black bg-white font-sans text-[11px] leading-tight flex flex-col justify-between" 
          style={{ width: "210mm", height: "297mm", boxSizing: "border-box", color: "black" }}
        >
          {/* HEADER */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
               <div className="border-[4px] border-black p-2 font-black text-4xl leading-none">ආ</div>
               <div>
                 <h1 className="text-4xl font-bold tracking-tighter leading-none mb-1">ආවර්ජනා</h1>
                 <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Creation & Studio</p>
               </div>
            </div>
            <div className="border-2 border-black w-72">
              <div className="grid grid-cols-2 border-b-2 border-black">
                <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 text-[9px] uppercase">Bill Number</div>
                <div className="p-1.5 font-mono font-bold px-2 uppercase text-[12px]">{orderData.order_number}</div>
              </div>
              <div className="grid grid-cols-2 border-b-2 border-black">
                <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 text-[9px] uppercase leading-tight">Operator</div>
                <div className="p-1.5 px-2 font-semibold truncate">{jobCard?.worker?.full_name || "................"}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 text-[9px] uppercase">Job ID</div>
                <div className="p-1.5 font-mono px-2">#{String(orderData.id).padStart(5, '0')}</div>
              </div>
            </div>
          </div>

          {/* CUSTOMER SECTION */}
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="font-bold whitespace-nowrap">Customer:</span>
              <span className="flex-1 border-b border-dotted border-black px-2 font-bold">{orderData.customer?.full_name || "...................................."}</span>
            </div>
            <div className="flex gap-6">
              <div className="flex flex-1 items-end gap-2">
                <span className="font-bold">Phone:</span>
                <span className="flex-1 border-b border-dotted border-black px-2">{orderData.customer?.phone || "................"}</span>
              </div>
              <div className="flex flex-1 items-end gap-2">
                <span className="font-bold">WhatsApp:</span>
                <span className="flex-1 border-b border-dotted border-black px-2">{orderData.customer?.phone || "................"}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold pt-1">Details:</span>
              <div className="flex-1 space-y-3">
                <div className="border-b border-dotted border-black font-bold text-[13px]">
                  {orderData.title} ({orderData.width}" x {orderData.height}")
                </div>
                <div className="border-b border-dotted border-black text-[10px] italic">
                  Materials: {materials.length > 0 ? materials.map(m => `${m.material?.name} (x${m.quantity})`).join(', ') : "None Specified"}
                </div>
              </div>
            </div>
            <div className="flex items-end gap-2 py-2">
              <span className="font-bold text-lg">Amount: Rs.</span>
              <span className="flex-1 border-b-2 border-dotted border-black font-black text-2xl tracking-tighter">
                {parseFloat(orderData.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* TIMELINE SECTION */}
          <div className="border border-black p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[9px] uppercase w-48 text-center">Handing Over Time</span>
              <span className="text-4xl font-light">{"{"}</span>
              <span className="flex-1 border-b border-black text-center font-bold mx-2">
                {new Date(orderData.created_at).toLocaleString()}
              </span>
              <span className="text-4xl font-light">{"}"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[9px] uppercase w-48 text-center">Completion Time</span>
              <span className="text-4xl font-light">{"{"}</span>
              <span className="flex-1 border-b border-black text-center font-bold mx-2 italic text-gray-400">........................</span>
              <span className="text-4xl font-light">{"}"}</span>
            </div>
          </div>

          {/* VERIFICATION CHECKLIST */}
          <div className="border border-black overflow-hidden">
            <div className="bg-gray-100 border-b border-black py-1 text-center font-black text-[9px] uppercase tracking-widest">Verification Details</div>
            <div className="p-4 space-y-4">
              {["Phone Call Given", "Whatsapp Sent", "Checked Upon Arrival"].map((label) => (
                <div key={label} className="grid grid-cols-12 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-5 h-5 border border-black flex-shrink-0 bg-white"></div>
                    <span className="font-bold text-[10px] uppercase">{label}</span>
                  </div>
                  <div className="col-span-4 flex items-end ml-4">
                    <span className="text-[9px] uppercase">Date:</span>
                    <span className="flex-1 border-b border-dotted border-black ml-1"></span>
                  </div>
                  <div className="col-span-3 flex items-end ml-4">
                    <span className="text-[9px] uppercase">Time:</span>
                    <span className="flex-1 border-b border-dotted border-black ml-1"></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center italic font-black text-[11px] uppercase py-2">
            "Design and text verified by customer before printing"
          </p>

          {/* SIGNATURES */}
          <div className="grid grid-cols-2 gap-20 px-8">
            <div className="text-center space-y-12">
               <div className="border-b border-black"></div>
               <p className="font-bold text-[9px] uppercase">Operator Signature</p>
            </div>
            <div className="text-center space-y-12">
               <div className="border-b border-black"></div>
               <p className="font-bold text-[9px] uppercase">Customer Signature</p>
            </div>
          </div>

          {/* DEADLINE */}
          <div className="border-t border-black border-dashed pt-4 space-y-2">
            <div className="flex items-end gap-2">
              <span className="font-bold">Deadline:</span>
              <span className="flex-1 border-b border-dotted border-black font-black text-indigo-700 text-[14px]">
                {orderData.deadline_date ? new Date(orderData.deadline_date).toLocaleDateString() : "................"}
              </span>
            </div>
          </div>

          {/* WORKFLOW TABLE (Forces to bottom) */}
          <div className="mt-4">
             <table className="w-full border-collapse border border-black text-center">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase">
                    <th className="border border-black p-2">Design</th>
                    <th className="border border-black p-2">Print</th>
                    <th className="border border-black p-2">Laminate</th>
                    <th className="border border-black p-2">Cutting</th>
                    <th className="border border-black p-2">Frame</th>
                    <th className="border border-black p-2">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-16">
                    <td className="border border-black text-3xl font-bold">{isStepDone('review') ? '✓' : ''}</td>
                    <td className="border border-black text-3xl font-bold">{isStepDone('completed') ? '✓' : ''}</td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                    <td className="border border-black"></td>
                  </tr>
                </tbody>
             </table>
          </div>
        </div>
      </div>
      {/* --- WEB UI PLACEHOLDER --- */}
      <div className="mt-4 p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center bg-gray-50/50">
         <Printer className="text-indigo-500 mx-auto mb-2" size={32} />
         <h4 className="font-bold">Ready to Print</h4>
         <p className="text-xs text-gray-400">This layout is optimized for a single A4 page.</p>
      </div>
    </div>
  );
}