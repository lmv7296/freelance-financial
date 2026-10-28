export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string; // Min 8 chars, max 72 chars
}

export interface RegisterResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface MessageResponse {
  message: string;
}

export interface ApiError {
  error: string;
}

export interface HealthResponse {
  status: "available" | "healthy";
  timestamp: string;
  version: string;
}
