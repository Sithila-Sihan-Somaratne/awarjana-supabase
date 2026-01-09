import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Loader2, ShieldAlert, CheckCircle2, Scissors, Frame, Box } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function DocumentGenerator({ type, data: orderData, isAdmin }) {
  const componentRef = useRef();
  const [logs, setLogs] = useState([]);
  const [plannedMaterials, setPlannedMaterials] = useState([]);
  const [jobCardDetails, setJobCardDetails] = useState(null);
  const [fetching, setFetching] = useState(false);
  const isInvoice = type === "invoice";

  useEffect(() => {
    const fetchFullData = async () => {
      const targetOrderId = orderData?.id;
      if (!targetOrderId) return;

      try {
        setFetching(true);
        
        // Fetch Job Card and the Materials assigned to this order
        const [jobRes, plannedRes] = await Promise.all([
          supabase
            .from("job_cards")
            .select(`*, worker:users!job_cards_employer_id_fkey (full_name)`)
            .eq("order_id", targetOrderId)
            .maybeSingle(),
          supabase
            .from("order_materials")
            .select(`*, material:materials (name, unit, category)`)
            .eq("order_id", targetOrderId)
        ]);

        if (jobRes.data) {
          setJobCardDetails(jobRes.data);
          // Fetch actual workshop usage logs
          const { data: usageData } = await supabase
            .from("material_usage")
            .select(`*, material:materials (name, unit)`)
            .eq("job_card_id", jobRes.data.id)
            .order("created_at", { ascending: true });
          setLogs(usageData || []);
        }
        setPlannedMaterials(plannedRes.data || []);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchFullData();
  }, [orderData]);

  const handlePrint = useReactToPrint({ contentRef: componentRef });

  if (!orderData) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-800">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black uppercase text-sm tracking-tighter dark:text-white">
          {isInvoice ? "Customer Invoice" : "Production Job Card"}
        </h3>
        {isAdmin && (
          <button 
            onClick={() => handlePrint()} 
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Printer size={14} /> Print A4 Document
          </button>
        )}
      </div>

      <div className="hidden">
        <div ref={componentRef} className="p-10 text-black bg-white font-sans" style={{ width: "210mm", minHeight: "297mm" }}>
          
          {/* HEADER: Branding & Ref */}
          <div className="flex justify-between border-b-4 border-black pb-6 mb-8">
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">Awarjana Creations</h1>
              <p className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">Industrial Framing & Design</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase">Order Ref</p>
              <p className="font-black text-2xl uppercase">#{orderData.order_number}</p>
              <p className="text-[10px] font-bold">DUE: {new Date(orderData.deadline_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* CUSTOMER & ARTWORK SPECS */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400">Client / Notification</p>
                <p className="font-bold text-lg">{orderData.customer?.full_name || "Walk-in Client"}</p>
                <p className="text-xs text-gray-600 font-mono">{orderData.customer?.phone || "No Contact"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase text-gray-400">Artwork Title</p>
                <p className="font-bold text-sm uppercase italic">{orderData.title}</p>
              </div>
            </div>
            
            <div className="bg-gray-100 p-6 rounded-lg border-2 border-black text-right relative overflow-hidden">
               <div className="absolute top-0 left-0 bg-black text-white px-2 py-1 text-[8px] font-black uppercase">Internal Specs</div>
              <p className="text-[9px] font-black uppercase text-gray-400">Inside Opening (Sight Size)</p>
              <p className="font-black text-4xl tracking-tighter">{orderData.width}" x {orderData.height}"</p>
              <p className="text-[8px] font-bold uppercase mt-2 text-indigo-600 italic">Include 1/8" overlap per side</p>
            </div>
          </div>

          {/* CONTENT: Workshop Details vs Invoice Table */}
          {isInvoice ? (
            <InvoiceSection data={orderData} />
          ) : (
            <WorkshopSection jobCard={jobCardDetails} planned={plannedMaterials} logs={logs} />
          )}

          {/* FOOTER: Sign-off & QC */}
          <div className="mt-auto pt-10">
            {!isInvoice && (
               <div className="grid grid-cols-4 gap-4 mb-10">
                  {['Cut & Mitre', 'Joining', 'Fitting', 'Final QC'].map(step => (
                    <div key={step} className="border border-dashed border-gray-400 p-2 text-center rounded">
                        <div className="w-4 h-4 border border-black mx-auto mb-1"></div>
                        <p className="text-[8px] font-black uppercase">{step}</p>
                    </div>
                  ))}
               </div>
            )}
            <div className="grid grid-cols-2 gap-20">
              <div className="border-t border-black pt-2">
                <p className="text-[8px] font-black uppercase text-gray-400">Artisan/Workshop</p>
              </div>
              <div className="border-t border-black pt-2 text-right">
                <p className="text-[8px] font-black uppercase text-gray-400">Customer Pickup Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkshopSection({ jobCard, planned, logs }) {
  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1 mb-4">Moulding & Glazing Specifications</h4>
        <div className="grid grid-cols-2 gap-y-3 gap-x-12">
          {planned.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{item.material?.category}:</span>
              <span className="text-[10px] font-black uppercase">{item.material?.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1 mb-4">Material Audit Log</h4>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-left border-b font-black uppercase text-gray-400">
              <th className="py-2">Item</th>
              <th className="py-2">Estimated</th>
              <th className="py-2">Actual Used</th>
            </tr>
          </thead>
          <tbody>
            {planned.map((p) => {
              const actual = logs.filter(l => l.material_id === p.material_id).reduce((sum, curr) => sum + parseFloat(curr.quantity_used), 0);
              return (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="py-3 font-bold uppercase">{p.material?.name}</td>
                  <td className="py-3 font-mono">{p.quantity} {p.material?.unit}</td>
                  <td className={`py-3 font-mono font-black ${actual > p.quantity ? 'text-red-500' : 'text-green-600'}`}>
                    {actual} {p.material?.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceSection({ data }) {
  const total = parseFloat(data.total_amount || 0);
  return (
    <div className="mt-6">
      <table className="w-full text-left">
        <thead className="border-b-4 border-black">
          <tr className="text-[10px] font-black uppercase">
            <th className="py-4">Custom Framing Services</th>
            <th className="py-4 text-right">Net Price (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-10">
              <p className="font-bold text-xl uppercase tracking-tighter">{data.title}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">
                Custom Configuration: {data.width}" x {data.height}" Inside Dimension
              </p>
            </td>
            <td className="py-10 text-right font-mono font-black text-2xl">Rs. {total.toLocaleString()}</td>
          </tr>
          <tr className="bg-black text-white">
            <td className="py-6 px-4 font-black uppercase italic text-xl">Balance Due at Pickup</td>
            <td className="py-6 px-4 text-right font-black text-3xl font-mono">Rs. {total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-10 bg-gray-50 p-6 rounded text-[9px] text-gray-500 uppercase font-bold leading-relaxed">
        * All custom framing orders require a presentation of this invoice for collection.
        Awarjana Creations provides industrial grade conservation framing.
      </div>
    </div>
  );
}