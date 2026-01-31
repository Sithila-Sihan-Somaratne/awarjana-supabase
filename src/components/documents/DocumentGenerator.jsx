// src/components/documents/DocumentGenerator.jsx
import React, { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Loader2, FileText, CheckCircle2 } from "lucide-react";
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
            .select(`*, worker:users!assigned_employer_id (full_name)`)
            .eq("order_id", orderData.id)
            .maybeSingle(),
          supabase
            .from("order_materials")
            .select(`*, material:materials (name, unit)`)
            .eq("order_id", orderData.id),
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
    documentTitle: `${isInvoice ? "Invoice" : "JobCard"}_${orderData?.order_number || "Doc"}`,
  });

  if (!orderData) return null;

  const isStepDone = (status) => orderData.status === status || orderData.status === "completed";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border dark:border-gray-800 shadow-xl">
      {/* --- WEB UI CONTROLS --- */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${isInvoice ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
            <FileText size={24} />
          </div>
          <div>
            <h3 className="font-black uppercase text-sm tracking-tighter dark:text-white">
              {isInvoice ? "Customer Invoice / Bill" : "Production Job Card"}
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">A4 Print Ready</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => handlePrint()}
            className={`${
              isInvoice ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg`}
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} />}
            Print {isInvoice ? "Invoice" : "Job Card"}
          </button>
        )}
      </div>

      {/* --- PRINTABLE AREA (A4 FIXED) --- */}
      <div className="hidden">
        <div
          ref={componentRef}
          className="p-10 text-black bg-white font-sans text-[12px] leading-relaxed flex flex-col"
          style={{ width: "210mm", height: "297mm", boxSizing: "border-box", color: "black" }}
        >
          {isInvoice ? (
            <InvoiceView orderData={orderData} />
          ) : (
            <JobCardView 
              orderData={orderData} 
              jobCard={jobCard} 
              isStepDone={isStepDone} 
            />
          )}
        </div>
      </div>

      {/* --- WEB UI PREVIEW PLACEHOLDER --- */}
      <div className="mt-4 p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center bg-gray-50/50 dark:bg-gray-900/50">
        {isInvoice ? (
          <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
        ) : (
          <Printer className="text-indigo-500 mx-auto mb-2" size={32} />
        )}
        <h4 className="font-black uppercase dark:text-white">
          {isInvoice ? "Billing Mode" : "Production Mode"}
        </h4>
        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">
          Click the print button to generate the A4 document
        </p>
      </div>
    </div>
  );
}

/* ==========================================
   COMPONENT: JOB CARD VIEW (REWRITTEN)
   ========================================== */
