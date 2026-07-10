import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client.ts";
import { useAuth } from "../context/AuthContext.tsx";
import {
  CreditCard,
  Crown,
  Info,
  Mail,
  Plus,
  Shield,
  Trash2,
  Users,
  XCircle,
  Copy,
  CheckCircle,
  Sparkles
} from "lucide-react";

interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  createdAt: string;
  expiresAt: string;
}

export const AdminPanel: React.FC = () => {
  const { user, updateUserOrgPlan } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invitation Form States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Billing States
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingMessage, setBillingMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/admin/members");
      setMembers(data.members);
      setPendingInvites(data.pendingInvites);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load admin workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    setGeneratedInviteLink(null);
    setCopiedToken(false);

    try {
      const data = await apiFetch("/api/admin/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      // Insert new invite to the list
      setPendingInvites([data.invite, ...pendingInvites]);
      
      // Construct the invite link using absolute browser host as a safe fallback
      const browserHost = window.location.origin;
      const inviteLink = `${browserHost}/signup?invite=${data.invite.token}`;
      setGeneratedInviteLink(inviteLink);
      setInviteEmail("");
    } catch (err: any) {
      alert("Failed to send invite: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to cancel this pending invitation?")) return;

    try {
      await apiFetch(`/api/admin/invite/${inviteId}`, { method: "DELETE" });
      setPendingInvites(pendingInvites.filter((inv) => inv.id !== inviteId));
    } catch (err: any) {
      alert("Failed to cancel invitation: " + err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member? They will lose access to the organization immediately.")) return;

    try {
      await apiFetch(`/api/admin/members/${memberId}`, { method: "DELETE" });
      setMembers(members.filter((mem) => mem.id !== memberId));
    } catch (err: any) {
      alert("Failed to remove member: " + err.message);
    }
  };

  const handleCopyLink = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Stripe Billing / Upgrade Checkout session trigger
  const handleUpgradeToPro = async () => {
    setIsUpgrading(true);
    setBillingMessage(null);

    try {
      const data = await apiFetch("/api/stripe/create-checkout-session", { method: "POST" });
      if (data.url) {
        // Redirect user to Stripe Checkout (or open in new tab if requested)
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error(err);
      // Helpful fallback message if Stripe keys are unconfigured
      setBillingMessage({
        type: "info",
        text: err.message || "Stripe is currently unconfigured. You can easily test Pro capabilities using the Simulator below.",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Simulation controls to bypass real Stripe API
  const handleSimulateUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const data = await apiFetch("/api/stripe/simulate-upgrade", { method: "POST" });
      updateUserOrgPlan("PRO");
      setBillingMessage({ type: "success", text: data.message });
    } catch (err: any) {
      setBillingMessage({ type: "error", text: err.message });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleSimulateDowngrade = async () => {
    setIsUpgrading(true);
    try {
      const data = await apiFetch("/api/stripe/simulate-downgrade", { method: "POST" });
      updateUserOrgPlan("FREE");
      setBillingMessage({ type: "success", text: data.message });
    } catch (err: any) {
      setBillingMessage({ type: "error", text: err.message });
    } finally {
      setIsUpgrading(false);
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto my-16 px-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 text-center space-y-4">
          <Shield className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-amber-900">Access Restricted</h2>
          <p className="text-amber-700 max-w-md mx-auto text-sm">
            Only administrators can view billing details or manage organization invitations. 
            Please contact an Admin if you require administrative privileges.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <span className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-gray-500 font-medium">Loading workspace members and settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          Organization Workspace
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Invite members, control administrative roles, and manage subscription billing.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Grid of Billing & Invitations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Hand: Billing Card & Sandbox Simulation */}
        <div id="billing-management-panel" className="space-y-6 lg:col-span-1">
          
          {/* Subscription State Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            {user.plan === "PRO" && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 rounded-bl-xl text-[10px] font-bold flex items-center space-x-1">
                <Crown className="h-3 w-3" />
                <span>Active Pro</span>
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-850 flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span>Plan & Billing</span>
              </h3>
              <p className="text-[10px] text-gray-400">Current subscription tier details</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-150">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Plan</span>
                <p className="text-lg font-extrabold text-slate-800">
                  {user.plan === "PRO" ? "Pro Subscription" : "Standard Free"}
                </p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase font-mono ${
                user.plan === "PRO" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-gray-200 text-gray-600"
              }`}>
                {user.plan}
              </span>
            </div>

            {billingMessage && (
              <div className={`p-3 rounded-lg text-[11px] flex items-start space-x-1.5 border ${
                billingMessage.type === "success" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : billingMessage.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-indigo-50 border-indigo-200 text-indigo-800"
              }`}>
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>{billingMessage.text}</div>
              </div>
            )}

            <div className="space-y-2">
              {user.plan === "FREE" ? (
                <button
                  id="upgrade-pro-btn"
                  onClick={handleUpgradeToPro}
                  disabled={isUpgrading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  {isUpgrading ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Upgrade to Pro ($29/mo)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 text-center rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pro benefits active across Organization!</span>
                </div>
              )}
            </div>
          </div>

          {/* Sandbox Mock Controller */}
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-800 flex items-center space-x-1.5">
                <span>⚡️ Developer Sandbox Controls</span>
              </h4>
              <p className="text-[10px] text-amber-700">Simulate Stripe webhook web triggers instantly in this preview container.</p>
            </div>
            <div className="flex gap-2">
              <button
                id="simulate-upgrade-btn"
                onClick={handleSimulateUpgrade}
                className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold rounded-lg transition cursor-pointer"
              >
                Force Upgrade
              </button>
              <button
                id="simulate-downgrade-btn"
                onClick={handleSimulateDowngrade}
                className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-bold rounded-lg transition cursor-pointer"
              >
                Force Downgrade
              </button>
            </div>
          </div>

        </div>

        {/* Right Hand: Workspace Invite Forms & Members Table */}
        <div id="members-management-workspace" className="space-y-6 lg:col-span-2">
          
          {/* Invite Member Section */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>Invite Team Members</span>
              </h3>
              <p className="text-[10px] text-gray-400">Generate secure invitation links to register new workspace partners</p>
            </div>

            <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
              <input
                id="invite-email-input"
                type="email"
                required
                placeholder="colleague@organization.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-xs outline-none text-gray-900 placeholder-gray-400 transition"
              />
              <select
                id="invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 transition cursor-pointer"
              >
                <option value="MEMBER">Member (Read-only)</option>
                <option value="ADMIN">Admin (Full Control)</option>
              </select>
              <button
                id="send-invite-btn"
                type="submit"
                disabled={isInviting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isInviting ? "Creating..." : "Generate Invite"}</span>
              </button>
            </form>

            {/* Link Copy Box */}
            {generatedInviteLink && (
              <div id="invite-link-output" className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-indigo-950">📋 Custom Invite Link Generated</span>
                  <span className="text-[9px] text-indigo-500 font-semibold font-mono">Expires in 24 hours</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-100 rounded-lg text-[10px] font-mono text-gray-600 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedToken ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-gray-400">Share this link. When the recipient visits it, they can register and instantly join your organization.</p>
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>Workspace Members ({members.length})</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Active profiles inside this organization domain</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Email Domain</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3 text-right">Join Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {members.map((mem) => (
                    <tr key={mem.id} className="hover:bg-gray-50/40 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{mem.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{mem.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 font-mono text-[9px] font-bold rounded uppercase ${
                          mem.role === "ADMIN" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-gray-100 text-gray-600"
                        }`}>
                          {mem.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 font-mono text-[10px]">
                        {new Date(mem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mem.id === user.id ? (
                          <span className="text-[10px] font-medium text-gray-400 italic">You</span>
                        ) : (
                          <button
                            onClick={() => handleRemoveMember(mem.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites List */}
          {pendingInvites.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-slate-800">Pending invitations ({pendingInvites.length})</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Invitations waiting for recipient acceptance</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Recipient Email</th>
                      <th className="px-4 py-3">Expected Role</th>
                      <th className="px-4 py-3 text-right">Invitation Date</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {pendingInvites.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/40 transition">
                        <td className="px-4 py-3 font-mono text-slate-800 text-[10px]">{inv.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold rounded uppercase">
                            {inv.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400 font-mono text-[10px]">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Revoke Invitation"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
