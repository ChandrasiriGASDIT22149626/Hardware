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

// Updated Pie Chart colors to match Ash & Gold theme
const COLORS = ['#DAA520', '#464646', '#B8860B', '#808080', '#EEDC82', '#333333'];
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
    // PERMANENT FIX: Hardcode the symbol to Rs.
    const symbol = 'Rs.';
    
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
    
    // Theme matching for PDF
    doc.setFontSize(20);
    doc.setTextColor(218, 165, 32); 
    doc.text("Hardware ERP - Profit & Loss Statement", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(70, 70, 70); 
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 25);
    
    const summaryData = [
      ["Total Revenue", `${symbol} ${totalIncome.toLocaleString()}`],
      ["Total Expenses", `-${symbol} ${totalExpenses.toLocaleString()}`],
      ["Net Profit", `${symbol} ${netProfit.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Category', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [70, 70, 70] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
      body: transactions.map(t => [t.date, t.type, t.category, t.description, `${symbol} ${t.amount}`]),
      headStyles: { fillColor: [218, 165, 32] }
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
    <div className="p-6 space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl w-fit shadow-sm">
        {(['overview', 'transactions', 'reports'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-[#464646] text-white shadow-md' : 'text-gray-500 hover:text-[#464646] hover:bg-gray-50'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Total Revenue</p>
              <p className="text-2xl font-black text-emerald-600">{symbol} {totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Total Expenses</p>
              <p className="text-2xl font-black text-red-600">-{symbol} {totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Net Profit</p>
              <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{symbol} {Math.abs(netProfit).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Current Balance</p>
              <p className="text-2xl font-black text-[#464646]">{symbol} {netProfit.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Income vs Expenses</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 'bold' }} tickFormatter={(v) => `${symbol}${v/1000}k`} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontWeight: 'bold', color: '#464646' }} formatter={(value: number) => [`${symbol} ${value.toLocaleString()}`, '']} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="text-xs font-black text-gray-400 mb-6 uppercase tracking-widest">Recent Transactions</h2>
              <div className="space-y-4">
                {transactions.slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#464646] truncate max-w-[100px]">{t.description}</p>
                        <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase mt-0.5">{t.category}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{symbol} {Number(t.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520] cursor-pointer">
                <option value="all">All Records</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
              <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"><FileSpreadsheetIcon className="w-4 h-4" /> Export</button>
            </div>
            <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-[#DAA520] hover:bg-[#B8860B] text-white px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#DAA520]/20 transition-all"><PlusIcon className="w-4 h-4" /> Add Transaction</button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Reference</th><th className="px-6 py-4 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-bold">{t.date}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span></td>
                    <td className="px-6 py-4 font-black text-[#464646]">{t.category}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{t.description}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400 font-bold">{t.reference || '---'}</td>
                    <td className={`px-6 py-4 text-right font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{symbol} {Number(t.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-6 animate-in slide-in-from-left-4">
          <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
              <h2 className="text-lg font-black text-[#464646] uppercase tracking-widest">Profit & Loss Summary</h2>
              <div className="flex gap-2">
                <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"><FileTextIcon className="w-3.5 h-3.5" /> PDF Report</button>
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"><DownloadIcon className="w-3.5 h-3.5" /> Excel</button>
              </div>
            </div>
            <div className="space-y-4 max-w-2xl">
              <div className="flex justify-between items-center py-3 border-b border-gray-50"><span className="text-gray-500 font-black uppercase tracking-widest text-xs">Total Revenue</span><span className="text-[#464646] font-black text-lg">{symbol} {totalIncome.toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50"><span className="text-gray-500 font-black uppercase tracking-widest text-xs">Total Expenses</span><span className="text-[#464646] font-black text-lg">-{symbol} {totalExpenses.toLocaleString()}</span></div>
              <div className="flex justify-between items-center py-5"><span className="text-[#464646] font-black text-xl uppercase tracking-widest">Net Profit</span><span className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-600'}`}>{symbol} {netProfit.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-xs font-black text-gray-400 mb-8 uppercase tracking-widest">Expense Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
              <div className="h-[250px] flex items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100">
                {expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontWeight: 'bold', color: '#464646' }} formatter={(value: number) => [`${symbol} ${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center text-gray-400"><PieChartIcon className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="text-[10px] font-black uppercase tracking-widest">No Expense Data</p></div>}
              </div>
              <div className="space-y-3">
                {expenseBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-[#464646] font-black text-sm uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-[#464646] font-black">{symbol} {item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record Transaction" size="sm">
        <div className="space-y-5 p-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Date</label>
              <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Category</label>
            <select 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]"
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
            <input type="text" placeholder="Transaction details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reference No.</label>
            <input type="text" placeholder="INV-001" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520] font-mono" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Amount ({symbol})</label>
            <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg font-black text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <button onClick={handleAddTransaction} className="w-full bg-[#DAA520] text-white py-4 rounded-xl font-black mt-2 hover:bg-[#B8860B] shadow-lg shadow-[#DAA520]/20 transition-all uppercase tracking-widest text-xs">SAVE TRANSACTION</button>
        </div>
      </Modal>
    </div>
  );
}