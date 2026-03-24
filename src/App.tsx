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
  
  // --- Splash Screen State ---
  const [showSplash, setShowSplash] = useState(true);

  // --- Splash Screen Timer (4 seconds) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // --- SECURITY GUARD: Role-Based Access Control ---
  useEffect(() => {
    if (currentUser) {
      const allowedPages = ROLE_PERMISSIONS[currentUser.role] || [];
      
      if (!allowedPages.includes(currentPage)) {
        console.warn(`Access Denied: ${currentUser.role} cannot access ${currentPage}`);
        
        if (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager') {
          setCurrentPage('dashboard');
        } else {
          setCurrentPage('sales');
        }
      }
    }
  }, [currentPage, currentUser]);

  const handleLogin = (user: User) => {
    console.log("✅ User logged in with role:", user.role); 
    setCurrentUser(user);
    
    if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager') {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('sales'); 
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  // ==========================================
  // 1. RENDER SPLASH SCREEN (First 4 Seconds)
  // ==========================================
  if (showSplash) {
    return (
      <div 
        className="h-screen w-full relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1541888086225-eb81f8f6d78c?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Ash overlay with Gold glow */}
        <div className="absolute inset-0 bg-[#2b2b2b]/85 z-0 flex items-center justify-center overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-[#DAA520]/10 rounded-full blur-[100px] z-[-1]" />
        </div>
        
        {/* Central Content Container with Custom Pop-Up Animation */}
        <div className="flex flex-col items-center animate-pop-up relative z-10">
          
          {/* Bigger Logo with No White Background + Gold Drop Shadow */}
          <div className="relative mb-10 w-64 h-64 flex items-center justify-center drop-shadow-[0_15px_35px_rgba(218,165,32,0.3)]">
             <img 
               src="/images/logo.png" 
               alt="Hardware Logo" 
               className="w-full h-full object-contain" 
               onError={(e) => { e.currentTarget.style.display = 'none'; }}
             />
          </div>
          
          {/* Branding Section */}
          <div className="text-center mb-8 px-6">
            <h1 className="text-gray-100 font-bold text-5xl md:text-6xl tracking-tighter mb-4 font-sans drop-shadow-lg">
              <span className="text-[#DAA520] font-black">H</span>ardware <span className="text-[#DAA520] font-black">ERP</span>
            </h1>
            <h2 className="text-[#DAA520] font-black text-2xl md:text-3xl tracking-widest uppercase border-t border-gray-500/40 pt-5 mb-8">
              Muthuwadige Hardware
            </h2>
          </div>
          
          {/* Details & Contacts */}
          <div className="bg-[#333333]/80 backdrop-blur-md border border-[#DAA520]/20 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-4 px-12 md:px-20">
            <p className="text-gray-200 text-sm md:text-base font-black tracking-widest uppercase drop-shadow-md">
              No: 80, Mahahunupitiya, Negombo
            </p>
            <p className="text-[#DAA520] font-black text-3xl md:text-4xl tracking-widest drop-shadow-lg">
              📞 077 076 076 7
            </p>
          </div>
          
          {/* Loading Indicator */}
          <div className="mt-16 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[#DAA520]/30 border-t-[#DAA520] rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(218,165,32,0.5)]"></div>
            <p className="text-[#DAA520] text-xs font-black uppercase tracking-widest animate-pulse drop-shadow-md">Loading System...</p>
          </div>
        </div>

        {/* CSS Keyframes for Pop-up Animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pop-up {
            0% { transform: scale(0.85); opacity: 0; }
            60% { transform: scale(1.02); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-pop-up {
            animation: pop-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}} />
      </div>
    );
  }

  // ==========================================
  // 2. RENDER LOGIN PAGE (If not logged in)
  // ==========================================
  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  // ==========================================
  // 3. RENDER MAIN APPLICATION
  // ==========================================
  const renderPage = () => {
    const allowedPages = ROLE_PERMISSIONS[currentUser.role] || [];
    
    if (!allowedPages.includes(currentPage)) {
      return (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager') 
        ? <Dashboard /> 
        : <Sales />;
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'sales': return <Sales />;
      case 'purchasing': return <Purchasing />;
      case 'customers': return <Customers />;
      case 'accounting': return <Accounting />;
      case 'employees': return <Employees />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <CurrencyProvider>
      <div className="flex h-screen w-full bg-gray-50 overflow-hidden animate-in fade-in duration-700">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          currentUser={currentUser}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)} 
        />

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
          
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-[#464646]/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </div>
      </div>
    </CurrencyProvider>
  );
}