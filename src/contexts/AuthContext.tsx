import React, { createContext, useContext, useState, useCallback } from "react";
import { mockUser } from "@/lib/mock-data";

export type UserRole = "admin" | "investigator" | "analyst" | "auditor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem("namo_token");
    return token ? mockUser : null;
  });

  const login = useCallback(async (_email: string, _password: string) => {
    // Mock login — in production, call authApi.login
    localStorage.setItem("namo_token", "mock_jwt_token");
    setUser(mockUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("namo_token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
