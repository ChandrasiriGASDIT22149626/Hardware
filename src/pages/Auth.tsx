import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, AlertCircleIcon, ShieldCheckIcon, UserCogIcon, ShoppingCartIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; 
import type { User, UserRole } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Default role for new signups is 'super_admin' (Mudalali)
  const [signupRole, setSignupRole] = useState<UserRole>('super_admin');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Registration Logic
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: 'Shop Staff',
              role: signupRole 
            },
          },
        });
        
        if (signUpError) throw signUpError;
        alert('Registration successful! Please confirm your email.');
        setIsSignUp(false); 
      } else {
        // Login Logic
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          const roleFromMetadata = data.user.user_metadata?.role as UserRole;
          console.log("Supabase returned Role:", roleFromMetadata);
          
          const loggedInUser: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.full_name || 'Hardware Staff',
            role: roleFromMetadata || 'retail_user', 
            avatar: data.user.email?.charAt(0).toUpperCase() || 'U'
          };
          onLogin(loggedInUser);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      
      {/* Left Branding Panel (Ash & Gold Theme) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#464646] flex-col justify-between p-12 relative overflow-hidden shadow-2xl z-10">
        {/* Decorative Gold Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-[#DAA520]/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[#DAA520]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo and Brand Name */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg p-1.5 shrink-0">
              <img 
                src="/images/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl tracking-tight leading-none mb-1">
                MUTHUWADIGE
              </span>
              <span className="text-[#DAA520] font-black text-2xl tracking-widest leading-none">
                HARDWARE
              </span>
            </div>
          </div>

          <h2 className="text-5xl font-black text-white leading-[1.1] mb-6">
            Manage your <br/> <span className="text-[#DAA520]">Hardware Business</span> <br/> with Confidence.
          </h2>
          <p className="text-gray-300 text-lg font-medium max-w-md">
            The complete multi-user ERP solution for Owners, Store Managers, and Cashiers.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
             <div className="p-3 bg-[#DAA520]/20 rounded-xl"><ShieldCheckIcon className="text-[#DAA520] w-6 h-6" /></div>
             <div>
                <p className="text-white font-black text-sm">Super Admin</p>
                <p className="text-gray-400 text-xs font-medium mt-0.5">Full control & Executive Finance Reports</p>
             </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
             <div className="p-3 bg-white/10 rounded-xl"><UserCogIcon className="text-white w-6 h-6" /></div>
             <div>
                <p className="text-white font-black text-sm">Shop Manager</p>
                <p className="text-gray-400 text-xs font-medium mt-0.5">Inventory & Supplier Management</p>
             </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
             <div className="p-3 bg-white/10 rounded-xl"><ShoppingCartIcon className="text-gray-300 w-6 h-6" /></div>
             <div>
                <p className="text-white font-black text-sm">Cashier / Sales</p>
                <p className="text-gray-400 text-xs font-medium mt-0.5">Billing, POS & Daily Transactions</p>
             </div>
          </div>
        </div>
      </div>

      {/* Right Side Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-500">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
            
            <h1 className="text-3xl font-black text-[#464646] mb-2">
              {isSignUp ? 'Business Registration' : 'Staff Login'}
            </h1>
            <p className="text-gray-500 mb-8 text-sm font-medium">
              {isSignUp ? 'Select your role and create a new account' : 'Enter your credentials to access the ERP'}
            </p>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 mb-6 text-sm font-bold animate-in slide-in-from-top-2">
                <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {isSignUp && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">System Role</label>
                  <select 
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as UserRole)}
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#DAA520] outline-none text-sm font-bold text-[#464646] bg-gray-50/50 cursor-pointer"
                  >
                    <option value="super_admin">Super Admin (Shop Owner)</option>
                    <option value="admin">Admin (Shop Manager)</option>
                    <option value="retail_user">Retail User (Cashier)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#DAA520] outline-none text-sm font-bold text-[#464646] bg-gray-50/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#DAA520] outline-none text-sm font-bold text-[#464646] pr-12 bg-gray-50/50 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#DAA520] transition-colors"
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#DAA520] hover:bg-[#B8860B] text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-[#DAA520]/20 uppercase tracking-widest text-xs mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying Credentials...' : (isSignUp ? 'Register Account' : 'Secure Login')}
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-xs text-[#464646] hover:text-[#DAA520] font-black uppercase tracking-widest transition-colors"
              >
                {isSignUp ? '← Back to Login' : "Register a new shop account"}
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}