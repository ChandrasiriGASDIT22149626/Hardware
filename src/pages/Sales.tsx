import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  PlusIcon,
  Trash2Icon,
  ShoppingCartIcon,
  ReceiptIcon,
  XIcon,
  DownloadIcon,
  Loader2Icon,
  CheckCircleIcon,
  UserIcon
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import { useCurrency } from '../context/CurrencyContext'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SaleOrder, SaleItem, Customer, Product } from '../types';

type Tab = 'new' | 'history';

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700'
};

export function Sales() {
  const { currency, exchangeRate = 300 } = useCurrency(); 
  const symbol = currency === 'LKR' ? 'Rs.' : '$';
  const convert = (val: number) => currency === 'LKR' ? val * exchangeRate : val;

  const [tab, setTab] = useState<Tab>('new');
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [isGuest, setIsGuest] = useState(false);
  const [guestName, setGuestName] = useState('Guest Customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(8); 
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<SaleOrder | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) setProducts(prodData);

      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) setCustomers(custData);

      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (salesData) {
        const mappedOrders = salesData.map(s => ({
          ...s,
          invoiceNo: s.invoice_no,
          customerName: s.customer_name,
          date: new Date(s.created_at).toLocaleDateString(),
          total: s.total_amount 
        }));
        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tab]);

  const downloadReceiptPDF = (order: SaleOrder) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }); 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const gold = [218, 165, 32];
    const darkSilver = [70, 70, 70];

    doc.setFillColor(darkSilver[0], darkSilver[1], darkSilver[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.rect(pageWidth - 65, 0, 45, 55, 'F');

    try {
      doc.addImage('/images/logo.png', 'PNG', 15, 7.5, 30, 30);
    } catch(e) {
      console.warn("Logo not found at /images/logo.png");
    }

    doc.setTextColor(255, 255, 255); 
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("MUTHUWADIGE HARDWARE", 50, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("No: 80, Mahahunupitiya, Negombo", 50, 27);
    doc.text("Contact: 077 076 076 7", 50, 32);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text("Invoice", pageWidth - 42.5, 30, { align: 'center' }); 

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("BILL TO:", 15, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customerName, 15, 72);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice No:`, pageWidth - 65, 65);
    doc.text(`Issue Date:`, pageWidth - 65, 72);
    
    doc.setFont('helvetica', 'normal');
    doc.text(order.invoiceNo, pageWidth - 15, 65, { align: 'right' });
    doc.text(order.date, pageWidth - 15, 72, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(15, 80, pageWidth - 15, 80);

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: order.items.map((i: any) => [
        i.productName, 
        i.qty, 
        `${symbol}${convert(i.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        `${symbol}${convert(i.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      ]),
      theme: 'plain',
      headStyles: { 
        fillColor: gold,
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { textColor: 50 },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const summaryXText = pageWidth - 65; 
    const summaryXValue = pageWidth - 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    doc.text("Sub Total:", summaryXText, finalY);
    doc.text(`${symbol}${convert(order.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, summaryXValue, finalY, { align: 'right' });

    doc.text("Discount:", summaryXText, finalY + 8);
    doc.text(`-${symbol}${convert(order.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, summaryXValue, finalY + 8, { align: 'right' });

    doc.text(`Tax (${order.tax_rate || 0}%):`, summaryXText, finalY + 16);
    doc.text(`+${symbol}${convert(order.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, summaryXValue, finalY + 16, { align: 'right' });

    doc.setFillColor(245, 245, 245);
    doc.rect(summaryXText - 3, finalY + 22, 56, 12, 'F');
    doc.setFontSize(11);
    doc.text("Total Due:", summaryXText, finalY + 30);
    doc.text(`${symbol}${convert(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, summaryXValue, finalY + 30, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(218, 165, 32); 
    doc.text("NOTES", 15, finalY + 15);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text("Please feel free to contact us in case of any questions.", 15, finalY + 22);
    doc.setFont('helvetica', 'bold');
    doc.text("Thank you for your business!", 15, finalY + 29);

    doc.setDrawColor(150, 150, 150);
    doc.line(pageWidth - 60, finalY + 55, pageWidth - 15, finalY + 55);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text("Authorized Signee", pageWidth - 37.5, finalY + 60, { align: 'center' });

    doc.setFillColor(darkSilver[0], darkSilver[1], darkSilver[2]);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

    doc.save(`Invoice_${order.invoiceNo}.pdf`);
  };

  const filteredProducts = products.filter(
    (p) =>
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
       p.sku.toLowerCase().includes(productSearch.toLowerCase())) &&
      productSearch.length > 0
  );

  // --- FIXED STOCK VALIDATION LOGIC ---
  const addToCart = (product: Product) => {
    // 1. Force the database value into a strict number (fallback to 0 if null/undefined)
    const stockAvailable = Number(product.stock) || 0;

    if (stockAvailable <= 0) {
      return alert("This item is currently out of stock!");
    }

    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const currentCartQty = existing ? existing.qty : 0;

      // 2. Prevent adding more items than exist in the database
      if (currentCartQty + 1 > stockAvailable) {
        alert(`Cannot add more. Only ${stockAvailable} ${product.unit}(s) available in stock!`);
        return prev; 
      }

      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i
        );
      }
      
      return [...prev, {
        productId: product.id, 
        productName: product.name, 
        qty: 1, 
        price: product.price, 
        taxRate: taxRate, 
        total: product.price
      }];
    });
    setProductSearch('');
  };

  const updateQty = (productId: string, newQty: number) => {
    const product = products.find(p => p.id === productId);
    const stockAvailable = product ? (Number(product.stock) || 0) : 0;

    // Prevent cashier from manually typing a quantity higher than available stock
    if (newQty > stockAvailable) {
      alert(`Only ${stockAvailable} item(s) available in stock!`);
      newQty = stockAvailable; // Force input back down to maximum allowed stock
    }

    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setCartItems((prev) => prev.map((i) => i.productId === productId ? { ...i, qty: newQty, total: newQty * i.price } : i));
    }
  };

  const subtotal = cartItems.reduce((sum, i) => sum + i.total, 0);
  const discountAmt = subtotal * (discount / 100);
  const taxAmt = (subtotal - discountAmt) * (taxRate / 100);
  const totalAmountValue = subtotal - discountAmt + taxAmt;

  const processSale = async () => {
    if ((!isGuest && !selectedCustomer) || cartItems.length === 0) {
        return alert("Please select a customer or use Guest Checkout");
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const newOrderData = {
        invoice_no: `INV-${Date.now()}`,
        customer_id: isGuest ? null : selectedCustomer?.id, 
        customer_name: isGuest ? guestName : selectedCustomer?.name,
        items: cartItems,
        subtotal,
        discount: discountAmt,
        tax: taxAmt,
        tax_rate: taxRate, 
        total_amount: totalAmountValue,
        status: 'paid',
        user_id: user?.id
      };

      const { data: saleRecord, error: saleError } = await supabase.from('sales').insert([newOrderData]).select().single();
      if (saleError) throw saleError;

      for (const item of cartItems) {
        const product = products.find(p => p.id === item.productId);
        if (product) await supabase.from('products').update({ stock: product.stock - item.qty }).eq('id', item.productId);
      }

      setLastOrder({
        ...saleRecord,
        invoiceNo: saleRecord.invoice_no,
        customerName: saleRecord.customer_name,
        date: new Date().toLocaleDateString(),
        total: saleRecord.total_amount
      });
      setShowReceipt(true);
      setCartItems([]);
      setSelectedCustomer(null);
      setIsGuest(false); 
      setGuestName('Guest Customer');
      setDiscount(0);
      fetchData(); 
    } catch (error: any) {
      alert("Sale failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch = o.invoiceNo?.toLowerCase().includes(historySearch.toLowerCase()) || 
                        o.customerName?.toLowerCase().includes(historySearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-4 animate-in fade-in duration-500">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 shadow-sm">
        <button onClick={() => setTab('new')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>New Sale</button>
        <button onClick={() => setTab('history')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sales History</button>
      </div>

      {tab === 'new' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-orange-500" /> Customer Details
                </h3>
                <button 
                  onClick={() => {
                    setIsGuest(!isGuest);
                    setSelectedCustomer(null);
                  }}
                  className={`text-[10px] uppercase font-black px-3 py-1.5 rounded-lg transition-all border ${isGuest ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                >
                  {isGuest ? 'Switch to Registered' : 'Use Guest Checkout'}
                </button>
              </div>

              {!isGuest ? (
                <select 
                  value={selectedCustomer?.id || ''} 
                  onChange={(e) => setSelectedCustomer(customers.find((c) => c.id === e.target.value) || null)} 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  <option value="">Select a registered customer...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                </select>
              ) : (
                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                    <input 
                        type="text" 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Enter Guest Name (Optional)"
                        className="w-full px-4 py-2.5 border border-orange-200 bg-orange-50/30 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <ShoppingCartIcon className="w-4 h-4 text-orange-500" /> Inventory Search
              </h3>
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                  <SearchIcon className="w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search by name or SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="bg-transparent text-sm text-slate-700 outline-none w-full" />
                </div>
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-60 overflow-y-auto">
                    {filteredProducts.map((p) => (
                      <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-orange-50 border-b border-slate-50 last:border-0 transition-colors">
                        <div><p className="text-sm font-bold text-slate-900">{p.name}</p><p className="text-[10px] text-slate-400 uppercase font-black">Stock: {p.stock} {p.unit}</p></div>
                        <span className="text-sm font-black text-orange-600">{symbol}{convert(p.price).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {cartItems.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest"><th className="text-left py-3">Product</th><th className="text-center py-3">Qty</th><th className="text-right py-3">Price</th><th className="text-right py-3">Total</th><th className="w-10"></th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {cartItems.map((item) => (
                        <tr key={item.productId}>
                          <td className="py-3 font-bold text-slate-900">{item.productName}</td>
                          <td className="py-3 text-center">
                            {/* Updated max attribute dynamically for fallback safety */}
                            <input type="number" min={1} max={products.find(p => p.id === item.productId)?.stock || 1} value={item.qty} onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 0)} className="w-14 text-center border rounded-lg py-1 font-bold outline-none focus:ring-2 focus:ring-orange-500" />
                          </td>
                          <td className="py-3 text-right text-slate-500">{symbol}{convert(item.price).toLocaleString()}</td>
                          <td className="py-3 text-right font-black text-slate-900">{symbol}{convert(item.total).toLocaleString()}</td>
                          <td className="py-3 text-right"><button onClick={() => updateQty(item.productId, 0)} className="text-slate-300 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 h-fit sticky top-20">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b pb-4">Order Summary</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Discount (%)</label>
                <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tax Rate (%)</label>
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50">
                <div className="flex justify-between text-sm font-medium text-slate-500"><span>Subtotal</span><span>{symbol}{convert(subtotal).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm font-medium text-red-500"><span>Savings</span><span>-{symbol}{convert(discountAmt).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm font-medium text-slate-500"><span>Total Tax ({taxRate}%)</span><span>+{symbol}{convert(taxAmt).toLocaleString()}</span></div>
                <div className="flex justify-between font-black text-2xl text-slate-900 pt-4 border-t-2 border-dashed"><span>Payable</span><span className="text-orange-600">{symbol}{convert(totalAmountValue).toLocaleString()}</span></div>
              </div>
            </div>
            <button onClick={processSale} disabled={(!isGuest && !selectedCustomer) || cartItems.length === 0 || isLoading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-300 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
              {isLoading ? <Loader2Icon className="animate-spin" /> : <ReceiptIcon className="w-5 h-5" />}
              Complete Checkout
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4 animate-in slide-in-from-bottom duration-500">
            <div className="relative bg-white rounded-xl border border-slate-100 shadow-sm p-4 w-full md:w-1/2">
              <SearchIcon className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search invoices by ID or Customer..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-widest">
                  <tr><th className="px-6 py-4">Invoice</th><th className="px-6 py-4">Date</th><th className="px-6 py-4">Customer</th><th className="px-6 py-4 text-center">Items</th><th className="px-6 py-4 text-right">Total ({symbol})</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">{order.invoiceNo}</td>
                      <td className="px-6 py-4 text-slate-500">{order.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{order.customerName}</td>
                      <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold">{order.items?.length || 0} SKU</span></td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">{symbol}{convert(order.total).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${statusColors[order.status] || 'bg-slate-100'}`}>{order.status}</span></td>
                      <td className="px-6 py-4 text-center flex justify-center gap-2">
                        <button onClick={() => downloadReceiptPDF(order)} className="text-[10px] font-black uppercase bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5"><DownloadIcon className="w-3 h-3" /> PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}

      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Transaction Verified" size="sm">
        {lastOrder && (
          <div className="space-y-6 p-4 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100"><CheckCircleIcon className="w-10 h-10" /></div>
            <div>
              <h4 className="font-black text-xl text-slate-900">Success!</h4>
              <p className="text-sm text-slate-400 font-medium italic mt-1">Invoice #{lastOrder.invoiceNo} has been processed for {lastOrder.customerName}.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => downloadReceiptPDF(lastOrder)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-100"><DownloadIcon className="w-4 h-4" /> Download Receipt</button>
              <button onClick={() => setShowReceipt(false)} className="w-full bg-slate-100 text-slate-500 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200">Dismiss</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}