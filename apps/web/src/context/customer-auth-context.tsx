"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AuthApi, AuthTokenStore } from "../lib/auth/auth-api";
import type { CustomerProfile } from "../lib/auth/auth-types";

export type CustomerAuthStatus = "loading" | "authenticated" | "unauthenticated";

interface CustomerAuthContextType {
  status: CustomerAuthStatus;
  customer: CustomerProfile | null;
  accessToken: string | null;
  signup: (payload: any) => Promise<any>;
  signin: (payload: any) => Promise<any>;
  verifyEmail: (challengeId: number, otp: string) => Promise<any>;
  resendVerification: (payload: { challengeId?: number; email?: string }) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  verifyResetOTP: (challengeId: number | undefined, otp: string) => Promise<any>;
  resetPassword: (payload: { password: string; passwordConfirmation: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  loadCurrentCustomer: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CustomerAuthStatus>("loading");
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadCurrentCustomer = async () => {
    try {
      const user = await AuthApi.getMe();
      setCustomer(user);
      setStatus("authenticated");
    } catch (err) {
      setCustomer(null);
      setAccessToken(null);
      AuthTokenStore.setAccessToken(null);
      setStatus("unauthenticated");
      throw err;
    }
  };

  const refreshSession = async (): Promise<string | null> => {
    try {
      const token = await AuthApi.refresh();
      if (token) {
        setAccessToken(token);
        return token;
      }
      throw new Error("No token returned");
    } catch (err) {
      setCustomer(null);
      setAccessToken(null);
      AuthTokenStore.setAccessToken(null);
      setStatus("unauthenticated");
      return null;
    }
  };

  const signup = async (payload: any): Promise<any> => {
    setStatus("loading");
    try {
      const data = await AuthApi.signup(payload);
      if (data.verificationRequired) {
        setStatus("unauthenticated");
        return data;
      }
      setAccessToken(data.accessToken);
      setCustomer(data.user);
      setStatus("authenticated");
      return data;
    } catch (err) {
      setCustomer(null);
      setAccessToken(null);
      AuthTokenStore.setAccessToken(null);
      setStatus("unauthenticated");
      throw err;
    }
  };

  const signin = async (payload: any): Promise<any> => {
    setStatus("loading");
    try {
      const data = await AuthApi.signin(payload);
      if (data.verificationRequired) {
        setStatus("unauthenticated");
        return data;
      }
      setAccessToken(data.accessToken);
      setCustomer(data.user);
      setStatus("authenticated");
      return data;
    } catch (err) {
      setCustomer(null);
      setAccessToken(null);
      AuthTokenStore.setAccessToken(null);
      setStatus("unauthenticated");
      throw err;
    }
  };

  const verifyEmail = async (challengeId: number, otp: string): Promise<any> => {
    setStatus("loading");
    try {
      const data = await AuthApi.verifyEmail(challengeId, otp);
      setAccessToken(data.accessToken);
      setCustomer(data.user);
      setStatus("authenticated");
      return data;
    } catch (err) {
      setStatus("unauthenticated");
      throw err;
    }
  };

  const resendVerification = async (payload: { challengeId?: number; email?: string }): Promise<any> => {
    return await AuthApi.resendVerification(payload);
  };

  const forgotPassword = async (email: string): Promise<any> => {
    return await AuthApi.forgotPassword(email);
  };

  const verifyResetOTP = async (challengeId: number | undefined, otp: string): Promise<any> => {
    return await AuthApi.verifyResetOTP(challengeId, otp);
  };

  const resetPassword = async (payload: { password: string; passwordConfirmation: string }): Promise<any> => {
    return await AuthApi.resetPassword(payload);
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } finally {
      setCustomer(null);
      setAccessToken(null);
      AuthTokenStore.setAccessToken(null);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const token = await AuthApi.refresh();
        if (token && active) {
          setAccessToken(token);
          const user = await AuthApi.getMe();
          if (active) {
            setCustomer(user);
            setStatus("authenticated");
          }
        } else if (active) {
          setStatus("unauthenticated");
        }
      } catch {
        if (active) {
          setStatus("unauthenticated");
        }
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        status,
        customer,
        accessToken,
        signup,
        signin,
        verifyEmail,
        resendVerification,
        forgotPassword,
        verifyResetOTP,
        resetPassword,
        logout,
        refreshSession,
        loadCurrentCustomer
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
}
