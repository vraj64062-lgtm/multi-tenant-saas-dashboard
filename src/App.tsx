import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Navbar } from "./components/Navbar.tsx";
import { Login } from "./pages/Login.tsx";
import { Signup } from "./pages/Signup.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { AdminPanel } from "./pages/AdminPanel.tsx";
import { LogOut } from "lucide-react";
import { apiFetch } from "./api/client.ts";
import { exportPDFReport } from "./utils/pdfExport.ts";

type View = "login" | "signup" | "dashboard" | "admin";

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Parse URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite) {
      setInviteToken(invite);
      setView("signup");
    }
  }, []);

  // Handle route guards based on user authentication state
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in and on a public auth view, go to dashboard
        if (view === "login" || view === "signup") {
          setView("dashboard");
        }
      } else {
        // If logged out and trying to see app pages, force to login
        if (view === "dashboard" || view === "admin") {
          setView("login");
        }
      }
    }
  }, [user, loading, view]);

  const handleNavigate = (newView: View) => {
    setView(newView);
    
    // Clean up query parameters on navigation to avoid infinite invite loops
    if (newView !== "signup" && window.location.search) {
      window.history.pushState({}, document.title, window.location.pathname);
      setInviteToken(null);
    }
  };

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const data = await apiFetch("/api/analytics");
      if (user && data.summary && data.records) {
        exportPDFReport(user, data.summary, data.records);
      } else {
        alert("Unable to compile report: incomplete analytics data received.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to export PDF report: " + (err.message || err));
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleNavigate("login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <span className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-gray-500 font-medium">Verifying active organization session...</p>
      </div>
    );
  }

  // Render authenticating screen
  if (!user) {
    if (view === "signup") {
      return <Signup onNavigate={handleNavigate} inviteToken={inviteToken} />;
    }
    return <Login onNavigate={handleNavigate} />;
  }

  // Render authenticated app layout
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Navbar currentView={view} onNavigate={handleNavigate} />
      
      {/* Right Column Layout */}
      <div className="flex-1 flex flex-col min-h-screen md:h-screen md:overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center font-bold text-indigo-600 text-sm shrink-0">
              {user.orgName ? user.orgName.slice(0, 2).toUpperCase() : "SM"}
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">{user.orgName}</h1>
              <p className="text-[10px] text-slate-500 uppercase font-bold font-mono tracking-wider">
                Tenant ID: {user.organizationId ? `org-${user.organizationId.slice(0, 8)}` : "tenant-active"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-tight">{user.name}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                  {user.role === "ADMIN" ? "Admin Role" : "Member Role"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold shadow-inner">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
            </div>
            
            {/* Header Logout Icon */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Content Body Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          {view === "dashboard" && <Dashboard />}
          {view === "admin" && <AdminPanel />}
        </main>
        
        {/* Quick Summary Footer */}
        <footer className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-white gap-4 shrink-0 z-10 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-300">Database Engine: Connected</span>
            </div>
            <div className="flex items-center gap-2 sm:border-l sm:border-slate-800 sm:pl-8">
              <span className="text-slate-400 text-xs uppercase font-bold tracking-widest">Multi-Tenant Isolation:</span>
              <span className="text-xs font-mono text-emerald-400">Cryptographically isolated by Org ID</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SaaSMetrics v2.4.0-stable</span>
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-3 py-1 bg-white hover:bg-slate-100 disabled:bg-slate-400 text-slate-900 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              {isExportingPDF ? (
                <>
                  <span className="animate-spin h-3 w-3 border-2 border-slate-900 border-t-transparent rounded-full" />
                  <span>Downloading...</span>
                </>
              ) : (
                <span>Export PDF Report</span>
              )}
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
