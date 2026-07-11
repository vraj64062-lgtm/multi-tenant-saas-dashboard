import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.tsx";
import { Navbar } from "./components/Navbar.tsx";
import { Login } from "./pages/Login.tsx";
import { Signup } from "./pages/Signup.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { AdminPanel } from "./pages/AdminPanel.tsx";
import { LogOut, FileText, Download, ExternalLink, X, AlertCircle } from "lucide-react";
import { apiFetch } from "./api/client.ts";
import { exportPDFReport } from "./utils/pdfExport.ts";

type View = "login" | "signup" | "dashboard" | "admin";

const AppContent: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>("login");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfDownloadInfo, setPdfDownloadInfo] = useState<{ url: string; filename: string } | null>(null);

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
        const { doc, filename, blobUrl } = exportPDFReport(user, data.summary, data.records);
        
        // Clean up any previously generated PDF object URL to prevent leaks
        if (pdfDownloadInfo) {
          URL.revokeObjectURL(pdfDownloadInfo.url);
        }
        setPdfDownloadInfo({ url: blobUrl, filename });

        // Attempt automatic download
        try {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
          }, 150);
        } catch (downloadErr) {
          console.warn("Direct anchor download failed, trying doc.save", downloadErr);
          try {
            doc.save(filename);
          } catch (saveErr) {
            console.error("All auto-download attempts failed", saveErr);
          }
        }
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
      {/* Floating fallback modal for PDF downloads inside iframe sandboxes */}
      {pdfDownloadInfo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="pdf-export-modal">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span className="font-bold text-xs tracking-wider uppercase font-sans">Report Compiled</span>
              </div>
              <button 
                onClick={() => setPdfDownloadInfo(null)}
                className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">PDF Document Ready</h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate max-w-[280px]" title={pdfDownloadInfo.filename}>
                    {pdfDownloadInfo.filename}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-left">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Your performance report has been successfully prepared.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href={pdfDownloadInfo.url}
                  download={pdfDownloadInfo.filename}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </a>
                <a
                  href={pdfDownloadInfo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition border border-slate-250 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in Tab</span>
                </a>
              </div>

              {/* Sandbox Notice / Troubleshooting */}
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2.5 items-start text-left">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wide">Developer Sandbox Info</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    If clicking "Download File" does not trigger a save, your browser is blocking iframe-initiated downloads.
                  </p>
                  <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                    Simply click <span className="underline">"Open in Tab"</span>, or click the <span className="underline">"Open App in New Tab"</span> icon in the top-right corner of the window to bypass iframe restriction!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <span className="text-xs font-mono text-emerald-400">Tenant-isolated via server-verified JWT</span>
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
