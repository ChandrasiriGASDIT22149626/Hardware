import React, { useState } from 'react';
import { SearchIcon, BellIcon, MenuIcon } from 'lucide-react';
import type { User, PageName } from '../types';
interface HeaderProps {
  currentPage: PageName;
  currentUser: User;
  onMenuToggle: () => void;
}
const pageTitles: Record<
  PageName,
  {
    title: string;
    breadcrumb: string;
  }> =
{
  dashboard: {
    title: 'Dashboard',
    breadcrumb: 'Home / Dashboard'
  },
  inventory: {
    title: 'Inventory Management',
    breadcrumb: 'Operations / Inventory'
  },
  sales: {
    title: 'Sales & Billing',
    breadcrumb: 'Operations / Sales'
  },
  purchasing: {
    title: 'Purchasing',
    breadcrumb: 'Operations / Purchasing'
  },
  customers: {
    title: 'Customer Management',
    breadcrumb: 'Management / Customers'
  },
  employees: {
    title: 'Employee Management',
    breadcrumb: 'Management / Employees'
  },
  accounting: {
    title: 'Accounting & Finance',
    breadcrumb: 'Finance / Accounting'
  },
  reports: {
    title: 'Reports & Analytics',
    breadcrumb: 'Finance / Reports'
  },
  settings: {
    title: 'Settings',
    breadcrumb: 'System / Settings'
  }
};
const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700'
};
export function Header({
  currentPage,
  currentUser,
  onMenuToggle
}: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const pageInfo = pageTitles[currentPage];
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-10">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Toggle menu">

        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-slate-900 leading-none">
          {pageInfo.title}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{pageInfo.breadcrumb}</p>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 w-64">
        <SearchIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-full" />

      </div>

      {/* Notifications */}
      <button
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Notifications">

        <BellIcon className="w-5 h-5" />
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full"
          aria-hidden="true" />

      </button>

      {/* User avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-900 leading-none">
            {currentUser.name}
          </p>
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${roleColors[currentUser.role]}`}>

            {currentUser.role}
          </span>
        </div>
        <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {currentUser.avatar}
        </div>
      </div>
    </header>);

}