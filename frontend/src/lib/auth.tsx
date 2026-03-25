import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const STORAGE_KEY = "ed_auth";

function readStoredSession(): AuthResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function storeSession(session: AuthResponse | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuth() {
      const storedSession = readStoredSession();

      if (!storedSession?.token) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await apiRequest<{ user: User }>("/auth/me", {
          token: storedSession.token,
        });

        if (!isMounted) {
          return;
        }

        setToken(storedSession.token);
        setUser(response.user);
        storeSession({ token: storedSession.token, user: response.user });
      } catch {
        if (!isMounted) {
          return;
        }

        setToken(null);
        setUser(null);
        storeSession(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setToken(response.token);
    setUser(response.user);
    storeSession(response);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    });

    setToken(response.token);
    setUser(response.user);
    storeSession(response);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    storeSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
