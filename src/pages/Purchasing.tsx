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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PurchaseOrder, PurchaseItem, Product } from '../types';

type Tab = 'new' | 'history';

const statusColors: Record<string, string> = {
  received: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-[#464646]/10 text-[#464646]', // Ash color for pending
  cancelled: 'bg-red-100 text-red-700'
};

export function Purchasing() {
  // PERMANENT FIX: Hardcode the symbol to Rs.
  const symbol = 'Rs.';
  const convert = (val: number) => val; 

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

    // Branding Header (Gold Theme)
    doc.setFontSize(22);
    doc.setTextColor(218, 165, 32); 
    doc.text("HARDWARE ERP - PURCHASE ORDER", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`PO Number: ${order.poNumber}`, 14, 30);
    doc.text(`Order Date: ${order.date}`, 14, 35);
    doc.text(`Expected Delivery: ${order.dueDate}`, 14, 40);

    // Supplier Info
    doc.setFontSize(12);
    doc.setTextColor(70, 70, 70);
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
        `${symbol} ${convert(i.costPrice).toLocaleString()}`,
        `${symbol} ${convert(i.total).toLocaleString()}`
      ]),
      headStyles: { fillColor: [218, 165, 32] }, // Gold Table Header
      theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Total Section
    doc.setFontSize(16);
    doc.setTextColor(70, 70, 70); // Ash Text
    doc.text(`GRAND TOTAL: ${symbol} ${convert(order.total).toLocaleString()}`, 120, finalY);

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
      <div className="flex gap-1 bg-white p-1 rounded-xl w-fit border border-gray-200 shadow-sm">
        <button onClick={() => setTab('new')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'new' ? 'bg-[#464646] text-white shadow-md' : 'text-gray-500 hover:text-[#464646] hover:bg-gray-50'}`}>New Order</button>
        <button onClick={() => setTab('history')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-[#464646] text-white shadow-md' : 'text-gray-500 hover:text-[#464646] hover:bg-gray-50'}`}>Order History</button>
      </div>

      {tab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-black text-[#464646] mb-3 uppercase tracking-widest">Vendor Selection</h3>
              <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520] bg-white cursor-pointer transition-all">
                <option value="">Select a registered supplier...</option>
                {suppliers.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-black text-[#464646] mb-3 uppercase tracking-widest">Item Catalog Search</h3>
              <div className="relative mb-4">
                <div className="flex items-center gap-3 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#DAA520]/20 transition-all">
                  <SearchIcon className="w-5 h-5 text-gray-400 focus-within:text-[#DAA520]" />
                  <input type="text" placeholder="Search by product name..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-transparent text-sm font-bold text-[#464646] outline-none w-full" />
                </div>
                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && productSearch.length > 0).length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto custom-scrollbar">
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && productSearch.length > 0).map((p) => (
                      <button key={p.id} onClick={() => addItem(p)} className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 text-sm transition-colors border-b border-gray-50 last:border-0 text-left">
                        <span className="font-black text-[#464646]">{p.name}</span>
                        <span className="font-black text-[#DAA520]">{symbol} {convert(p.cost_price || p.costPrice || 0).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {poItems.length > 0 ? (
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 tracking-widest">
                            <tr><th className="py-4 px-4">Item Name</th><th className="py-4 text-center">Qty</th><th className="py-4 text-right">Cost Price ({symbol})</th><th className="py-4 text-right px-4">Total</th><th className="py-4"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {poItems.map((item) => (
                                <tr key={item.productId} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-4 font-black text-[#464646]">{item.productName}</td>
                                    <td className="py-4 text-center"><input type="number" min={1} value={item.qty} onChange={(e) => updateItem(item.productId, 'qty', parseInt(e.target.value) || 1)} className="w-16 text-center border border-gray-200 rounded-lg py-1.5 font-bold text-[#464646] focus:ring-2 focus:ring-[#DAA520] outline-none" /></td>
                                    <td className="py-4 text-right"><input type="number" step="0.01" value={item.costPrice} onChange={(e) => updateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)} className="w-24 text-right border border-gray-200 rounded-lg py-1.5 px-3 font-bold text-[#464646] focus:ring-2 focus:ring-[#DAA520] outline-none" /></td>
                                    <td className="py-4 text-right font-black text-[#DAA520] px-4">{symbol} {convert(item.total).toLocaleString()}</td>
                                    <td className="py-4 text-right"><button onClick={() => setPoItems(poItems.filter(i => i.productId !== item.productId))} className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><XIcon className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400">
                    <TruckIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold">Add hardware items to generate an official PO.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 h-fit sticky top-20">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 border-b border-gray-100 pb-4 text-[#464646]">PO Summary</h3>
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Expected Delivery</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl font-bold text-[#464646] outline-none focus:ring-2 focus:ring-[#DAA520] transition-all" />
                </div>
                <div className="pt-5 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between text-sm font-black text-gray-400 uppercase tracking-widest"><span>SKU Count</span><span className="font-black text-[#464646]">{poItems.length}</span></div>
                    <div className="flex justify-between font-black text-2xl text-[#464646] pt-5 border-t-2 border-dashed border-gray-200">
                        <span className="uppercase tracking-widest text-lg flex items-center">Total Pay</span><span className="text-[#DAA520]">{symbol} {convert(poTotal).toLocaleString()}</span>
                    </div>
                </div>
                <button onClick={createPO} disabled={!selectedSupplier || poItems.length === 0 || isLoading} className="w-full bg-[#DAA520] text-white font-black py-4 rounded-xl shadow-lg shadow-[#DAA520]/20 hover:bg-[#B8860B] disabled:bg-gray-100 disabled:text-gray-300 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                    {isLoading ? <Loader2Icon className="animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                    Generate Purchase Order
                </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                    <th className="px-6 py-5">PO Reference</th>
                    <th className="px-6 py-5">Created On</th>
                    <th className="px-6 py-5">Supplier Name</th>
                    <th className="px-6 py-5 text-center">SKUs</th>
                    <th className="px-6 py-5">Arrival Date</th>
                    <th className="px-6 py-5 text-right">Grand Total ({symbol})</th>
                    <th className="px-6 py-5 text-center">Status</th>
                    <th className="px-6 py-5 text-center">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-[#464646]">{order.poNumber}</td>
                    <td className="px-6 py-4 text-gray-500 font-bold">{order.date}</td>
                    <td className="px-6 py-4 font-black text-[#464646]">{order.supplierName}</td>
                    <td className="px-6 py-4 text-center"><span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{order.items?.length || 0} ITEMS</span></td>
                    <td className="px-6 py-4 text-gray-500 font-bold">{order.dueDate}</td>
                    <td className="px-6 py-4 text-right font-black text-[#DAA520]">{symbol} {convert(order.total).toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColors[order.status]}`}>{order.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                        <button onClick={() => setViewOrder(order)} className="text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-600 transition-all">Details</button>
                        <button onClick={() => downloadPO_PDF(order)} className="p-2 text-gray-400 hover:text-[#DAA520] hover:bg-[#DAA520]/10 rounded-lg transition-all" title="Download PDF"><DownloadIcon className="w-5 h-5" /></button>
                        {order.status === 'pending' && (
                            <button onClick={() => receiveOrder(order)} className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"><CheckCircleIcon className="w-3.5 h-3.5" /> Receive</button>
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
            <div className="flex justify-between bg-gray-50 p-6 rounded-[24px] border border-gray-100 shadow-inner">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendor Account</p>
                <p className="font-black text-[#464646] text-2xl">{viewOrder.supplierName}</p>
                <p className="text-xs text-gray-400 font-bold mt-1">Initiated on {viewOrder.date}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Order Status</p>
                <span className={`inline-block px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${statusColors[viewOrder.status]} shadow-sm`}>{viewOrder.status}</span>
                <p className="text-[10px] font-bold text-gray-500 mt-3 uppercase tracking-widest">ETA: {viewOrder.dueDate}</p>
              </div>
            </div>
            
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <tr>
                    <th className="py-4 px-4">Item Catalog Desc.</th>
                    <th className="py-4 text-center">Qty</th>
                    <th className="py-4 text-right">Unit Rate</th>
                    <th className="py-4 text-right px-6">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {viewOrder.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-all">
                    <td className="py-4 px-4 font-black text-[#464646]">{item.productName}</td>
                    <td className="py-4 text-center font-black text-gray-500">{item.qty}</td>
                    <td className="py-4 text-right font-bold text-gray-500">{symbol} {convert(item.costPrice).toLocaleString()}</td>
                    <td className="py-4 text-right px-6 font-black text-[#DAA520]">{symbol} {convert(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="bg-[#464646] text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex justify-between items-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#DAA520]/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <span className="font-black text-gray-300 uppercase tracking-widest text-xs relative z-10">Total Purchase Commitment</span>
              <span className="text-4xl font-black text-[#DAA520] drop-shadow-lg relative z-10">{symbol} {convert(viewOrder.total).toLocaleString()}</span>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => downloadPO_PDF(viewOrder)} className="flex-1 py-4 bg-[#464646] text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#333333] shadow-xl transition-all shadow-[#464646]/20"><DownloadIcon className="w-5 h-5" /> Export PDF</button>
              <button onClick={() => setViewOrder(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">Dismiss View</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}