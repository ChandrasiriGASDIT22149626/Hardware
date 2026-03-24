import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useCurrency } from '../context/CurrencyContext'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PlusIcon, ShieldIcon, CheckIcon, DownloadIcon, 
  DatabaseIcon, RefreshCcwIcon, XIcon, LockIcon, 
  Trash2Icon, Edit2Icon, Loader2Icon, FileTextIcon
} from 'lucide-react';

type Tab = 'users' | 'system' | 'backup';

export function Settings() {
  const { currency, setCurrency, taxRate, setTaxRate } = useCurrency();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Saving States
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // System Configuration States
  const [shopName, setShopName] = useState('MUTHUWADIGE HARDWARE');
  const [threshold, setThreshold] = useState(10);
  const [saved, setSaved] = useState(false);

  // User Forms State
  const [formData, setFormData] = useState({ name: '', email: '', role: 'cashier', password: '' });
  const [editingUser, setEditingUser] = useState<any>(null);

  // Backup History State with Download URLs
  const [recentBackups, setRecentBackups] = useState<any[]>([]);

  // Permissions Matrix State
  const [matrix, setMatrix] = useState([
    { feature: 'Dashboard', admin: true, manager: true, cashier: true },
    { feature: 'Inventory (Edit)', admin: true, manager: true, cashier: false },
    { feature: 'Accounting', admin: true, manager: true, cashier: false },
    { feature: 'Settings', admin: true, manager: false, cashier: false },
  ]);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (userData) setUsers(userData);
    
    const { data: settingData } = await supabase.from('system_settings').select('*').single();
    if (settingData) {
      setShopName(settingData.shop_name);
      setThreshold(settingData.low_stock_threshold);
    }
    setLoading(false);
  };

  // --- PDF BACKUP ACTION ---
  const handleFullPDFBackup = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    const timestamp = new Date().getTime();
    
    // Gold Theme for PDF
    doc.setFontSize(20);
    doc.setTextColor(218, 165, 32); 
    doc.text(`${shopName} - Full System Backup`, 14, 22);

    const { data: products } = await supabase.from('products').select('*');

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Email', 'Role']],
      body: users.map(u => [u.name, u.email, u.role]),
      headStyles: { fillColor: [70, 70, 70] } // Ash color for table headers
    });

    if (products) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Product', 'Stock', 'Price']],
        body: products.map(p => [p.name, p.stock, `${currency === 'LKR' ? 'Rs.' : '$'} ${p.price}`]),
        headStyles: { fillColor: [218, 165, 32] } // Gold color for products header
      });
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const fileName = `Backup_${date.replace(/\//g, '-')}_${timestamp}.pdf`;

    doc.save(fileName);

    setRecentBackups([{ 
      name: fileName, 
      date: date, 
      size: '2.8 MB', 
      url: pdfUrl 
    }, ...recentBackups]);
  };

  // --- USER ACTIONS ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const avatar = formData.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const { data, error } = await supabase.from('profiles').insert([{ 
      name: formData.name, email: formData.email, role: formData.role, avatar 
    }]).select();

    if (!error && data) {
      setUsers([data[0], ...users]);
      setShowAddUser(false);
      setFormData({ name: '', email: '', role: 'cashier', password: '' });
    }
    setIsSaving(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ 
      name: editingUser.name, email: editingUser.email, role: editingUser.role 
    }).eq('id', editingUser.id);

    if (!error) {
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setShowEditUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("Delete this user?")) {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (!error) setUsers(users.filter(u => u.id !== id));
    }
  };

  const handleUpdateSettings = async () => {
    setSaved(true);
    await supabase.from('system_settings').update({ 
      currency: 'LKR', // Hardcoded to safeguard your default currency
      tax_rate: taxRate, 
      shop_name: shopName, 
      low_stock_threshold: threshold
    }).eq('id', 1);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white p-1 rounded-xl w-fit border border-gray-200 shadow-sm">
        {(['users', 'system', 'backup'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} 
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-[#464646] text-white shadow-md' : 'text-gray-500 hover:text-[#464646] hover:bg-gray-50'}`}>
            {t === 'users' ? 'Users & Roles' : t === 'system' ? 'System Settings' : 'Backup & Restore'}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-black text-[#464646]">System Users</h2>
              <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] text-white px-5 py-2.5 rounded-xl text-sm font-black transition-colors shadow-md shadow-[#DAA520]/20">
                <PlusIcon className="w-4 h-4" /> Add User
              </button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Email</th><th className="px-6 py-4 text-center">Role</th><th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3 font-bold text-[#464646]">
                      <div className="w-9 h-9 bg-[#DAA520]/10 text-[#DAA520] rounded-xl flex items-center justify-center font-black">{u.avatar}</div>
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-center"><span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#464646]/10 text-[#464646] uppercase tracking-wider">{u.role}</span></td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => { setEditingUser(u); setShowEditUser(true); }} className="text-gray-300 hover:text-[#DAA520] transition-colors"><Edit2Icon className="w-4 h-4 inline" /></button>
                      <button onClick={() => handleDeleteUser(u.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2Icon className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-[#464646] mb-6 flex items-center gap-2"><ShieldIcon className="text-[#DAA520] w-5 h-5"/> Permissions Matrix</h2>
            <table className="w-full text-sm text-center">
              <thead className="text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-50">
                <tr><th className="text-left pb-4">Feature</th><th className="pb-4 text-[#464646]">Admin</th><th className="pb-4 text-[#464646]">Manager</th><th className="pb-4 text-[#464646]">Cashier</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matrix.map((row, idx) => (
                  <tr key={row.feature} className="hover:bg-gray-50/50">
                    <td className="py-4 text-left font-bold text-gray-600">{row.feature}</td>
                    <td><button onClick={() => { const n = [...matrix]; n[idx].admin = !n[idx].admin; setMatrix(n); }} className="p-1 rounded hover:bg-gray-100">{row.admin ? <CheckIcon className="w-5 h-5 text-[#DAA520] mx-auto" /> : <span className="text-gray-300 font-bold">—</span>}</button></td>
                    <td><button onClick={() => { const n = [...matrix]; n[idx].manager = !n[idx].manager; setMatrix(n); }} className="p-1 rounded hover:bg-gray-100">{row.manager ? <CheckIcon className="w-5 h-5 text-[#DAA520] mx-auto" /> : <span className="text-gray-300 font-bold">—</span>}</button></td>
                    <td><button onClick={() => { const n = [...matrix]; n[idx].cashier = !n[idx].cashier; setMatrix(n); }} className="p-1 rounded hover:bg-gray-100">{row.cashier ? <CheckIcon className="w-5 h-5 text-[#DAA520] mx-auto" /> : <span className="text-gray-300 font-bold">—</span>}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SYSTEM TAB */}
      {tab === 'system' && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 max-w-2xl shadow-sm animate-in slide-in-from-left-4">
          <h2 className="font-black text-xl text-[#464646] mb-8 flex items-center gap-3"><DatabaseIcon className="w-6 h-6 text-[#DAA520]" /> General Configuration</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Shop Name</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Currency</label>
                {/* Fixed the currency to LKR and disabled the dropdown */}
                <select disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none font-bold text-gray-400 bg-gray-50 cursor-not-allowed">
                  <option value="LKR">LKR (Rs.)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Tax Rate (%)</label>
                <input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" />
              </div>
            </div>
            <button onClick={handleUpdateSettings} className="w-full bg-[#DAA520] hover:bg-[#B8860B] text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-[#DAA520]/20 mt-4">
              {saved ? 'Global Sync Active!' : 'Save System Settings'}
            </button>
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {tab === 'backup' && (
        <div className="space-y-6 max-w-4xl animate-in slide-in-from-right-4">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#DAA520]/10 rounded-2xl flex items-center justify-center shrink-0">
                <FileTextIcon className="w-7 h-7 text-[#DAA520]" />
              </div>
              <div>
                <h3 className="font-black text-[#464646] text-lg">System Backup Center</h3>
                <p className="text-sm text-gray-400 font-medium mt-1">Export your entire database, users, and inventory to a secure PDF file.</p>
              </div>
            </div>
            <button onClick={handleFullPDFBackup} className="w-full md:w-auto px-8 py-4 bg-[#464646] text-white rounded-xl font-black flex items-center justify-center gap-3 hover:bg-[#333333] transition-all shadow-lg shadow-[#464646]/20 uppercase tracking-widest text-xs shrink-0">
              <DownloadIcon className="w-4 h-4" /> Generate Backup
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 font-black text-[#464646] flex items-center gap-2">
              <RefreshCcwIcon className="w-4 h-4 text-[#DAA520]" /> Most Recent Backups
            </div>
            <div className="divide-y divide-gray-50">
              {recentBackups.map((file, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg"><FileTextIcon className="w-5 h-5 text-gray-500" /></div>
                    <div>
                      <p className="text-sm font-black text-[#464646]">{file.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{file.date} • {file.size}</p>
                    </div>
                  </div>
                  <a href={file.url} download={file.name} className="px-4 py-2 bg-[#DAA520]/10 text-[#DAA520] rounded-lg text-xs font-black hover:bg-[#DAA520] hover:text-white transition-all uppercase tracking-widest">Download</a>
                </div>
              ))}
              {recentBackups.length === 0 && <div className="p-12 text-center text-gray-400 font-bold">No backups generated during this session.</div>}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAddUser && (
        <div className="fixed inset-0 bg-[#464646]/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleAddUser} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-xl text-[#464646]">Register New User</h3>
              <button type="button" onClick={() => setShowAddUser(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><XIcon className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
              <input required placeholder="e.g. John Doe" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
              <input required type="email" placeholder="john@hardware.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">System Role</label>
              <select className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646] bg-white cursor-pointer" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Initial Password</label>
              <div className="relative">
                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="password" placeholder="••••••••" className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-3.5 font-black text-gray-500 hover:bg-gray-100 rounded-xl uppercase tracking-widest text-xs transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3.5 font-black bg-[#DAA520] hover:bg-[#B8860B] text-white rounded-xl shadow-lg shadow-[#DAA520]/20 uppercase tracking-widest text-xs transition-all">{isSaving ? 'Saving...' : 'Create Account'}</button>
            </div>
          </form>
        </div>
      )}

      {showEditUser && editingUser && (
        <div className="fixed inset-0 bg-[#464646]/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleUpdateUser} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-5 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black text-xl text-[#464646]">Edit Profile</h3>
              <button type="button" onClick={() => setShowEditUser(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><XIcon className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
              <input required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email Address</label>
              <input required className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646]" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">System Role</label>
              <select className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DAA520] font-bold text-[#464646] bg-white cursor-pointer" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}>
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowEditUser(false)} className="flex-1 py-3.5 font-black text-gray-500 hover:bg-gray-100 rounded-xl uppercase tracking-widest text-xs transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3.5 font-black bg-[#464646] hover:bg-[#333333] text-white rounded-xl shadow-lg shadow-[#464646]/20 uppercase tracking-widest text-xs transition-all">Update Details</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}