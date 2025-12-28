// src/pages/dashboard/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  Users,
  Package,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  Filter,
  Download,
  Settings,
} from "lucide-react";
import Alert from "../../components/common/Alert";
import StatsCard from "../../components/common/StatsCard";
import RecentOrdersTable from "../../components/common/RecentOrdersTable";
import UserList from "../../components/common/UserList";
import InventoryAlerts from "../../components/common/InventoryAlerts";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    lowStockItems: 0,
    activeWorkers: 0,
    orderTrend: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("today");

  useEffect(() => {
    if (!user || userRole !== "admin") {
      navigate("/login");
      return;
    }
    fetchAdminData();
  }, [user, userRole, navigate, timeRange]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (usersError) throw usersError;

      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("*")
        .order("current_stock", { ascending: true });

      if (materialsError) throw materialsError;

      // Calculate statistics
      const totalOrders = ordersData?.length || 0;
      const pendingOrders = ordersData?.filter((o) => o.status === "pending").length || 0;
      const inProgressOrders = ordersData?.filter((o) =>
        ["assigned", "in_progress", "draft_submitted"].includes(o.status)
      ).length || 0;
      const completedOrders = ordersData?.filter((o) => o.status === "completed").length || 0;
      const totalRevenue = ordersData?.filter(o => o.status === "completed")
        .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;
      const totalUsers = usersData?.length || 0;
      const lowStockItems = materialsData?.filter((m) => (m.current_stock || 0) < (m.minimum_stock || 0)).length || 0;
      
      // Get active workers
      const activeWorkers = usersData?.filter(u => u.role === 'worker').length || 0;

      // Calculate order trend
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const todayOrders = ordersData?.filter((o) => {
        if (!o?.created_at) return false;
        return new Date(o.created_at).toDateString() === today.toDateString();
      }).length || 0;
      const yesterdayOrders = ordersData?.filter((o) => {
        if (!o?.created_at) return false;
        return new Date(o.created_at).toDateString() === yesterday.toDateString();
      }).length || 0;
      const orderTrend = yesterdayOrders > 0 ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100 : todayOrders > 0 ? 100 : 0;

      setOrders(ordersData || []);
      setUsers(usersData || []);
      setMaterials(materialsData || []);
      setStats({
        totalOrders,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        totalRevenue,
        totalUsers,
        lowStockItems,
        activeWorkers,
        orderTrend,
      });
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError({
        type: "error",
        message: `Dashboard error: ${err.message}. Some features may not work properly.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRegistrationCode = async (role) => {
    try {
      // Generate random code
      const code = "AWARJANA-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + role.toUpperCase() + "-" + Math.floor(Math.random() * 100);
      
      // Hash the code
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedCode = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Insert into database
      const { error } = await supabase.from("registration_codes").insert({
        code: hashedCode,
        role: role,
        created_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      if (error) throw error;

      setError({
        type: "success",
        message: `Registration code generated: ${code} (Role: ${role}). Save this code now! It won't be shown again.`,
      });
    } catch (err) {
      console.error("Error generating code:", err);
      setError({
        type: "error",
        message: "Failed to generate registration code: " + err.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage orders, inventory, and system settings</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="time-range" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Time Range:
                </label>
                <select
                  id="time-range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <button
                onClick={() => fetchAdminData()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error/Success Alert */}
        {error && (
          <Alert
            type={error.type || "error"}
            message={error.message}
            onClose={() => setError(null)}
          />
        )}
        
        {/* Quick Actions */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => generateRegistrationCode("admin")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Generate Admin Code
              </button>
              <button
                onClick={() => generateRegistrationCode("worker")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Users className="h-4 w-4 mr-2" />
                Generate Worker Code
              </button>
              <button
                onClick={() => navigate("/admin/users")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Users
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={Package}
            trend={`${(stats.orderTrend || 0).toFixed(1)}%`}
            trendType={stats.orderTrend >= 0 ? "up" : "down"}
            color="blue"
          />
          <StatsCard
            title="Total Revenue"
            value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign}
            trend="+8.2%"
            trendType="up"
            color="green"
          />
          <StatsCard
            title="Active Users"
            value={stats.totalUsers}
            icon={Users}
            trend="+12.5%"
            trendType="up"
            color="purple"
          />
          <StatsCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            icon={AlertCircle}
            trend="+2"
            trendType="up"
            color="red"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Orders</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate("/orders/track")}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                  >
                    View all
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Order #
                        </th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {orders.slice(0, 10).map((order) => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            #{order.order_number || order.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${order.total_amount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No orders found</p>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Users</h3>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                >
                  Manage all
                </button>
              </div>
            </div>
            <div className="p-6">
              {users.length > 0 ? (
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.role}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        user.role === 'worker' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users found</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Order Status</h3>
            <div className="space-y-4">
              {[
                {
                  status: "Pending",
                  count: stats.pendingOrders,
                  color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                  icon: Clock,
                },
                {
                  status: "In Progress",
                  count: stats.inProgressOrders,
                  color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                  icon: TrendingUp,
                },
                {
                  status: "Completed",
                  count: stats.completedOrders,
                  color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                  icon: CheckCircle,
                },
                {
                  status: "Active Workers",
                  count: stats.activeWorkers,
                  color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                  icon: Users,
                },
              ].map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-md ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      {item.status}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Order Value</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  ${stats.totalOrders > 0 ? ((stats.totalRevenue || 0) / stats.totalOrders).toFixed(2) : "0.00"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : "0"}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Processing Time</dt>
                <dd className="text-sm text-gray-900 dark:text-white">3.2 days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Satisfaction</dt>
                <dd className="text-sm text-gray-900 dark:text-white">94.2%</dd>
              </div>
            </dl>
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">API Server</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">Storage</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  1% used
                </span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => navigate("/admin/settings")}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}