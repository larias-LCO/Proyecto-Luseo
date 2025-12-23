// Request
export interface LoginRequest {
  login: string;
  password: string;
}

// Respuesta de /auth/login y /auth/refresh
export interface AuthResponse {
  token: string;
  expiresAtMillis: number;
  username: string;
  role: string;
}

// Respuesta de /auth/me  ✅ ESTE ES TU MeResponse
export interface AuthMeResponse {
  authenticated: boolean;
  username: string;
  role: string;
  authorities: string[];
  openMode: boolean;
  tokenExpiresAtMillis?: number;
  employeeId?: number;
  serverTimeMillis: number;
}