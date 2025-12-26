import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import CustomerOrderView from '../dashboard/CustomerOrderView';
import WorkerOrderView from '../dashboard/WorkerOrderView';
import AdminOrderView from '../dashboard/AdminOrderView';
import LoadingSpinner from '../common/LoadingSpinner';

const OrderTracker = ({ role, showHistory = false }) => {
  const { user, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, [role, user?.id, filter]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from('orders').select(`
      *,
      customer:customer_id (email, name),
      worker:assigned_worker_id (email, name),
      materials:order_materials (material_id, quantity)
    `);

    // Role-based filtering
    if (role === 'customer' && user?.id) {
      query = query.eq('customer_id', user.id);
    } else if (role === 'worker' && user?.id) {
      query = query.eq('assigned_worker_id', user.id);
    }

    // Status filter
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    // History filter
    if (showHistory) {
      query = query.in('status', ['completed', 'cancelled']);
    } else {
      query = query.not('status', 'in', '("completed", "cancelled")');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error) {
      setOrders(data || []);
    }
    setLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  const renderOrderView = () => {
    const viewRole = role || userRole;
    
    switch (viewRole) {
      case 'admin':
        return (
          <AdminOrderView 
            orders={orders} 
            onRefresh={fetchOrders}
            onAssign={(orderId, workerId) => handleAssignOrder(orderId, workerId)}
          />
        );
      case 'worker':
        return (
          <WorkerOrderView 
            orders={orders}
            onUpdateStatus={(orderId, status) => handleUpdateStatus(orderId, status)}
            onSubmitDraft={(orderId, draftData) => handleSubmitDraft(orderId, draftData)}
          />
        );
      case 'customer':
      default:
        return (
          <CustomerOrderView 
            orders={orders}
            onPlaceOrder={(orderData) => handlePlaceOrder(orderData)}
          />
        );
    }
  };

  const handleAssignOrder = async (orderId, workerId) => {
    const { error } = await supabase
      .from('orders')
      .update({ assigned_worker_id: workerId, status: 'assigned' })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    }
  };

  const handleSubmitDraft = async (orderId, draftData) => {
    const { error } = await supabase
      .from('drafts')
      .insert({
        order_id: orderId,
        worker_id: user.id,
        content: draftData,
        status: 'pending_review'
      });

    if (!error) {
      await supabase
        .from('orders')
        .update({ status: 'draft_submitted' })
        .eq('id', orderId);
      fetchOrders();
    }
  };

  const handlePlaceOrder = async (orderData) => {
    const { error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        customer_id: user.id,
        status: 'pending',
        order_number: `ORD-${Date.now()}`
      });

    if (!error) {
      fetchOrders();
    }
  };

  return (
    <div className="order-tracker">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {role === 'customer' && 'My Orders'}
          {role === 'worker' && 'Assigned Job Cards'}
          {role === 'admin' && 'All Orders'}
        </h3>
        
        {role !== 'customer' && (
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded-lg px-3 py-1"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="draft_submitted">Draft Submitted</option>
            <option value="completed">Completed</option>
          </select>
        )}
      </div>

      {renderOrderView()}
    </div>
  );
};

export default OrderTracker;