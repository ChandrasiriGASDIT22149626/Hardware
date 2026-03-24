export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  supplier: string;
  unit: string;
  barcode: string;
  cost_Price:number;


}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  totalPurchases: number;
  joinDate: string;
  customer_id: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  balance: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  total: number;
  taxRate: number;
}

export interface SaleOrder {
  id: string;
  invoiceNo: string;
  invoice_no?: string;
  customer_id: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'cancelled';
  date: string;
  cashier: string;
  total_amount: number;
  created_at: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  qty: number;
  costPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  total: number;
  status: 'received' | 'pending' | 'cancelled';
  date: string;
  dueDate: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
  joinDate: string;
  status: 'active' | 'inactive';
  attendance: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  reference: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  avatar: string;
}
// 1. Define all possible roles in one place
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier' | 'retail_user';

// 2. Update the User interface (Delete the old duplicate version)
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Use the type defined above
  avatar: string;
}

// 3. Ensure PageName includes all your pages
export type PageName = 
  | 'dashboard' 
  | 'inventory' 
  | 'sales' 
  | 'purchasing' 
  | 'customers' 
  | 'accounting' 
  | 'employees' 
  | 'reports' 
  | 'settings';