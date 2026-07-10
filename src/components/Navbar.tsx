import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { 
  AreaChart, 
  LogOut, 
  Settings, 
  ShieldAlert, 
  User as UserIcon, 
  Menu, 
  X, 
  CreditCard, 
  Sparkles, 
  ShieldCheck 
} from "lucide-react";

interface NavbarProps {
  currentView: string;
  onNavigate: (view: "login" | "signup" | "dashboard" | "admin") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      onNavigate("login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: AreaChart,
      view: "dashboard" as const,
      visible: true,
    },
    {
      id: "admin",
      label: "Admin Panel",
      icon: Settings,
      view: "admin" as const,
      visible: user.role === "ADMIN",
    },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">
            <AreaChart className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">SaaSMetrics</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 hover:bg-slate-800 rounded-lg transition"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Side Drawer */}
      <aside 
        className={`md:hidden fixed top-[53px] bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex-1 py-6 space-y-1">
          <div className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Main Menu</div>
          {navItems.filter(item => item.visible).map(item => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.view);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-6 py-3 transition text-left cursor-pointer border-l-4 ${
                  active 
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-medium" 
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Mobile Plan Status Card */}
        <div className="p-6 mt-auto">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-tighter">
                {user.plan === "PRO" ? "Pro Plan" : "Free Plan"}
              </span>
              <span className={`h-2 w-2 rounded-full ${user.plan === "PRO" ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
            </div>
            <p className="text-white text-xs font-medium mb-3">
              {user.plan === "PRO" ? "⭐️ Pro Subscription Active" : "Upgrade for higher limits"}
            </p>
            {user.role === "ADMIN" && user.plan !== "PRO" && (
              <button
                onClick={() => {
                  onNavigate("admin");
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-semibold shadow-lg shadow-indigo-900/50 transition cursor-pointer"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("dashboard")}>
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              <AreaChart className="h-5 w-5" />
            </div>
            <span className="text-white font-bold tracking-tight text-xl">SaaSMetrics</span>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <div className="px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Main Menu</div>
          {navItems.filter(item => item.visible).map(item => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.view)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition text-left cursor-pointer border-l-4 ${
                  active 
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-medium" 
                    : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Plan Status Card */}
        <div className="p-6 mt-auto">
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 uppercase tracking-tighter">
                {user.plan === "PRO" ? "Pro Plan" : "Free Plan"}
              </span>
              <span className={`h-2 w-2 rounded-full ${user.plan === "PRO" ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
            </div>
            <p className="text-white text-xs font-medium mb-3">
              {user.plan === "PRO" ? "⭐️ Pro Subscription Active" : "Upgrade for higher limits"}
            </p>
            {user.role === "ADMIN" && user.plan !== "PRO" && (
              <button
                onClick={() => onNavigate("admin")}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-semibold shadow-lg shadow-indigo-900/50 transition cursor-pointer"
              >
                Manage Billing
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
