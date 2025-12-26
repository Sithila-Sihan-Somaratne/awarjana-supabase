import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import OrderTracker from '../orders/OrderTracker';
import InventoryManagement from './admin/InventoryManagement';
import RegistrationCodes from './admin/RegistrationCodes';
import AnalyticsReports from './admin/AnalyticsReports';
import Sidebar from '../common/Sidebar';
import { 
  BarChart3, 
  Package, 
  Users, 
  Settings,
  AlertCircle,
  FileText,
  Key 
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  const adminTabs = [
    { id: 'orders', label: 'Order Management', icon: <Package size={20} /> },
    { id: 'inventory', label: 'Inventory', icon: <BarChart3 size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <FileText size={20} /> },
    { id: 'workers', label: 'Worker Assign', icon: <Users size={20} /> },
    { id: 'codes', label: 'Registration Codes', icon: <Key size={20} /> },
    { id: 'alerts', label: 'System Alerts', icon: <AlertCircle size={20} /> },
  ];

  const [lowStockAlerts] = useState([
    { id: 1, material: 'Oak Wood', current: 12, threshold: 20 },
    { id: 2, material: '3mm Glass', current: 8, threshold: 15 },
  ]);

  return (
    <div className="flex">
      <Sidebar 
        title="Admin Dashboard"
        tabs={adminTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
      />
      
      <div className="flex-1 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration Panel</h1>
              <p className="text-gray-600">Manage orders, inventory, and system settings</p>
            </div>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Generate Report
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="text-red-500 mr-2" />
              <span className="font-semibold text-red-700">Low Stock Alerts</span>
            </div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockAlerts.map(alert => (
                <div key={alert.id} className="text-sm text-red-600">
                  {alert.material}: {alert.current} units (below {alert.threshold})
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Today's Orders</h3>
            <p className="text-3xl font-bold">24</p>
            <p className="text-sm text-green-600">↑ 12% from yesterday</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Active Workers</h3>
            <p className="text-3xl font-bold">8</p>
            <p className="text-sm text-gray-500">2 on break</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-2">Pending Approval</h3>
            <p className="text-3xl font-bold">5</p>
            <p className="text-sm text-orange-600">Requires attention</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {activeTab === 'orders' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Order Management</h2>
                  <div className="flex space-x-2">
                    <select className="border rounded-lg px-3 py-1">
                      <option>Filter by Status</option>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                    <button className="px-4 py-1 bg-blue-600 text-white rounded-lg">
                      Assign Orders
                    </button>
                  </div>
                </div>
                <OrderTracker role="admin" />
              </>
            )}
            
            {activeTab === 'inventory' && <InventoryManagement />}
            {activeTab === 'analytics' && <AnalyticsReports />}
            {activeTab === 'workers' && <WorkerAssignment />}
            {activeTab === 'codes' && <RegistrationCodes />}
            {activeTab === 'alerts' && <SystemAlerts />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;