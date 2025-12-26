import React, { useState } from 'react';
import { Users, CheckCircle, XCircle, Filter, Download } from 'lucide-react';

const AdminOrderView = ({ orders, onRefresh, onAssign }) => {
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [assignWorkerModal, setAssignWorkerModal] = useState(false);
  const [workers] = useState([
    { id: 1, name: 'John Smith', current_load: 3 },
    { id: 2, name: 'Emma Wilson', current_load: 5 },
    { id: 3, name: 'David Brown', current_load: 2 },
  ]);

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleBulkAction = (action) => {
    switch(action) {
      case 'assign':
        if (selectedOrders.length > 0) {
          setAssignWorkerModal(true);
        }
        break;
      case 'approve':
        // Bulk approve logic
        break;
      case 'reject':
        // Bulk reject logic
        break;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      draft_submitted: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Bulk Actions Toolbar */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {selectedOrders.length} order(s) selected
            </span>
            {selectedOrders.length > 0 && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleBulkAction('assign')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Assign to Worker
                </button>
                <button 
                  onClick={() => handleBulkAction('approve')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Approve Drafts
                </button>
                <button 
                  onClick={() => handleBulkAction('reject')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Reject Drafts
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border rounded-lg flex items-center">
              <Filter size={16} className="mr-1" />
              Filter
            </button>
            <button className="px-3 py-1 border rounded-lg flex items-center">
              <Download size={16} className="mr-1" />
              Export
            </button>
            <button 
              onClick={onRefresh}
              className="px-3 py-1 bg-gray-800 text-white rounded-lg"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">
                <input 
                  type="checkbox"
                  checked={selectedOrders.length === orders.length}
                  onChange={() => {
                    if (selectedOrders.length === orders.length) {
                      setSelectedOrders([]);
                    } else {
                      setSelectedOrders(orders.map(o => o.id));
                    }
                  }}
                />
              </th>
              <th className="text-left p-3">Order #</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Worker</th>
              <th className="text-left p-3">Deadline</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <input 
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => handleSelectOrder(order.id)}
                  />
                </td>
                <td className="p-3 font-medium">{order.order_number}</td>
                <td className="p-3">{order.customer?.email || 'N/A'}</td>
                <td className="p-3 font-bold">${order.total_amount}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-3">
                  {order.worker ? (
                    <span className="flex items-center">
                      <Users size={14} className="mr-1" />
                      {order.worker.name}
                    </span>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedOrders([order.id]);
                        setAssignWorkerModal(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Assign
                    </button>
                  )}
                </td>
                <td className="p-3">
                  {order.deadline ? (
                    new Date(order.deadline).toLocaleDateString()
                  ) : (
                    <span className="text-gray-400">Not set</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex space-x-2">
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      onClick={() => {/* View details */}}
                    >
                      View
                    </button>
                    {order.status === 'draft_submitted' && (
                      <>
                        <button className="text-green-600 hover:text-green-800 text-sm">
                          <CheckCircle size={16} />
                        </button>
                        <button className="text-red-600 hover:text-red-800 text-sm">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign Worker Modal */}
      {assignWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Assign to Worker</h3>
            <p className="text-gray-600 mb-4">
              Assign {selectedOrders.length} order(s) to:
            </p>
            
            <div className="space-y-3 mb-6">
              {workers.map(worker => (
                <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{worker.name}</p>
                    <p className="text-sm text-gray-500">
                      Current load: {worker.current_load} orders
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      selectedOrders.forEach(orderId => {
                        onAssign(orderId, worker.id);
                      });
                      setAssignWorkerModal(false);
                      setSelectedOrders([]);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={() => setAssignWorkerModal(false)}
                className="px-4 py-2 border rounded-lg mr-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderView;