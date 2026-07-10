import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { ArrowRight, Lock, Mail, Server } from "lucide-react";

interface LoginProps {
  onNavigate: (view: "login" | "signup" | "dashboard" | "admin") => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      onNavigate("dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="login-page" className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div id="login-card" className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Server id="login-logo" className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign in to your account</h2>
          <p className="text-sm text-gray-500">
            Enter your credentials to access your organization's analytics
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div id="login-error" className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-start space-x-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="you@organization.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white text-gray-900 placeholder-gray-400 outline-none transition"
              />
            </div>
          </div>

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
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Navigation to Signup */}
        <div className="text-center pt-2">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <button
              id="goto-signup-btn"
              onClick={() => onNavigate("signup")}
              className="font-semibold text-indigo-600 hover:text-indigo-500 transition cursor-pointer"
            >
              Create a new organization
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
