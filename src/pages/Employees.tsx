import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  PlusIcon,
  UserCheckIcon,
  EditIcon,
  EyeIcon,
  Trash2Icon,
  CalendarIcon
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { supabase } from '../lib/supabaseClient';
import type { Employee } from '../types';

const departments = [
  'All',
  'Management',
  'Sales',
  'Warehouse',
  'Finance',
  'Human Resources'
];

const roles = [
  'Manager',
  'Cashier',
  'Inventory Clerk',
  'Accountant',
  'Sales Associate',
  'HR Manager'
];

const emptyEmployee: Omit<Employee, 'id'> = {
  name: '',
  role: 'Cashier',
  department: 'Sales',
  email: '',
  phone: '',
  salary: 0,
  joinDate: new Date().toISOString().split('T')[0],
  status: 'active',
  attendance: 100
};

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>(emptyEmployee);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedData = data.map(emp => ({
          ...emp,
          joinDate: emp.join_date || emp.created_at?.split('T')[0],
          salary: Number(emp.salary) || 0,
          attendance: Number(emp.attendance) || 100
        }));
        setEmployees(mappedData);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All' || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const avgSalary = employees.length > 0 
    ? employees.reduce((sum, e) => sum + e.salary, 0) / employees.length 
    : 0;

  const openAdd = () => {
    setEditingEmployee(null);
    setFormData(emptyEmployee);
    setShowAddModal(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ ...employee });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("Session expired");

      const dbPayload = {
        name: formData.name,
        role: formData.role,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        salary: formData.salary,
        join_date: formData.joinDate,
        status: formData.status,
        attendance: formData.attendance,
        user_id: user.id
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(dbPayload)
          .eq('id', editingEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([dbPayload]);
        if (error) throw error;
      }

      fetchEmployees();
      setShowAddModal(false);
    } catch (error: any) {
      alert("Error saving employee: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff record?")) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchEmployees();
  };

  const getAttendanceColor = (pct: number) => {
    if (pct >= 95) return 'text-emerald-600';
    if (pct >= 85) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Active Now</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Avg Salary</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${avgSalary.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <p className="text-xs text-slate-500 font-medium">Attendance Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">94%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
          <SearchIcon className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-700 outline-none w-full"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
        >
          {departments.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md shadow-orange-100">
          <PlusIcon className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Role / Dept</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Salary</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Join Date</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Attendance</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{emp.role}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.department}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    ${emp.salary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs italic font-medium">
                    {emp.joinDate}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-black ${getAttendanceColor(emp.attendance)}`}>
                      {emp.attendance}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewEmployee(emp)} className="p-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"><EyeIcon className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEdit(emp)} className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"><EditIcon className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"><Trash2Icon className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingEmployee ? 'Update Staff Member' : 'Register New Employee'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Legal Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Role</label>
            <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
            <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
              {departments.filter(d => d !== 'All').map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Monthly Salary ($)</label>
            <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Official Join Date</label>
            <input type="date" value={formData.joinDate} onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
          </div>

          {/* ADDED: Attendance Field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Attendance (%)</label>
            <input 
              type="number" 
              min={0} 
              max={100} 
              value={formData.attendance} 
              onChange={(e) => setFormData({ ...formData, attendance: parseInt(e.target.value) || 0 })} 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500" 
            />
          </div>

          {/* ADDED: Status Field */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Employment Status</label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })} 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive (Former)</option>
            </select>
          </div>

          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
          <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-md shadow-orange-100 transition-all">
            {editingEmployee ? 'Save Changes' : 'Register Staff Member'}
          </button>
        </div>
      </Modal>

      {/* View Modal logic remains optimized for full details display */}
      <Modal isOpen={!!viewEmployee} onClose={() => setViewEmployee(null)} title="Detailed Staff Profile" size="md">
        {viewEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl uppercase">{viewEmployee.name.charAt(0)}</div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{viewEmployee.name}</h3>
                <p className="text-slate-500 font-medium">{viewEmployee.role} • {viewEmployee.department}</p>
                <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase mt-2 ${viewEmployee.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{viewEmployee.status}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12 text-sm">
              <div><p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Salary</p><p className="font-black text-lg text-orange-600">${viewEmployee.salary.toLocaleString()}</p></div>
              <div><p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Joined Date</p><p className="font-bold text-slate-800">{viewEmployee.joinDate}</p></div>
              <div><p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Performance</p><p className={`font-black text-lg ${getAttendanceColor(viewEmployee.attendance)}`}>{viewEmployee.attendance}%</p></div>
              <div><p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">Contact</p><p className="font-bold text-slate-800">{viewEmployee.phone || 'N/A'}</p></div>
            </div>
            <button onClick={() => setViewEmployee(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors mt-4">Return to Staff List</button>
          </div>
        )}
      </Modal>
    </div>
  );
}