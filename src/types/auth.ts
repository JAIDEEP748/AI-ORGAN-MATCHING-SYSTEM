export type UserRole = "donor_hospital" | "recipient_hospital" | "admin";

export interface User {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  hospital_id?: string | null;
  hospital_name?: string | null;
  full_name: string;
  designation?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
  portal_type?: UserRole;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  role: "donor_hospital" | "recipient_hospital";
  hospital_id?: string;
  hospital_name?: string;
  full_name: string;
  designation?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface HospitalInfo {
  hospital_id: string;
  hospital_name: string;
  city: string;
  state: string;
  hospital_type: string;
  authorization_status: string;
  readiness_status: string;
}
