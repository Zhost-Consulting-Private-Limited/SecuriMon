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
    const storedToken = localStorage.getItem("securimon_token");
    const storedUser = localStorage.getItem("securimon_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Protect routes
    if (isLoaded) {
      const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname === "/";
      
      if (!token && !isPublicRoute) {
        router.push("/login");
      } else if (token && (pathname === "/login" || pathname === "/register")) {
        router.push("/dashboard");
      }
    }
  }, [token, isLoaded, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("securimon_token", newToken);
    localStorage.setItem("securimon_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("securimon_token");
    localStorage.removeItem("securimon_user");
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
