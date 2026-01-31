import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, Edit3, X, Check, Star } from "lucide-react";

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", category: "goods", rating: 5 });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingSupplier) {
      await supabase.from("suppliers").update(formData).eq("id", editingSupplier.id);
    } else {
      await supabase.from("suppliers").insert([formData]);
    }
    setIsModalOpen(false);
    setEditingSupplier(null);
    setFormData({ name: "", email: "", phone: "", category: "goods", rating: 5 });
    fetchSuppliers();
  };

  const deleteSupplier = async (id) => {
    if (window.confirm("Delete this supplier?")) {
      await supabase.from("suppliers").delete().eq("id", id);
      fetchSuppliers();
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
        className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all"
      >
        <Plus size={16} /> Add New Supplier
      </button>

      <div className="grid gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-black dark:text-white uppercase tracking-tighter text-lg">{s.name}</h3>
              <div className="flex gap-2 items-center mt-1">
                <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded uppercase">{s.category}</span>
                <div className="flex text-amber-500"><Star size={10} fill="currentColor"/> <span className="text-[10px] ml-1 font-bold">{s.rating}/5</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingSupplier(s); setFormData(s); setIsModalOpen(true); }} className="p-3 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-xl hover:bg-indigo-500 hover:text-white transition-all"><Edit3 size={16}/></button>
              <button onClick={() => deleteSupplier(s.id)} className="p-3 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {/* Basic Modal Implementation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-950 p-8 rounded-[2.5rem] w-full max-w-md border dark:border-gray-800">
            <h2 className="text-2xl font-black uppercase dark:text-white mb-6 tracking-tighter">{editingSupplier ? 'Edit' : 'Add'} Supplier</h2>
            <div className="space-y-4">
              <input required placeholder="Supplier Name" className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Email" className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 dark:bg-gray-900 dark:text-white rounded-xl border-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="goods">Goods</option>
                <option value="services">Services</option>
              </select>
            </div>
            <div className="flex gap-3 mt-8">
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs">Save</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-xl font-black uppercase text-xs">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}