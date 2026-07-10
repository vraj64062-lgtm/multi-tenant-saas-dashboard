import React, { createContext, useContext, useState, useEffect } from "react";
import { apiFetch, setAccessToken } from "../api/client.ts";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  orgName: string;
  plan: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: {
    email: string;
    password: string;
    name: string;
    orgName?: string;
    inviteToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUserOrgPlan: (newPlan: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load current user profile on app load (handles cookie-based refresh token verification)
  useEffect(() => {
    const checkAuthOnLoad = async () => {
      try {
        const data = await apiFetch("/api/auth/me");
        setUser(data.user);
      } catch (error) {
        // Silent catch: User is just not logged in or token was unrefreshable
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthOnLoad();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (params: {
    email: string;
    password: string;
    name: string;
    orgName?: string;
    inviteToken?: string;
  }) => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(params),
      });

      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout API request failed:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  const updateUserOrgPlan = (newPlan: string) => {
    if (user) {
      setUser({ ...user, plan: newPlan });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUserOrgPlan }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
