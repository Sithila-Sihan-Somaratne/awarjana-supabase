import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import OrderTracker from '../orders/OrderTracker';
import NewOrderForm from './customer/NewOrderForm';
import Sidebar from '../common/Sidebar';
import { Package, Clock, History, DollarSign } from 'lucide-react';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('track');

  const customerTabs = [
    { id: 'track', label: 'Track Orders', icon: <Package size={20} /> },
    { id: 'new', label: 'New Order', icon: <Clock size={20} /> },
    { id: 'history', label: 'Order History', icon: <History size={20} /> },
  ];

  return (
    <div className="flex">
      <Sidebar 
        title="Customer Dashboard"
        tabs={customerTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
      />
      
      <div className="flex-1 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.email?.split('@')[0] || 'Customer'}!</h1>
          <p className="text-gray-600">Track and manage your orders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="text-blue-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Orders</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="text-green-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="text-purple-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold">$1,245</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {activeTab === 'track' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Track Your Orders</h2>
              <OrderTracker role="customer" />
            </div>
          )}
          
          {activeTab === 'new' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Place New Order</h2>
              <NewOrderForm />
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Order History</h2>
              <OrderTracker role="customer" showHistory={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;