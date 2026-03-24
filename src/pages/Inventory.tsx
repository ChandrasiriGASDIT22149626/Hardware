import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  PlusIcon,
  PackageIcon,
  AlertTriangleIcon,
  EditIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
  Loader2Icon
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import type { Product } from '../types';

const categories = [
  'All',
  'Power Tools',
  'Hand Tools',
  'Plumbing',
  'Electrical',
  'Fasteners',
  'Painting',
  'Measuring',
  'Safety',
  'Abrasives'
];

const emptyProduct: Omit<Product, 'id'> = {
  name: '',
  sku: '',
  category: 'Power Tools',
  price: 0,
  cost_price: 0,
  stock: 0,
  minStock: 0,
  supplier: '',
  unit: 'pcs',
  barcode: ''
};

export function Inventory() {
  // PERMANENT FIX: Hardcode the symbol to Rs.
  const symbol = 'Rs.';
  const convert = (val: number) => val; 

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState(0);
  const [stockType, setStockType] = useState<'in' | 'out'>('in');
  const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error.message);
    } else {
      const mappedData = data?.map(item => ({
        ...item,
        costPrice: item.cost_price || 0,
        minStock: item.min_stock || 0
      }));
      setProducts(mappedData || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockCount = products.filter((p) => p.stock < p.minStock).length;
  const totalValue = products.reduce((sum, p) => sum + p.stock * convert(p.costPrice), 0);
  const uniqueCategories = [...new Set(products.map((p) => p.category))].length;

  const openAdd = () => {
    setEditingProduct(null);
    setFormData(emptyProduct);
    setShowAddModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setShowAddModal(true);
  };

  const openStock = (product: Product, type: 'in' | 'out') => {
    setStockProduct(product);
    setStockType(type);
    setStockQty(0);
    setShowStockModal(true);
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Session expired. Please log in again.");

    const dbPayload = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      price: formData.price,
      cost_price: formData.costPrice,
      stock: formData.stock,
      min_stock: formData.minStock,
      supplier: formData.supplier,
      unit: formData.unit,
      barcode: formData.barcode,
      user_id: user.id
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(dbPayload)
        .eq('id', editingProduct.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from('products')
        .insert([dbPayload]);
      if (error) alert(error.message);
    }
    
    fetchProducts();
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchProducts();
    }
  };

  const handleStockAdjust = async () => {
    if (!stockProduct) return;
    const newQty = stockType === 'in' 
      ? stockProduct.stock + stockQty 
      : Math.max(0, stockProduct.stock - stockQty);

    const { error } = await supabase
      .from('products')
      .update({ stock: newQty })
      .eq('id', stockProduct.id);

    if (error) alert(error.message);
    else fetchProducts();
    
    setShowStockModal(false);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Products</p>
          <p className="text-2xl font-black text-[#464646] mt-1">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Stock Value ({symbol})</p>
          <p className="text-2xl font-black text-[#DAA520] mt-1">
            {symbol} {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Low Stock</p>
          <p className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {lowStockCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Categories</p>
          <p className="text-2xl font-black text-[#464646] mt-1">{uniqueCategories}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 flex-1 group focus-within:ring-2 focus-within:ring-[#DAA520]/20 transition-all">
            <SearchIcon className="w-5 h-5 text-gray-400 group-focus-within:text-[#DAA520] transition-colors" />
            <input
              type="text"
              placeholder="Search hardware by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#464646] outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5">
            <FilterIcon className="w-5 h-5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-sm font-bold text-[#464646] outline-none cursor-pointer"
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-[#DAA520] hover:bg-[#B8860B] text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-[#DAA520]/20 transition-all uppercase tracking-widest">
            <PlusIcon className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center text-gray-400">
              <Loader2Icon className="animate-spin w-8 h-8 text-[#DAA520] mx-auto mb-4" />
              <p className="font-bold">Syncing inventory database...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-6 py-5">SKU</th>
                  <th className="px-6 py-5">Product</th>
                  <th className="px-6 py-5">Category</th>
                  <th className="px-6 py-5 text-right">Price ({symbol})</th>
                  <th className="px-6 py-5 text-right">Cost ({symbol})</th>
                  <th className="px-6 py-5 text-center">Stock</th>
                  <th className="px-6 py-5 text-center">Min</th>
                  <th className="px-6 py-5">Supplier</th>
                  <th className="px-6 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => {
                  const isLow = product.stock < product.minStock;
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50/80 transition-colors ${isLow ? 'bg-red-50/50' : ''}`}>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-400">{product.sku}</td>
                      <td className="px-6 py-4 font-black text-[#464646]">{product.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-md text-[9px] font-black uppercase tracking-widest">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-[#DAA520]">{symbol} {convert(product.price).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-400">{symbol} {convert(product.costPrice).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-black text-base ${isLow ? 'text-red-500' : 'text-[#464646]'}`}>{product.stock}</span>
                          <span className="text-gray-400 text-[9px] uppercase font-black tracking-widest">{product.unit}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400 font-bold italic">{product.minStock}</td>
                      <td className="px-6 py-4 text-gray-500 font-bold text-xs truncate max-w-[150px]">{product.supplier || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openStock(product, 'in')} className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><ArrowUpIcon className="w-4 h-4" /></button>
                          <button onClick={() => openStock(product, 'out')} className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"><ArrowDownIcon className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(product)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white transition-all"><EditIcon className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all"><Trash2Icon className="w-4 h-4" /></button>
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
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingProduct ? 'Edit Inventory' : 'New Hardware Product'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-2">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Product Name *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">SKU / ID *</label>
            <input required type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520] bg-white cursor-pointer">
              {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          {/* Initial Stock Field */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Current Stock Quantity</label>
            <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Unit</label>
            <input type="text" placeholder="e.g., pcs, kg, boxes" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Base Selling Price ({symbol})</label>
            <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Base Cost Price ({symbol})</label>
            <input type="number" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Stock Alert Threshold</label>
            <input type="number" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Supplier</label>
            <input type="text" value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="Vendor Name" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Barcode</label>
            <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520]" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
          <button onClick={() => setShowAddModal(false)} className="px-6 py-3 text-xs font-black text-gray-500 hover:bg-gray-100 rounded-xl transition-colors uppercase tracking-widest">Cancel</button>
          <button onClick={handleSave} className="px-8 py-3 text-xs bg-[#DAA520] hover:bg-[#B8860B] text-white rounded-xl font-black shadow-lg shadow-[#DAA520]/20 transition-all uppercase tracking-widest">
            {editingProduct ? 'Commit Changes' : 'Register Product'}
          </button>
        </div>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title={`Adjustment - ${stockProduct?.name}`} size="sm">
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100 shadow-inner">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Available Now</p>
            <p className="text-4xl font-black text-[#464646]">{stockProduct?.stock} <span className="text-sm text-gray-400 uppercase tracking-widest">{stockProduct?.unit}</span></p>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Quantity for {stockType === 'in' ? 'Stock Entry' : 'Manual Removal'}</label>
            <input type="number" min={1} autoFocus value={stockQty} onChange={(e) => setStockQty(parseInt(e.target.value) || 0)} className="w-full px-4 py-4 border border-gray-200 rounded-2xl text-xl font-black text-[#464646] text-center outline-none focus:ring-4 focus:ring-[#DAA520]/20" />
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button onClick={handleStockAdjust} className={`w-full py-4 text-xs font-black text-white rounded-2xl transition-all shadow-lg uppercase tracking-widest ${stockType === 'in' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}>
              Commit {stockType === 'in' ? 'Restock' : 'Adjustment'}
            </button>
            <button onClick={() => setShowStockModal(false)} className="w-full py-3.5 text-[10px] font-black text-gray-400 hover:bg-gray-100 rounded-2xl uppercase tracking-widest transition-colors">Dismiss</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}