/* eslint-disable @typescript-eslint/no-explicit-any */
export interface CustomerProfile {
  id: number;
  referenceCode: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthResponseData {
  user: CustomerProfile;
  accessToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
