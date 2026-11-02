import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type {
  LoginCredentials,
  RegisterCredentials,
  User,
  UserRole,
} from "../types/auth";
import {
  clearAuthSession,
  getCurrentUser,
  getStoredToken,
  getStoredUser,
  login as apiLogin,
  register as apiRegister,
  setAuthSession,
} from "../services/authService";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDonorHospital: boolean;
  isRecipientHospital: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterCredentials) => Promise<User>;
  logout: () => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  switchActiveHospital: (hospitalId: string, hospitalName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth on boot
  useEffect(() => {
    async function verifySession() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setToken(storedToken);
      } catch (error) {
        console.warn("Session verification failed, logging out:", error);
        clearAuthSession();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await apiLogin(credentials);
      setUser(response.user);
      setToken(response.access_token);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (registrationData: RegisterCredentials): Promise<User> => {
      setIsLoading(true);
      try {
        const response = await apiRegister(registrationData);
        setUser(response.user);
        setToken(response.access_token);
        return response.user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    setToken(null);
  }, []);

  const switchActiveHospital = useCallback(
    (hospitalId: string, hospitalName: string) => {
      if (!user) return;
      const updatedUser: User = {
        ...user,
        hospital_id: hospitalId,
        hospital_name: hospitalName,
      };
      setUser(updatedUser);
      if (token) {
        setAuthSession(token, updatedUser);
      }
    },
    [user, token]
  );

  const role = user?.role ?? null;
  const isAuthenticated = Boolean(user && token);
  const isDonorHospital = role === "donor_hospital";
  const isRecipientHospital = role === "recipient_hospital";
  const isAdmin = role === "admin";

  const hasRole = useCallback(
    (allowedRoles: UserRole[]): boolean => {
      if (!user) return false;
      if (user.role === "admin") return true; // Admins have oversight across portals
      return allowedRoles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        isDonorHospital,
        isRecipientHospital,
        isAdmin,
        login,
        register,
        logout,
        hasRole,
        switchActiveHospital,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