function JobCardView({ orderData, jobCard }) {
  const today = new Date().toLocaleDateString();

  return (
    <div className="h-full flex flex-col">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className="border-[5px] border-black p-3 font-black text-5xl leading-none">ආ</div>
          <div>
            <h1 className="text-5xl font-bold tracking-tighter leading-none mb-1">ආවර්ජනා</h1>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-600">Creation & Studio</p>
            <p className="text-[12px] font-black uppercase mt-1">Production Job Card</p>
          </div>
        </div>

        {/* TOP RIGHT BOX */}
        <div className="border-2 border-black w-72 text-[11px]">
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 uppercase">Bill Number:</div>
            <div className="p-1.5 font-bold uppercase">INV-{orderData.order_number}</div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 uppercase">Operator:</div>
            <div className="p-1.5 font-bold uppercase truncate">{jobCard?.worker?.full_name || "..................."}</div>
          </div>
          <div className="grid grid-cols-2 border-b-2 border-black">
            <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 uppercase">Date:</div>
            <div className="p-1.5 font-bold">{today}</div>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-1.5 border-r-2 border-black font-bold bg-gray-50 uppercase">Job Number:</div>
            <div className="p-1.5 font-mono font-bold">{orderData.order_number}</div>
          </div>
        </div>
      </div>

      {/* CUSTOMER DETAILS */}
      <div className="space-y-4 mb-8 text-[13px]">
        <div className="flex items-end">
          <span className="font-bold whitespace-nowrap uppercase">Customer Name:</span>
          <span className="flex-1 border-b border-dotted border-black ml-2 pb-1 font-bold uppercase">
            {orderData.customer?.full_name}
          </span>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 flex items-end">
            <span className="font-bold whitespace-nowrap uppercase">Telephone Number:</span>
            <span className="flex-1 border-b border-dotted border-black ml-2 pb-1 font-bold">
               {orderData.customer?.phone || "..........................."}
            </span>
          </div>
          <div className="flex-1 flex items-end">
            <span className="font-bold whitespace-nowrap uppercase">Whatsapp:</span>
            <span className="flex-1 border-b border-dotted border-black ml-2 pb-1 font-bold">
               ...........................
            </span>
          </div>
        </div>

        <div className="flex items-end">
          <span className="font-bold whitespace-nowrap uppercase">Email Address:</span>
          <span className="flex-1 border-b border-dotted border-black ml-2 pb-1 font-bold">
            {orderData.customer?.email || "............................................................"}
          </span>
        </div>

        <div className="flex items-start">
          <span className="font-bold whitespace-nowrap uppercase mt-1">Description:</span>
          <span className="flex-1 border-b border-dotted border-black ml-2 pb-1 min-h-[40px] font-bold">
            {orderData.title} - {orderData.width}" x {orderData.height}"
          </span>
        </div>

        <div className="flex items-end">
          <span className="font-bold whitespace-nowrap uppercase">Amount (Rs.):</span>
          <span className="w-64 border-b border-dotted border-black ml-2 pb-1 font-black text-lg">
            {parseFloat(orderData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* JOB TIMELINE */}
      <div className="mb-8 p-4 border-2 border-black rounded-xl">
        <h3 className="font-black uppercase text-[11px] mb-3 underline">Job Timeline</h3>
        <div className="space-y-3">
          <p className="font-bold uppercase">Date and Time of Handing Over the Project: <span className="ml-2">{"{ " + new Date(orderData.created_at).toLocaleString() + " }"}</span></p>
          <p className="font-bold uppercase">Date and Time of Completing the Project: <span className="ml-2">{"{ .................................................. }"}</span></p>
        </div>
      </div>

      {/* NOTIFICATION DETAILS */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className="flex items-center gap-6 font-bold uppercase">
          <span className="w-48">Phone Call Given: [ ]</span>
          <span>Date: ...............</span>
          <span>Time: ...............</span>
        </div>
        <div className="flex items-center gap-6 font-bold uppercase">
          <span className="w-48">Whatsapp/Email Sent: [ ]</span>
          <span>Date: ...............</span>
          <span>Time: ...............</span>
        </div>
        <div className="flex items-center gap-6 font-bold uppercase">
          <span className="w-48">Checked Upon Arrival: [ ]</span>
          <span>Date: ...............</span>
          <span>Time: ...............</span>
        </div>
      </div>

      {/* APPROVAL AND SIGNATURE */}
      <div className="mt-4 mb-8">
        <p className="font-black italic mb-6">"Permission was given to print after checking the design and the text."</p>
        <div className="flex justify-between items-end">
          <div className="font-bold">Date: ...........................</div>
          <div className="text-center">
            <div className="w-64 border-b border-black mb-1"></div>
            <p className="text-[10px] font-bold uppercase">Signature</p>
          </div>
        </div>
        <div className="mt-8 flex items-end">
           <span className="font-bold uppercase">Computer Operator's Signature:</span>
           <span className="flex-1 border-b border-dotted border-black ml-2"></span>
        </div>
      </div>

      {/* DELIVERY INFO */}
      <div className="border-2 border-black p-4 mb-8 bg-gray-50">
        <div className="grid grid-cols-2 gap-8">
          <p className="font-bold uppercase text-[10px]">Date item should be given to customer: <span className="block text-sm mt-1">{orderData.deadline_date || "................"}</span></p>
          <p className="font-bold uppercase text-[10px]">Date it was given: <span className="block text-sm mt-1">................</span></p>
        </div>
      </div>

      {/* WORKFLOW CHECKLIST TABLE */}
      <div className="mt-auto">
        <table className="w-full border-collapse border-2 border-black text-center">
          <thead>
            <tr className="bg-black text-white text-[11px] font-black uppercase tracking-widest">
              <th className="border-2 border-black p-3">Design</th>
              <th className="border-2 border-black p-3">Printout</th>
              <th className="border-2 border-black p-3">Laminate</th>
              <th className="border-2 border-black p-3">Cutting</th>
              <th className="border-2 border-black p-3">Frame</th>
              <th className="border-2 border-black p-3">Photograph</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-16">
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
              <td className="border-2 border-black"></td>
            </tr>
          </tbody>
        </table>
        <div className="text-[9px] font-bold uppercase text-right mt-2 italic">Awarjana Production Tracking System v2.0</div>
      </div>
    </div>
  );
}

/* ==========================================
   COMPONENT: INVOICE VIEW
   ========================================== */
function InvoiceView({ orderData }) {
  return (
    <>
      <div className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter leading-none mb-2">BILL</h1>
          <p className="font-mono text-lg font-bold">INV-{orderData.order_number}</p>
        </div>
        <div className="text-right">
          <div className="border-[4px] border-black p-2 font-black text-3xl inline-block leading-none mb-2">ආ</div>
          <h2 className="text-2xl font-bold tracking-tighter">ආවර්ජනා</h2>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Creation & Studio</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-12">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Customer Details</p>
          <h3 className="text-xl font-black uppercase">{orderData.customer?.full_name}</h3>
          <p className="font-bold">{orderData.customer?.phone}</p>
          <p className="text-gray-600 italic">Order Date: {new Date(orderData.created_at).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Payment Status</p>
          <div className="text-2xl font-black text-emerald-600 border-2 border-emerald-600 px-4 py-1 inline-block rounded-lg uppercase">
            Paid
          </div>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-4 border-black text-left text-[10px] font-black uppercase">
            <th className="py-4">Item Description</th>
            <th className="py-4 text-center">Size</th>
            <th className="py-4 text-right">Total (LKR)</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          <tr className="border-b-2 border-gray-100">
            <td className="py-6">
               <p className="font-black text-lg uppercase">{orderData.title}</p>
               <p className="text-gray-500 text-xs italic">Custom Production Order</p>
            </td>
            <td className="py-6 text-center font-bold">
              {orderData.width}" x {orderData.height}"
            </td>
            <td className="py-6 text-right font-black text-xl">
              {parseFloat(orderData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto">
        <div className="flex justify-end mb-10">
           <div className="w-72 bg-gray-50 p-6 border-l-8 border-black">
              <p className="text-[10px] font-black uppercase mb-1">Grand Total</p>
              <p className="text-4xl font-black tracking-tighter">
                Rs. {parseFloat(orderData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
           </div>
        </div>

        <div className="border-t-2 border-black pt-6 flex justify-between items-start">
           <div className="max-w-xs">
              <p className="text-[9px] font-bold uppercase mb-2">Terms & Conditions</p>
              <p className="text-[8px] leading-tight text-gray-500 italic">
                This is a computer generated bill. Goods received in good condition. 
                Custom design products are non-refundable once production starts.
              </p>
           </div>
           <div className="text-center">
              <div className="w-48 border-b border-black mb-1"></div>
              <p className="text-[9px] font-black uppercase">Authorized Signature</p>
           </div>
        </div>
      </div>
    </>
  );
}