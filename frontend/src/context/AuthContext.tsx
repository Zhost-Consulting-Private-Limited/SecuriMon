"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load auth from localStorage on mount
    const storedToken = localStorage.getItem("vigilon_token");
    const storedUser = localStorage.getItem("vigilon_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Protect routes: everything under these prefixes requires auth; everything else
    // (marketing pages, login, register) is public. Listed explicitly rather than
    // inferred so a new dashboard route must be added here deliberately.
    const PROTECTED_PREFIXES = [
      "/dashboard",
      "/servers",
      "/scan",
      "/threats",
      "/applications",
      "/inventory",
      "/alerts",
      "/assistant",
      "/digest",
      "/compliance",
      "/remediation",
      "/tenants",
      "/settings",
      "/billing",
    ];
    const isProtectedRoute = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)
    );
    const isAuthRoute = pathname === "/login" || pathname === "/register";

    if (isLoaded) {
      if (!token && isProtectedRoute) {
        router.push("/login");
      } else if (token && isAuthRoute) {
        router.push("/dashboard");
      }
    }
  }, [token, isLoaded, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("vigilon_token", newToken);
    localStorage.setItem("vigilon_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("vigilon_token");
    localStorage.removeItem("vigilon_user");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
