import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCurrency } from '../context/CurrencyContext';
import {
  DollarSignIcon,
  ShoppingCartIcon,
  AlertTriangleIcon,
  UsersIcon,
  TrendingUpIcon,
  PackageIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { StatCard } from '../components/StatCard';
import {
  monthlySalesData,
  categorySalesData
} from '../data/mockData';

export function Dashboard() {
  const { currency } = useCurrency();
  const symbol = currency === 'LKR' ? 'Rs.' : '$';

  // --- STATE MANAGEMENT ---
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    customers: 0,
    lowStock: 0
  });
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom Theme Colors for the Dashboard
  const themeColors = ['#DAA520', '#464646', '#B8860B', '#808080', '#EEDC82'];

  // Status Colors using the new theme
  const statusColors: Record<string, string> = {
    paid: 'bg-[#DAA520]/10 text-[#DAA520]', // Gold
    pending: 'bg-[#464646]/10 text-[#464646]', // Ash
    cancelled: 'bg-red-100 text-red-700' // Kept red for errors/cancellations
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Today's Revenue and Orders
    const { data: salesData } = await supabase
      .from('sales')
      .select('total_amount, status')
      .gte('created_at', today);

    const todayRevenue = salesData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
    const todayOrders = salesData?.length || 0;

    // 2. Fetch Active Customers
    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    // 3. Fetch Low Stock Items (using threshold from system settings or default 10)
    const { data: products } = await supabase.from('products').select('*');
    const lowStock = products?.filter((p) => p.stock < (p.min_stock || 10)) || [];

    // 4. Fetch Recent Sales
    const { data: recent } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    setStats({
      revenue: todayRevenue,
      orders: todayOrders,
      customers: customerCount || 0,
      lowStock: lowStock.length
    });
    setLowStockItems(lowStock);
    setRecentSales(recent || []);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* Welcome Banner with Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm p-1 shrink-0">
          <img 
            src="/images/logo.png" 
            alt="Hardware Logo" 
            className="w-full h-full object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#464646]">Welcome to Muthuwadige Hardware</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Here is your daily business overview and system status.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue (Today)"
          value={`${symbol} ${stats.revenue.toLocaleString()}`}
          change="+12.5% vs yesterday"
          changeType="positive"
          icon={<DollarSignIcon className="w-6 h-6 text-[#DAA520]" />}
          iconBg="bg-[#DAA520]/10"
        />

        <StatCard
          title="Orders Today"
          value={String(stats.orders)}
          change="+8.3% vs yesterday"
          changeType="positive"
          icon={<ShoppingCartIcon className="w-6 h-6 text-[#464646]" />}
          iconBg="bg-[#464646]/10"
        />

        <StatCard
          title="Low Stock Items"
          value={String(stats.lowStock)}
          change="Requires attention"
          changeType="negative"
          icon={<AlertTriangleIcon className="w-6 h-6 text-red-500" />}
          iconBg="bg-red-50"
        />

        <StatCard
          title="Active Customers"
          value={String(stats.customers)}
          change="+2 new this week"
          changeType="positive"
          icon={<UsersIcon className="w-6 h-6 text-[#DAA520]" />}
          iconBg="bg-[#DAA520]/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-black text-[#464646]">Sales Trend</h2>
              <p className="text-sm font-bold text-gray-400">Last 6 months revenue ({symbol})</p>
            </div>
            <div className="flex items-center gap-1 text-[#DAA520] text-sm font-black">
              <TrendingUpIcon className="w-4 h-4" />
              +18.4%
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlySalesData}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DAA520" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#DAA520" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }}
                tickFormatter={(v) => `${symbol}${(v / 1000).toFixed(0)}k`} 
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', color: '#464646' }}
                formatter={(value: number) => [`${symbol} ${value.toLocaleString()}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#DAA520" 
                strokeWidth={3} 
                fill="url(#salesGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-black text-[#464646] mb-1">Sales by Category</h2>
          <p className="text-sm font-bold text-gray-400 mb-6">Current Monthly Share</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categorySalesData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {/* FIX: Moved the comment outside the map function to prevent the Babel syntax error */}
                {categorySalesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontWeight: 'bold', color: '#464646' }} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#9ca3af' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#464646]">Recent Sales</h2>
            <button className="text-xs text-[#DAA520] font-black hover:underline uppercase tracking-widest">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                  <th className="py-3">Invoice</th>
                  <th className="py-3">Customer</th>
                  <th className="py-3">Date</th>
                  <th className="py-3 text-right">Amount</th>
                  <th className="py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSales.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 font-black text-[#464646]">{order.invoice_no}</td>
                    <td className="py-4 font-bold text-gray-500">{order.customer_name || 'Guest'}</td>
                    <td className="py-4 font-bold text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-right font-black text-[#464646]">
                     {symbol} {(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusColors[order.status] || 'bg-gray-100 text-gray-500'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-black text-[#464646]">Low Stock Alerts</h2>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12">
              <PackageIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400 font-bold">All items well stocked.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100 group hover:border-red-200 transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-[#464646] truncate">{item.name}</p>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-0.5">
                      {item.stock} left • Min {item.min_stock || 10}
                    </p>
                  </div>
                  <button className="bg-white text-[#464646] text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border border-gray-200 hover:bg-[#DAA520] hover:text-white hover:border-[#DAA520] transition-colors shadow-sm">
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}