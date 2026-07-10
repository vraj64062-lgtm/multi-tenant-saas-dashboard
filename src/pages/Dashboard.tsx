import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client.ts";
import { useAuth } from "../context/AuthContext.tsx";
import {
  AreaChart as ChartIcon,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  UserPlus,
  RefreshCw,
  Zap
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface AnalyticsRecord {
  id: string;
  date: string;
  activeUsers: number;
  revenue: number;
  pageViews: number;
  signups: number;
}

interface Summary {
  totalRevenue: number;
  averageActiveUsers: number;
  totalPageViews: number;
  totalSignups: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<AnalyticsRecord[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchAnalytics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/analytics");
      setSummary(data.summary);
      setRecords(data.records);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSimulateActivity = async () => {
    setIsSimulating(true);
    try {
      await apiFetch("/api/analytics/mock", { method: "POST" });
      await fetchAnalytics(false); // Refresh data silently
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <span className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-gray-500 font-medium animate-pulse">Retrieving your organization's analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-12 px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-red-700 font-semibold text-lg">⚠️ Failed to Load Dashboard</p>
          <p className="text-red-600 text-sm max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      
      {/* Upper Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            Analytics Overview
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time high density metrics for <span className="font-semibold text-indigo-600">{user?.orgName}</span>
          </p>
        </div>
        
        {/* Actions bar */}
        <div className="flex items-center gap-2">
          <button
            id="simulate-activity-btn"
            onClick={handleSimulateActivity}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Zap className={`h-3.5 w-3.5 ${isSimulating ? "animate-bounce" : ""}`} />
            <span>{isSimulating ? "Injecting Data..." : "Simulate Live Traffic"}</span>
          </button>

          <button
            id="refresh-analytics-btn"
            onClick={() => fetchAnalytics(true)}
            className="p-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg transition cursor-pointer shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card: Total Revenue */}
          <div id="stat-card-revenue" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Revenue</p>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">+12.4%</span>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">${summary.totalRevenue.toLocaleString()}</p>
              <div className="h-1 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-indigo-500 w-[78%]"></div>
              </div>
            </div>
          </div>

          {/* Card: Active Users */}
          <div id="stat-card-active-users" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Avg Active Users</p>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">Active</span>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{summary.averageActiveUsers}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Daily rolling average metrics</p>
            </div>
          </div>

          {/* Card: Page Views */}
          <div id="stat-card-pageviews" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Page Views</p>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-full">Standard</span>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{summary.totalPageViews.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">100% tenant-isolated log security</p>
            </div>
          </div>

          {/* Card: Signups */}
          <div id="stat-card-signups" className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">New Signups</p>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Organic</span>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900">{summary.totalSignups}</p>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Seats: 4 active / unlimited seats</p>
            </div>
          </div>

        </div>
      )}

      {/* Visualizers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart: Revenue Trend */}
        <div id="revenue-trend-chart" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-indigo-600" />
                <span>Revenue Growth Trend ($)</span>
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Historical revenue progression over the past 15 periods</p>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={records} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                  itemStyle={{ color: "#818cf8" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue ($)"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  activeDot={{ r: 8 }}
                  dot={{ stroke: "#4f46e5", strokeWidth: 2, r: 4, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: User Engagement */}
        <div id="user-engagement-chart" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-sky-500" />
              <span>Active Users vs. Page Views</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Comparative correlation of total visitors to unique app page hits</p>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={records} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff" }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="activeUsers" name="Active Users" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pageViews" name="Page Views" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Raw Table Logs (for multi-tenant data viewing context) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-slate-800">Historical Metric Logs</h3>
          <p className="text-[10px] text-gray-400">Strictly tenant-scoped data stored in database. Never shared across domains.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Reporting Date</th>
                <th className="px-4 py-3 text-right">Active Users</th>
                <th className="px-4 py-3 text-right">Page Views</th>
                <th className="px-4 py-3 text-right">Signups</th>
                <th className="px-4 py-3 text-right">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {records.slice().reverse().map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50/40 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900">{rec.date}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{rec.activeUsers}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">{rec.pageViews.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rec.signups > 0 ? "bg-emerald-50 text-emerald-700" : "text-gray-400"}`}>
                      +{rec.signups}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600 font-mono">${rec.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
