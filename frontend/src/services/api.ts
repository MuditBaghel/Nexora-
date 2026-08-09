import axios, { AxiosError } from 'axios';
import type {
  ApiError,
  ApiResponse,
  Challan,
  Customer,
  DashboardStats,
  Followup,
  Pagination,
  Product,
  StockMovement,
  User,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<ApiResponse<{ token: string }>>('/auth/refresh')
      .then((res) => {
        accessToken = res.data.data.token;
        return true;
      })
      .catch(() => {
        accessToken = null;
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as
      | (import('axios').InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const url = original?.url ?? '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const ok = await tryRefreshToken();
      if (ok) {
        return api(original);
      }
      accessToken = null;
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) {
      let msg = data.message;
      if (data.available !== undefined && data.requested !== undefined) {
        msg += ` (available: ${data.available}, requested: ${data.requested})`;
      }
      return msg;
    }
    if (error.message === 'Network Error') {
      return 'Unable to connect to server. Please check your connection.';
    }
  }
  return 'An unexpected error occurred';
}

export function getValidationErrors(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.errors ?? [];
  }
  return [];
}

// Auth
export async function login(email: string, password: string) {
  const { data } = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
    email,
    password,
  });
  return data.data;
}

export async function getMe() {
  const { data } = await api.get<ApiResponse<User>>('/auth/me');
  return data.data;
}

export async function refreshSession(): Promise<boolean> {
  try {
    const { data } = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    accessToken = data.data.token;
    return true;
  } catch {
    accessToken = null;
    return false;
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    accessToken = null;
  }
}

// Dashboard
export async function getDashboardStats() {
  const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  return data.data;
}

// Customers
export async function getCustomers(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<
    ApiResponse<{ customers: Customer[]; pagination: Pagination }>
  >('/customers', { params });
  return data.data;
}

export async function getCustomer(id: string) {
  const { data } = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
  return data.data;
}

export async function createCustomer(payload: Partial<Customer>) {
  const { data } = await api.post<ApiResponse<Customer>>('/customers', payload);
  return data.data;
}

export async function updateCustomer(id: string, payload: Partial<Customer>) {
  const { data } = await api.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
  return data.data;
}

export async function deleteCustomer(id: string) {
  await api.delete(`/customers/${id}`);
}

export async function getFollowups(customerId: string) {
  const { data } = await api.get<ApiResponse<Followup[]>>(`/customers/${customerId}/followups`);
  return data.data;
}

export async function addFollowup(customerId: string, payload: { note: string; follow_up_date: string }) {
  const { data } = await api.post<ApiResponse<Followup>>(`/customers/${customerId}/followups`, payload);
  return data.data;
}

// Products
export async function getProducts(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<
    ApiResponse<{ products: Product[]; pagination: Pagination }>
  >('/products', { params });
  return data.data;
}

export async function getProduct(id: string) {
  const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return data.data;
}

export async function createProduct(payload: Partial<Product>) {
  const { data } = await api.post<ApiResponse<Product>>('/products', payload);
  return data.data;
}

export async function updateProduct(id: string, payload: Partial<Product>) {
  const { data } = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
  return data.data;
}

// Stock
export async function getStockMovements(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<
    ApiResponse<{ movements: StockMovement[]; pagination: Pagination }>
  >('/stock/movements', { params });
  return data.data;
}

export async function createStockMovement(payload: {
  product_id: string;
  quantity: number;
  movement_type: 'IN' | 'OUT';
  reason: string;
}) {
  const { data } = await api.post<ApiResponse<StockMovement>>('/stock/movements', payload);
  return data.data;
}

// Challans
export async function getChallans(params: Record<string, string | number | undefined>) {
  const { data } = await api.get<
    ApiResponse<{ challans: Challan[]; pagination: Pagination }>
  >('/challans', { params });
  return data.data;
}

export async function getChallan(id: string) {
  const { data } = await api.get<ApiResponse<Challan>>(`/challans/${id}`);
  return data.data;
}

export async function createChallan(payload: {
  customer_id: string;
  items: { product_id: string; quantity: number }[];
}) {
  const { data } = await api.post<ApiResponse<Challan>>('/challans', payload);
  return data.data;
}

export async function confirmChallan(id: string) {
  const { data } = await api.post<ApiResponse<Challan>>(`/challans/${id}/confirm`);
  return data.data;
}

export async function cancelChallan(id: string) {
  const { data } = await api.post<ApiResponse<Challan>>(`/challans/${id}/cancel`);
  return data.data;
}
