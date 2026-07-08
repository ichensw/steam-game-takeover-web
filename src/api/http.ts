import axios from 'axios';
import { clearSession, getToken } from '../auth';

export type ApiResponse<T> = {
  success: boolean;
  code: string;
  message: string;
  data: T;
};

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/miniprogram-api/api',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      if (location.pathname !== '/login') location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(request: Promise<{ data: ApiResponse<T> }>) {
  let response;
  try {
    response = await request;
  } catch (error) {
    const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    throw new Error(responseMessage || (error instanceof Error ? error.message : '请求失败'));
  }
  if (response.data.success === false) {
    throw new Error(response.data.message || '请求失败');
  }
  return response.data.data;
}

