import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  DownloadIcon,
  TrendingUpIcon,
  PackageIcon,
  DollarSignIcon,
  FileTextIcon,
  FileSpreadsheetIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabaseClient';

type Tab = 'sales' | 'inventory' | 'financial';
type DateRange = 'month' | 'week';

export function Reports() {
  const [tab, setTab] = useState<Tab>('sales');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: sData } = await supabase.from('sales').select('*');
      const { data: pData } = await supabase.from('products').select('*');
      const { data: tData } = await supabase.from('transactions').select('*');
      if (sData) setSales(sData);
      if (pData) setProducts(pData);
      if (tData) setTransactions(tData);
    };
    fetchData();
  }, []);

  // --- SALES CALCULATIONS ---
  const totalSalesRevenue = sales.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const paidOrders = sales.filter(o => o.status === 'paid').length;
  const avgOrderValue = paidOrders > 0 ? totalSalesRevenue / paidOrders : 0;

  // FIXED: Daily Sales logic to ensure data maps to chart
  const dailySalesData = sales.reduce((acc: any[], sale) => {
    const day = new Date(sale.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    const existing = acc.find(d => d.day === day);
    if (existing) existing.sales += Number(sale.total || 0);
    else acc.push({ day, sales: Number(sale.total || 0) });
    return acc;
  }, []).sort((a, b) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.indexOf(a.day) - days.indexOf(b.day);
  });

  const topSellingProducts = sales.reduce((acc: any[], sale) => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item: any) => {
        const existing = acc.find(p => p.name === item.productName);
        if (existing) {
          existing.sold += Number(item.qty || 0);
          existing.revenue += Number(item.total || 0);
        } else {
          acc.push({ name: item.productName, sold: Number(item.qty || 0), revenue: Number(item.total || 0) });
        }
      });
    }
    return acc;
  }, []).sort((a, b) => b.sold - a.sold).slice(0, 5);

  // --- INVENTORY CALCULATIONS ---
  const lowStockItems = products.filter(p => p.stock < (p.min_stock || 5));
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock * (Number(p.cost_price) || 0)), 0);
  const totalCategories = [...new Set(products.map(p => p.category))].length;

  const categoryBreakdownData = products.reduce((acc: any[], p) => {
    const existing = acc.find(c => c.name === p.category);
    if (existing) existing.count += 1;
    else acc.push({ name: p.category || 'Uncategorized', count: 1 });
    return acc;
  }, []).map((c, i) => ({
    ...c,
    value: products.length > 0 ? Math.round((c.count / products.length) * 100) : 0,
    color: ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#06b6d4'][i % 5]
  }));

  // --- FINANCIAL CALCULATIONS ---
  const financialChartData = transactions.reduce((acc: any[], trans) => {
    const date = new Date(trans.date);
    const month = date.toLocaleString('default', { month: 'short' });
    const existing = acc.find(item => item.month === month);
    const amount = Number(trans.amount || 0);
    if (existing) {
      if (trans.type === 'income') existing.revenue += amount;
      else existing.expenses += amount;
    } else {
      acc.push({ month, revenue: trans.type === 'income' ? amount : 0, expenses: trans.type === 'expense' ? amount : 0 });
    }
    return acc;
  }, []).slice(-6);

  const categoryMargins = products.reduce((acc: any[], prod) => {
    const cat = prod.category || 'Other';
    const price = Number(prod.price || 0);
    const cost = Number(prod.cost_price || 0);
    const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
    const existing = acc.find(item => item.name === cat);
    if (existing) { existing.totalMargin += margin; existing.count += 1; }
    else { acc.push({ name: cat, totalMargin: margin, count: 1 }); }
    return acc;
  }, []).map((item, index) => ({
    name: item.name,
    margin: Math.round(item.totalMargin / item.count),
    color: ['bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500'][index % 5]
  }));

  // --- HANDLERS ---
  const handleExportExcel = () => {
    const data = tab === 'sales' ? sales : tab === 'inventory' ? products : transactions;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Export");
    XLSX.writeFile(wb, `Report_${tab}_${new Date().toLocaleDateString()}.xlsx`);
  };

  // FIXED: PDF Generation logic
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Hardware ERP - ${tab.toUpperCase()} REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const body = tab === 'sales' 
      ? sales.map(s => [s.invoice_no || 'N/A', s.created_at.split('T')[0], s.customer_name, `$${s.total}`])
      : products.map(p => [p.name, p.category, p.stock, `$${p.price}`]);

    const head = tab === 'sales' 
      ? [['Invoice', 'Date', 'Customer', 'Total']] 
      : [['Product', 'Category', 'Stock', 'Price']];

    autoTable(doc, {
      startY: 40,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillStyle: '#f97316' }
    });

    doc.save(`${tab}_report_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['sales', 'inventory', 'financial'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{t} Report</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm bg-white outline-none">
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors">
            <FileTextIcon className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-bold hover:bg-emerald-100 transition-colors">
            <FileSpreadsheetIcon className="w-4 h-4" /> EXCEL
          </button>
        </div>
      </div>

      {tab === 'sales' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Total Revenue</p><p className="text-2xl font-black text-emerald-600 mt-1">${totalSalesRevenue.toLocaleString()}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Total Orders</p><p className="text-2xl font-black text-slate-900 mt-1">{sales.length}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Paid Orders</p><p className="text-2xl font-black text-slate-900 mt-1">{paidOrders}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Avg Order Value</p><p className="text-2xl font-black text-slate-900 mt-1">${avgOrderValue.toFixed(0)}</p></div>
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Daily Sales (This Week)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="sales" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Top Selling Products</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 uppercase text-[10px] font-bold"><th className="text-left py-2">Rank</th><th className="text-left py-2">Product</th><th className="text-center py-2">Sold</th><th className="text-right py-2">Revenue</th></tr>
                </thead>
                <tbody>
                  {topSellingProducts.map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-bold text-orange-600">#{i+1}</td>
                      <td className="py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 text-center text-slate-600">{p.sold}</td>
                      <td className="py-3 text-right font-black text-slate-900">${Number(p.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Total Products</p><p className="text-2xl font-black text-slate-900 mt-1">{products.length}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Stock Value</p><p className="text-2xl font-black text-slate-900 mt-1">${totalStockValue.toLocaleString()}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Low Stock Items</p><p className="text-2xl font-black text-red-600 mt-1">{lowStockItems.length}</p></div>
            <div className="bg-white rounded-xl border p-4 shadow-sm"><p className="text-xs text-slate-500 font-bold uppercase">Categories</p><p className="text-2xl font-black text-slate-900 mt-1">{totalCategories}</p></div>
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2"><PackageIcon className="w-4 h-4 text-red-500" /> Low Stock Items</h2>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100">
                  <div><p className="text-sm font-bold text-slate-900">{item.name}</p><p className="text-[10px] text-slate-500 uppercase">{item.sku} • {item.category}</p></div>
                  <div className="text-right"><p className="text-sm font-black text-red-600">{item.stock} left</p><p className="text-[10px] text-slate-400">Min: {item.min_stock || 5}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Category Breakdown</h2>
            <div className="space-y-4">
              {categoryBreakdownData.map((cat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-700 w-28 truncate">{cat.name}</span>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className="h-full transition-all duration-700" style={{ width: `${cat.value}%`, backgroundColor: cat.color }} /></div>
                  <span className="text-sm font-black text-slate-900 w-10 text-right">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'financial' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider">Revenue vs Expenses (6 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={financialChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} /><Tooltip /><Legend verticalAlign="bottom" align="center" />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={4} dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider flex items-center gap-2"><DollarSignIcon className="w-4 h-4 text-orange-500" /> Profit Margin by Category</h2>
            <div className="space-y-5">
              {categoryMargins.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-600"><span>{item.name}</span><span className="text-emerald-600">{item.margin}%</span></div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 rounded-full ${item.color}`} style={{ width: `${item.margin}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}