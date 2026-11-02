import { apiRequest } from "./api";
import type {
  AuthResponse,
  HospitalInfo,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "../types/auth";

const TOKEN_KEY = "organ_match_token";
const USER_KEY = "organ_match_user";

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const data: AuthResponse = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (data?.access_token) {
    setAuthSession(data.access_token, data.user);
  }

  return data;
}

export async function register(
  registrationData: RegisterCredentials
): Promise<AuthResponse> {
  const data: AuthResponse = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(registrationData),
  });

  if (data?.access_token) {
    setAuthSession(data.access_token, data.user);
  }

  return data;
}

export async function getCurrentUser(): Promise<User> {
  const user: User = await apiRequest("/api/auth/me", {
    method: "GET",
  });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function getAuthHospitals(): Promise<HospitalInfo[]> {
  try {
    return await apiRequest("/api/auth/hospitals", {
      method: "GET",
    });
  } catch (error) {
    console.warn("Failed to load hospitals from backend, using fallback list:", error);
    return [
      {
        hospital_id: "H0001",
        hospital_name: "Choudhury Transplant Centre",
        city: "Chennai",
        state: "Tamil Nadu",
        hospital_type: "Private",
        authorization_status: "Authorized",
        readiness_status: "Partially_Ready",
      },
      {
        hospital_id: "H0002",
        hospital_name: "Bakshi Transplant Centre",
        city: "Bengaluru",
        state: "Karnataka",
        hospital_type: "Government",
        authorization_status: "Authorized",
        readiness_status: "Ready",
      },
      {
        hospital_id: "H0003",
        hospital_name: "Maharaj Transplant Centre",
        city: "Hyderabad",
        state: "Telangana",
        hospital_type: "Government",
        authorization_status: "Authorized",
        readiness_status: "Partially_Ready",
      },
      {
        hospital_id: "H0004",
        hospital_name: "Konda Transplant Centre",
        city: "Mumbai",
        state: "Maharashtra",
        hospital_type: "Government",
        authorization_status: "Authorized",
        readiness_status: "Ready",
      },
      {
        hospital_id: "H0005",
        hospital_name: "Kapoor Transplant Centre",
        city: "Delhi",
        state: "Delhi",
        hospital_type: "Private",
        authorization_status: "Authorized",
        readiness_status: "Partially_Ready",
      },
    ];
  }
}

export function setAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const item = localStorage.getItem(USER_KEY);
  if (!item) return null;
  try {
    return JSON.parse(item);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
