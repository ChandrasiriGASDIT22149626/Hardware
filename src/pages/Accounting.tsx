import React, { useState, useEffect } from 'react';
import {
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PlusIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PieChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import type { Transaction } from '../types';
import { useCurrency } from '../context/CurrencyContext'; 

type Tab = 'overview' | 'transactions' | 'reports';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];
const CATEGORIES = ['Salaries', 'Purchases', 'Rent', 'Utilities', 'Marketing', 'Maintenance', 'Sales', 'Other'];

const emptyTransaction: Omit<Transaction, 'id'> = {
  type: 'income',
  category: 'Sales',
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  reference: ''
};

export function Accounting() {
  // Access global currency settings and conversion logic
    const { currency, exchangeRate = 300 } = useCurrency(); 
    const symbol = currency === 'LKR' ? 'Rs.' : '$';
    
    // Helper to convert base (USD) values to display values
    const convert = (val: number) => currency === 'LKR' ? val * exchangeRate : val;
  const [tab, setTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>(emptyTransaction);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setTransactions(data);
    } catch (error) {
      console.error("Error loading accounting data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  

  useEffect(() => { fetchTransactions(); }, []);

  // --- CALCULATIONS ---
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const filtered = transactions.filter((t) => typeFilter === 'all' || t.type === typeFilter);

  const monthlyData = transactions.reduce((acc: any[], t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short' });
    const existing = acc.find(m => m.name === month);
    if (existing) {
      if (t.type === 'income') existing.income += Number(t.amount || 0);
      else existing.expenses += Number(t.amount || 0);
    } else {
      acc.push({ name: month, income: t.type === 'income' ? Number(t.amount || 0) : 0, expenses: t.type === 'expense' ? Number(t.amount || 0) : 0 });
    }
    return acc;
  }, []).reverse();

  const expenseBreakdown = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) { existing.value += Number(curr.amount || 0); } 
      else { acc.push({ name: curr.category, value: Number(curr.amount || 0) }); }
      return acc;
    }, []);

  // --- EXPORT HANDLERS ---
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `HardwareERP_Finance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Hardware ERP - Profit & Loss Statement", 14, 15);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 25);
    
    const summaryData = [
      ["Total Revenue", `$${totalIncome.toLocaleString()}`],
      ["Total Expenses", `-$${totalExpenses.toLocaleString()}`],
      ["Net Profit", `$${netProfit.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Category', 'Amount']],
      body: summaryData,
      theme: 'striped'
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: transactions.map(t => [t.date, t.type, t.category, t.description, `$${t.amount}`]),
    });

    doc.save("Finance_Report.pdf");
  };

  const handleAddTransaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('transactions').insert([{ ...formData, user_id: user?.id }]);
      if (error) throw error;
      fetchTransactions();
      setShowAddModal(false);
      setFormData(emptyTransaction);
    } catch (error: any) { alert(error.message); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['overview', 'transactions', 'reports'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-600">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Total Expenses</p>
              <p className="text-2xl font-black text-red-600">-${totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Net Profit</p>
              <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${Math.abs(netProfit).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-xs text-slate-500 font-bold uppercase mb-2">Current Balance</p>
              <p className="text-2xl font-black text-blue-600">${netProfit.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border p-6">
              <h2 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Income vs Expenses</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xs font-black text-slate-400 mb-6 uppercase tracking-widest">Recent Transactions</h2>
              <div className="space-y-4">
                {transactions.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[100px]">{t.description}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{t.category}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-slate-50">
                <option value="all">All Records</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
              <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100"><FileSpreadsheetIcon className="w-4 h-4" /> Export Excel</button>
            </div>
            <button onClick={() => setShowAddModal(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-100"><PlusIcon className="w-4 h-4" /> Add Transaction</button>
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <tr><th className="px-4 py-4">Date</th><th className="px-4 py-4">Type</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Description</th><th className="px-4 py-4">Reference</th><th className="px-4 py-4 text-right">Amount</th></tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-slate-500">{t.date}</td>
                    <td className="px-4 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span></td>
                    <td className="px-4 py-4 font-bold text-slate-700">{t.category}</td>
                    <td className="px-4 py-4 text-slate-600">{t.description}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">{t.reference || '---'}</td>
                    <td className={`px-4 py-4 text-right font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Profit & Loss Summary</h2>
              <div className="flex gap-2">
                <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase hover:bg-red-100"><FileTextIcon className="w-3.5 h-3.5" /> PDF Report</button>
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-100"><DownloadIcon className="w-3.5 h-3.5" /> Excel</button>
              </div>
            </div>
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center py-2 border-b border-slate-50"><span className="text-slate-500 font-medium">Total Revenue</span><span className="text-slate-900 font-bold">${totalIncome.toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50"><span className="text-slate-500 font-medium">Total Expenses</span><span className="text-slate-900 font-bold">-${totalExpenses.toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-4"><span className="text-slate-900 font-black text-lg">Net Profit</span><span className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>${netProfit.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-widest">Expense Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
              <div className="h-[250px] flex items-center justify-center bg-slate-50/50 rounded-xl">
                {expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-slate-400"><PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-[10px] font-black uppercase">No Expense Data</p></div>}
              </div>
              <div className="space-y-3">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-700 font-bold text-sm">{item.name}</span>
                    </div>
                    <span className="text-slate-900 font-black">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record Transaction" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Date</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Category</label>
            {/* ADDED: Category Dropdown */}
            <select 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Description</label>
            <input type="text" placeholder="Transaction details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Reference No.</label>
            <input type="text" placeholder="INV-001" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Amount ($)</label>
            <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" />
          </div>
          <button onClick={handleAddTransaction} className="w-full bg-orange-500 text-white py-3 rounded-xl font-black mt-4 hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all">SAVE TRANSACTION</button>
        </div>
      </Modal>
    </div>
  );
}