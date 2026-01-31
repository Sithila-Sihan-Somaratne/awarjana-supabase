import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Search, Mail, Phone, Shield } from "lucide-react";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      setUsers(data || []);
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search users..." 
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.map(user => (
          <div key={user.id} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div>
                <h3 className="font-bold dark:text-white uppercase tracking-tight">{user.full_name || 'Anonymous User'}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  user.role === 'admin' ? 'bg-red-100 text-red-600' : 
                  user.role === 'employer' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.role}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500 uppercase">
              <div className="flex items-center gap-2"><Mail size={14}/> {user.email}</div>
              <div className="flex items-center gap-2"><Phone size={14}/> {user.phone || 'No Phone'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}