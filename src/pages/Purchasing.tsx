import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  PlusIcon,
  TruckIcon,
  CheckCircleIcon,
  XIcon,
  DownloadIcon,
  Loader2Icon
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { useCurrency } from '../context/CurrencyContext'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrder, PurchaseItem, Product } from '../types';

type Tab = 'new' | 'history';

const statusColors: Record<string, string> = {
  received: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700'
};

export function Purchasing() {
  const { currency, exchangeRate = 300 } = useCurrency(); //
  const symbol = currency === 'LKR' ? 'Rs.' : '$';
  
  // Helper to handle value conversion for display
  const convert = (val: number) => currency === 'LKR' ? val * exchangeRate : val;

  const [tab, setTab] = useState<Tab>('history');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) {
        setProducts(prodData);
        const uniqueSuppliers = Array.from(new Set(prodData.map((p) => p.supplier).filter(Boolean))) as string[];
        setSuppliers(uniqueSuppliers);
      }

      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (poData) {
        const mappedOrders = poData.map(po => ({
          ...po,
          poNumber: po.po_number,
          supplierName: po.supplier_name,
          dueDate: po.due_date,
          date: new Date(po.created_at).toLocaleDateString()
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tab]);

  // --- PDF PURCHASE ORDER GENERATOR ---
  const downloadPO_PDF = (order: PurchaseOrder) => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // Branding Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // ERP Orange
    doc.text("HARDWARE ERP - PURCHASE ORDER", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`PO Number: ${order.poNumber}`, 14, 30);
    doc.text(`Order Date: ${order.date}`, 14, 35);
    doc.text(`Expected Delivery: ${order.dueDate}`, 14, 40);

    // Supplier Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("SUPPLIER:", 14, 55);
    doc.setFontSize(14);
    doc.text(order.supplierName, 14, 62);

    // Items Table
    autoTable(doc, {
      startY: 70,
      head: [['Item Name', 'Quantity', 'Unit Cost', 'Subtotal']],
      body: order.items.map((i: any) => [
        i.productName,
        i.qty,
        `${symbol}${convert(i.costPrice).toLocaleString()}`,
        `${symbol}${convert(i.total).toLocaleString()}`
      ]),
      headStyles: { fillColor: [249, 115, 22] },
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Total Section
    doc.setFontSize(16);
    doc.text(`GRAND TOTAL: ${symbol}${convert(order.total).toLocaleString()}`, 130, finalY);

    doc.save(`PurchaseOrder_${order.poNumber}.pdf`);
  };

  const addItem = (product: any) => {
    setPoItems((prev) => {
      if (prev.find((i) => i.productId === product.id)) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          qty: 1,
          costPrice: product.cost_price || product.costPrice || 0,
          total: product.cost_price || product.costPrice || 0
        }
      ];
    });
    setProductSearch('');
  };

  const updateItem = (productId: string, field: 'qty' | 'costPrice', value: number) => {
    setPoItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const updated = { ...i, [field]: value };
        return { ...updated, total: updated.qty * updated.costPrice };
      })
    );
  };

  const poTotal = poItems.reduce((sum, i) => sum + i.total, 0);

  const createPO = async () => {
    if (!selectedSupplier || poItems.length === 0) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('purchase_orders').insert([{
        po_number: `PO-${Date.now().toString().slice(-6)}`,
        supplier_name: selectedSupplier,
        items: poItems,
        total: poTotal,
        status: 'pending',
        due_date: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        user_id: user?.id
      }]);
      if (error) throw error;
      setPoItems([]);
      setTab('history');
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const receiveOrder = async (order: PurchaseOrder) => {
    if (!window.confirm("Increase stock levels for these items?")) return;
    try {
      await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', order.id);
      for (const item of order.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await supabase.from('products').update({ stock: (product.stock || 0) + item.qty }).eq('id', item.productId);
        }
      }
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-sm">
        <button onClick={() => setTab('new')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'new' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>New Order</button>
        <button onClick={() => setTab('history')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Order History</button>
      </div>

      {tab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3 text-slate-700">Vendor Selection</h3>
              <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all">
                <option value="">Select a registered supplier...</option>
                {suppliers.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-3 text-slate-700">Item Catalog Search</h3>
              <div className="relative mb-4">
                <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-4 py-2.5">
                  <SearchIcon className="w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search by product name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-transparent text-sm w-full outline-none" />
                </div>
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && productSearch.length > 0).length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && productSearch.length > 0).map((p) => (
                      <button key={p.id} onClick={() => addItem(p)} className="w-full flex justify-between items-center px-5 py-3 hover:bg-orange-50 text-sm transition-colors border-b last:border-0">
                        <span className="font-bold text-slate-800">{p.name}</span>
                        <span className="font-black text-orange-600">{symbol}{convert(p.cost_price || p.costPrice || 0).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {poItems.length > 0 ? (
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b text-[10px] uppercase font-black text-slate-400 tracking-widest text-left">
                            <tr><th className="py-4 px-4">Item Name</th><th className="py-4 text-center">Qty</th><th className="py-4 text-right">Cost Price ({symbol})</th><th className="py-4 text-right px-4">Total</th><th className="py-4"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {poItems.map((item) => (
                                <tr key={item.productId} className="group hover:bg-slate-50/50">
                                    <td className="py-4 px-4 font-bold text-slate-900">{item.productName}</td>
                                    <td className="py-4 text-center"><input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.productId, 'qty', parseInt(e.target.value) || 1)} className="w-16 text-center border rounded-lg py-1 font-bold focus:ring-2 focus:ring-orange-500 outline-none" /></td>
                                    <td className="py-4 text-right"><input type="number" step="0.01" value={item.costPrice} onChange={(e) => updateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)} className="w-24 text-right border rounded-lg py-1 px-2 font-medium focus:ring-2 focus:ring-orange-500 outline-none" /></td>
                                    <td className="py-4 text-right font-black text-slate-900 px-4">{symbol}{convert(item.total).toLocaleString()}</td>
                                    <td className="py-4 text-right"><button onClick={() => setPoItems(poItems.filter(i => i.productId !== item.productId))} className="text-slate-300 hover:text-red-600 transition-colors"><XIcon className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                    <TruckIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">Add hardware items to generate an official PO.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-xl p-6 h-fit sticky top-20">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 border-b pb-4">PO Summary</h3>
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Expected Delivery</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                </div>
                <div className="pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex justify-between text-sm font-medium text-slate-500"><span>SKU Count</span><span className="font-bold">{poItems.length}</span></div>
                    <div className="flex justify-between font-black text-2xl text-slate-900 pt-4 border-t-2 border-dashed">
                        <span>Total Pay</span><span className="text-orange-600">{symbol}{convert(poTotal).toLocaleString()}</span>
                    </div>
                </div>
                <button onClick={createPO} disabled={!selectedSupplier || poItems.length === 0 || isLoading} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                    {isLoading ? <Loader2Icon className="animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                    Generate Purchase Order
                </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                    <th className="px-6 py-4">PO Reference</th>
                    <th className="px-6 py-4">Created On</th>
                    <th className="px-6 py-4">Supplier Name</th>
                    <th className="px-6 py-4 text-center">SKUs</th>
                    <th className="px-6 py-4">Arrival Date</th>
                    <th className="px-6 py-4 text-right">Grand Total ({symbol})</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">{order.poNumber}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{order.date}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{order.supplierName}</td>
                    <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-black">{order.items?.length || 0} ITEMS</span></td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{order.dueDate}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{symbol}{convert(order.total).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColors[order.status]}`}>{order.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                        <button onClick={() => setViewOrder(order)} className="text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 px-4 py-1.5 rounded-lg text-slate-600 transition-all">Details</button>
                        <button onClick={() => downloadPO_PDF(order)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Download PDF"><DownloadIcon className="w-4 h-4" /></button>
                        {order.status === 'pending' && (
                            <button onClick={() => receiveOrder(order)} className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"><CheckCircleIcon className="w-3.5 h-3.5" /> Receive</button>
                        )}
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`PO Explorer - ${viewOrder?.poNumber}`} size="lg">
        {viewOrder && (
          <div className="space-y-8 p-1">
            <div className="flex justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor Account</p>
                <p className="font-black text-slate-900 text-xl">{viewOrder.supplierName}</p>
                <p className="text-xs text-slate-400 font-medium mt-1 italic">Initiated on {viewOrder.date}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Status</p>
                <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${statusColors[viewOrder.status]} shadow-sm`}>{viewOrder.status}</span>
                <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-tighter italic">ETA: {viewOrder.dueDate}</p>
              </div>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr>
                    <th className="py-4 px-4">Item Catalog Desc.</th>
                    <th className="py-4 text-center">Qty</th>
                    <th className="py-4 text-right">Unit Rate</th>
                    <th className="py-4 text-right px-6">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {viewOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-all">
                    <td className="py-4 px-4 font-bold text-slate-800">{item.productName}</td>
                    <td className="py-4 text-center font-black text-slate-500">{item.qty}</td>
                    <td className="py-4 text-right font-medium text-slate-500">{symbol}{convert(item.costPrice).toLocaleString()}</td>
                    <td className="py-4 text-right px-6 font-black text-slate-900">{symbol}{convert(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex justify-between items-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Total Purchase Commitment</span>
              <span className="text-4xl font-black text-orange-500 drop-shadow-lg">{symbol}{convert(viewOrder.total).toLocaleString()}</span>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => downloadPO_PDF(viewOrder)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl transition-all shadow-blue-100"><DownloadIcon className="w-5 h-5" /> Export PDF</button>
              <button onClick={() => setViewOrder(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200">Dismiss View</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}