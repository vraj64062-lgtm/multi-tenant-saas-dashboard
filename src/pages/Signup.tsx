import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { ArrowRight, Building2, Lock, Mail, Server, User } from "lucide-react";

interface SignupProps {
  onNavigate: (view: "login" | "signup" | "dashboard" | "admin") => void;
  inviteToken?: string | null;
}

interface InviteDetails {
  email: string;
  role: string;
  orgName: string;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate, inviteToken }) => {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite-specific states
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  useEffect(() => {
    if (inviteToken) {
      setLoadingInvite(true);
      fetch(`/api/auth/invite/${inviteToken}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Invalid or expired invitation link.");
          }
          return res.json();
        })
        .then((data) => {
          setInviteDetails(data.invite);
          setEmail(data.invite.email); // Pre-fill invited email
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || "Failed to load invitation details.");
        })
        .finally(() => {
          setLoadingInvite(false);
        });
    }
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || (!inviteToken && !orgName)) {
      setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signup({
        email,
        password,
        name,
        orgName: inviteToken ? undefined : orgName,
        inviteToken: inviteToken || undefined,
      });
      onNavigate("dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="signup-page" className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div id="signup-card" className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Server id="signup-logo" className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {inviteToken ? "Join your Organization" : "Create your Organization"}
          </h2>
          <p className="text-sm text-gray-500">
            {inviteToken
              ? "Complete your account registration to join your team"
              : "Set up a new organization and start tracking metrics"}
          </p>
        </div>

        {/* Loading Invite State */}
        {loadingInvite && (
          <div className="p-4 bg-indigo-50 text-indigo-600 text-center text-sm rounded-xl animate-pulse">
            Loading invitation details...
          </div>
        )}

        {/* Invite Banner */}
        {inviteDetails && !loadingInvite && (
          <div id="invite-banner" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl space-y-1">
            <p className="font-semibold">✉️ Invitation Verified!</p>
            <p>
              You've been invited to join <strong className="font-bold">{inviteDetails.orgName}</strong> as a{" "}
              <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-950 font-mono text-xs rounded uppercase font-medium">
                {inviteDetails.role}
              </span>.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div id="signup-error" className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-start space-x-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block" htmlFor="name-input">
              Your Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <User className="h-5 w-5" />
              </span>
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-gray-900 placeholder-gray-400 outline-none transition"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block" htmlFor="email-input">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Mail className="h-5 w-5" />
              </span>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={!!inviteToken} // Don't let invited users alter their email
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none transition ${
                  inviteToken
                    ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white placeholder-gray-400"
                }`}
              />
            </div>
          </div>

          {/* Org Name (Only shown if NOT an invitation) */}
          {!inviteToken && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 block" htmlFor="org-name-input">
                Organization Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                  <Building2 className="h-5 w-5" />
                </span>
                <input
                  id="org-name-input"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  required={!inviteToken}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-gray-900 placeholder-gray-400 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 block" htmlFor="password-input">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 pointer-events-none">
                <Lock className="h-5 w-5" />
              </span>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-gray-900 placeholder-gray-400 outline-none transition"
              />
            </div>
          </div>

          <button
            id="signup-submit-btn"
            type="submit"
            disabled={isSubmitting || loadingInvite}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{inviteToken ? "Join Workspace" : "Get Started"}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Navigation back to login */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <button
              id="goto-login-btn"
              onClick={() => onNavigate("login")}
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition cursor-pointer"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
