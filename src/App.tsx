import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Sales } from './pages/Sales';
import { Purchasing } from './pages/Purchasing';
import { Customers } from './pages/Customers';
import { Accounting } from './pages/Accounting';
import { Employees } from './pages/Employees';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { CurrencyProvider } from './context/CurrencyContext';
import { ROLE_PERMISSIONS } from './utils/permissions'; 
import type { User, PageName } from './types';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageName>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- SECURITY GUARD: Role-Based Access Control ---
  useEffect(() => {
    if (currentUser) {
      const allowedPages = ROLE_PERMISSIONS[currentUser.role] || [];
      
      // If the current page isn't in the allowed list for this role, redirect to a safe default
      if (!allowedPages.includes(currentPage)) {
        console.warn(`Access Denied: ${currentUser.role} cannot access ${currentPage}`);
        
        // STRICT FALLBACK LOGIC
        if (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager') {
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('sales');
        }
      }
    }
  }, [currentPage, currentUser]);

  const handleLogin = (user: User) => {
    // Debugging line to check what Supabase is actually returning
    console.log("✅ User logged in with role:", user.role); 
    
    setCurrentUser(user);
    
    // EXPLICIT ROLE-BASED INITIAL REDIRECT
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager') {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('sales'); // Send retail_user and cashier straight to billing
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  // Final rendering logic with permission verification
  const renderPage = () => {
    const allowedPages = ROLE_PERMISSIONS[currentUser.role] || [];
    
    // Double-check: If they shouldn't be here, don't even mount the component
    if (!allowedPages.includes(currentPage)) {
      return (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager') 
        ? <Dashboard /> 
        : <Sales />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'sales':
        return <Sales />;
      case 'purchasing':
        return <Purchasing />;
      case 'customers':
        return <Customers />;
      case 'accounting':
        return <Accounting />;
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <CurrencyProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          currentUser={currentUser}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Application Area */}
        {/* Note: lg:ml-64 matches the Sidebar width for desktop layout */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64 relative">
          <Header
            currentPage={currentPage}
            currentUser={currentUser}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)} 
          />

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto h-full">
              {renderPage()}
            </div>
          </main>
          
          {/* Mobile Overlay for Sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </CurrencyProvider>
  );
}