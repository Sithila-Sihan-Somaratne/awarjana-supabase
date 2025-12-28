import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, User } from 'lucide-react';

const Sidebar = ({ title, tabs, activeTab, onTabChange, user }) => {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <div className="flex items-center text-sm text-gray-300">
          <User size={14} className="mr-2" />
          {user?.email}
        </div>
      </div>

      <nav className="mt-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center px-6 py-3 text-left transition ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <span className="mr-3">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-800">
        <button className="flex items-center text-gray-300 hover:text-white">
          <Settings size={18} className="mr-2" />
          Settings
        </button>
        <button 
          onClick={logout}
          className="flex items-center text-gray-300 hover:text-white mt-4"
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;