import React, { useState } from 'react';
import { ClipboardCheck, Upload, AlertTriangle, Clock } from 'lucide-react';

const WorkerOrderView = ({ orders, onUpdateStatus, onSubmitDraft }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [draftContent, setDraftContent] = useState('');

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmitDraft = (orderId) => {
    onSubmitDraft(orderId, {
      content: draftContent,
      submitted_at: new Date().toISOString(),
      materials_used: [] // Would be populated from form
    });
    setSelectedOrder(null);
    setDraftContent('');
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center">
                  <ClipboardCheck size={18} className="text-blue-500 mr-2" />
                  <span className="font-semibold">Job #{order.order_number}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityBadge(order.priority)}`}>
                  {order.priority} priority
                </span>
              </div>
              {order.deadline && (
                <div className="text-right">
                  <div className="flex items-center text-sm">
                    <Clock size={14} className="mr-1" />
                    <span className={new Date(order.deadline) < new Date() ? 'text-red-600' : ''}>
                      {new Date(order.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-1">Customer: {order.customer?.name || order.customer_id}</p>
              <p className="text-sm text-gray-600">Dimensions: {order.dimensions}</p>
              <p className="text-sm text-gray-600">Material: {order.material}</p>
            </div>

            <div className="flex justify-between items-center mb-3">
              <div className="text-sm">
                <span className="font-medium">Status:</span>
                <span className="ml-2 px-2 py-1 rounded bg-gray-100">{order.status}</span>
              </div>
              <div className="text-lg font-bold">${order.total_amount}</div>
            </div>

            <div className="flex space-x-2">
              <button 
                onClick={() => onUpdateStatus(order.id, 'in_progress')}
                className="flex-1 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
              >
                Start Work
              </button>
              <button 
                onClick={() => setSelectedOrder(order)}
                className="flex-1 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
              >
                Submit Draft
              </button>
            </div>

            {order.status === 'draft_submitted' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <AlertTriangle size={14} className="inline mr-1" />
                Draft submitted, awaiting approval
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Draft Submission Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-semibold mb-4">Submit Draft for Order #{selectedOrder.order_number}</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Draft Description</label>
              <textarea 
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows="4"
                className="w-full border rounded-lg p-3"
                placeholder="Describe your work, any modifications made, challenges faced..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Materials Used</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Material name" className="border rounded-lg p-2" />
                <input type="number" placeholder="Quantity" className="border rounded-lg p-2" />
              </div>
              <button className="mt-2 text-sm text-blue-600">+ Add another material</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Upload Files (optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Drop images or PDFs here, or click to browse</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setSelectedOrder(null);
                  setDraftContent('');
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSubmitDraft(selectedOrder.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Draft for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerOrderView;