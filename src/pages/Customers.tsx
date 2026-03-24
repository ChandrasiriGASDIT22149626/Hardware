import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  PlusIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  EyeIcon,
  Trash2Icon,
  Loader2Icon
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { useCurrency } from '../context/CurrencyContext'; // Global currency sync
import type { Customer, SaleOrder } from '../types';

const emptyCustomer: Omit<Customer, 'id'> = {
  name: '',
  email: '',
  phone: '',
  address: '',
  loyaltyPoints: 0,
  totalPurchases: 0,
  joinDate: new Date().toISOString().split('T')[0]
};

export function Customers() {
  const { currency, exchangeRate = 300 } = useCurrency(); 
  const symbol = currency === 'LKR' ? 'Rs.' : '$';
  
  // Helper to convert base prices for display
  const convert = (val: number) => currency === 'LKR' ? val * exchangeRate : val;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allSales, setAllSales] = useState<SaleOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>(emptyCustomer);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      
      const { data: salesData } = await supabase.from('sales').select('*');

      if (custData) {
        const mappedCustomers = custData.map(c => ({
          ...c,
          loyaltyPoints: c.loyalty_points || 0,
          totalPurchases: c.total_purchases || 0,
          joinDate: c.join_date || c.created_at?.split('T')[0]
        }));
        setCustomers(mappedCustomers);
      }
      if (salesData) setAllSales(salesData);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);
  const avgPurchase = customers.length > 0 ? totalRevenue / customers.length : 0;

  const openAdd = () => {
    setEditingCustomer(null);
    setFormData(emptyCustomer);
    setShowAddModal(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Session expired");

      const dbPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        loyalty_points: formData.loyaltyPoints,
        total_purchases: formData.totalPurchases,
        join_date: formData.joinDate,
        user_id: user.id
      };

      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(dbPayload).eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([dbPayload]);
        if (error) throw error;
      }

      fetchData();
      setShowAddModal(false);
    } catch (error: any) {
      alert("Error saving customer: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this customer permanently?")) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchData();
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) return { label: 'Gold', color: 'text-yellow-600 bg-yellow-50' };
    if (points >= 500) return { label: 'Silver', color: 'text-slate-600 bg-slate-100' };
    return { label: 'Bronze', color: 'text-amber-700 bg-amber-50' };
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Customers</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gold Members</p>
          <p className="text-2xl font-black text-yellow-600 mt-1">
            {customers.filter(c => c.loyaltyPoints >= 1000).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Spend ({symbol})</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{symbol}{convert(totalRevenue).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. LTV ({symbol})</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{symbol}{convert(avgPurchase).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-1 group focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-orange-500" />
          <input type="text" placeholder="Find customers by name, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none w-full" />
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-100">
          <PlusIcon className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-slate-500">
              <Loader2Icon className="animate-spin w-8 h-8 text-orange-500 mx-auto mb-4" />
              <p className="font-bold">Syncing Customer Profiles...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Lifetime Spend ({symbol})</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((customer) => {
                  const tier = getLoyaltyTier(customer.loyaltyPoints);
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-black text-xs uppercase shadow-sm">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{customer.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{customer.phone}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${tier.color}`}>
                          <StarIcon className="w-3 h-3" /> {tier.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{symbol}{convert(customer.totalPurchases || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium italic">{customer.joinDate}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setViewCustomer(customer)} className="p-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-200 transition-all"><EyeIcon className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(customer)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-200 transition-all"><EditIcon className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(customer.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-200 transition-all"><Trash2Icon className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingCustomer ? 'Update Member Profile' : 'Register New Member'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-1">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Number</label>
            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Street Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Initial Loyalty Points</label>
            <input type="number" value={formData.loyaltyPoints} onChange={(e) => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date</label>
            <input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
          <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Cancel</button>
          <button onClick={handleSave} className="px-8 py-2.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black shadow-lg shadow-orange-100 transition-all uppercase tracking-widest">
            {editingCustomer ? 'Save Changes' : 'Confirm Registration'}
          </button>
        </div>
      </Modal>

      {/* View Customer Details Modal */}
      <Modal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Member Insights" size="lg">
        {viewCustomer && (
          <div className="space-y-8 p-1">
            <div className="flex items-center gap-5 bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
              <div className="w-20 h-20 bg-orange-500 rounded-[24px] flex items-center justify-center text-white font-black text-3xl uppercase shadow-xl shadow-orange-200">
                {viewCustomer.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{viewCustomer.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getLoyaltyTier(viewCustomer.loyaltyPoints).color} shadow-sm`}>
                    {getLoyaltyTier(viewCustomer.loyaltyPoints).label} Member
                  </span>
                  <span className="text-xs font-bold text-slate-400 italic">{viewCustomer.loyaltyPoints} Reward Points</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</p>
                <p className="font-bold text-slate-700">{viewCustomer.phone || 'N/A'}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Since</p>
                <p className="font-bold text-slate-700">{viewCustomer.joinDate}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Address</p>
                <p className="font-bold text-slate-700">{viewCustomer.address || 'Not provided'}</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[40px] col-span-2 flex justify-between items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <span className="text-slate-400 font-black uppercase tracking-widest text-xs">Total Lifetime Commitment</span>
                <span className="text-4xl font-black text-orange-500 drop-shadow-lg">{symbol}{convert(viewCustomer.totalPurchases).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Archival Sales History</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {allSales.filter(o => o.customer_id === viewCustomer.id).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-5 border border-slate-100 rounded-3xl text-sm bg-slate-50/30 hover:bg-white hover:shadow-md transition-all">
                    <div>
                      <p className="font-black text-slate-900">{order.invoice_no}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className="text-lg font-black text-slate-900">{symbol}{convert(order.total_amount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setViewCustomer(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Close Profile View</button>
          </div>
        )}
      </Modal>
    </div>
  );
}