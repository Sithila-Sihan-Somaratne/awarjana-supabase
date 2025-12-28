import React, { useState } from 'react';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';

const CustomerOrderView = ({ orders, onPlaceOrder }) => {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({
    dimensions: { width: '', height: '', depth: '' },
    material: 'oak',
    quantity: 1
  });

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="text-green-500" size={20} />;
      case 'in_progress': return <Clock className="text-blue-500" size={20} />;
      case 'pending': return <Clock className="text-yellow-500" size={20} />;
      default: return <Package className="text-gray-500" size={20} />;
    }
  };

  const calculateCost = () => {
    const materialPrices = { oak: 50, pine: 30, glass: 80 };
    const basePrice = materialPrices[newOrder.material] || 50;
    const volume = (newOrder.dimensions.width || 0) * 
                   (newOrder.dimensions.height || 0) * 
                   (newOrder.dimensions.depth || 0);
    return (basePrice * volume * newOrder.quantity).toFixed(2);
  };

  return (
    <div>
      <div className="mb-6">
        <button 
          onClick={() => setShowNewOrder(!showNewOrder)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showNewOrder ? 'Cancel' : 'Place New Order'}
        </button>

        {showNewOrder && (
          <div className="mt-4 bg-gray-50 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">New Order Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Width (cm)</label>
                <input 
                  type="number"
                  value={newOrder.dimensions.width}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    dimensions: { ...newOrder.dimensions, width: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Height (cm)</label>
                <input 
                  type="number"
                  value={newOrder.dimensions.height}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    dimensions: { ...newOrder.dimensions, height: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Depth (cm)</label>
                <input 
                  type="number"
                  value={newOrder.dimensions.depth}
                  onChange={(e) => setNewOrder({
                    ...newOrder,
                    dimensions: { ...newOrder.dimensions, depth: e.target.value }
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Material</label>
                <select 
                  value={newOrder.material}
                  onChange={(e) => setNewOrder({ ...newOrder, material: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="oak">Oak Wood ($50/m³)</option>
                  <option value="pine">Pine Wood ($30/m³)</option>
                  <option value="glass">Tempered Glass ($80/m³)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Quantity</label>
                <input 
                  type="number"
                  min="1"
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="mb-4 p-4 bg-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Estimated Cost</span>
                <span className="text-2xl font-bold text-green-600">
                  ${calculateCost()}
                </span>
              </div>
            </div>

            <button 
              onClick={() => {
                onPlaceOrder(newOrder);
                setShowNewOrder(false);
              }}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Confirm Order
            </button>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="mx-auto mb-4" size={48} />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center mb-2">
                    {getStatusIcon(order.status)}
                    <span className="ml-2 font-semibold">Order #{order.order_number}</span>
                    <span className="ml-3 px-2 py-1 text-xs rounded-full bg-gray-100">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600">Placed: {new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-gray-600">Dimensions: {order.dimensions}</p>
                  <p className="text-gray-600">Material: {order.material}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${order.total_amount}</p>
                  {order.assigned_worker_id && (
                    <p className="text-sm text-gray-500">Assigned to: Worker #{order.assigned_worker_id}</p>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Order Placed</span>
                  <span>In Progress</span>
                  <span>Completed</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      order.status === 'completed' ? 'bg-green-500 w-full' :
                      order.status === 'in_progress' ? 'bg-blue-500 w-2/3' :
                      'bg-yellow-500 w-1/3'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrderView;