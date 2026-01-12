import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`
});

export const attachAuthToken = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  const orgId = localStorage.getItem('orgId')?.trim();
  const headers = { ...(config.headers ?? {}) } as any;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (orgId) {
    headers['X-Org-Id'] = orgId;
  }
  // Casting to `any` avoids TypeScript errors with `AxiosHeaders` methods.
  config.headers = headers;
  return config;
};

const normalizeError = (error: AxiosError) => {
  if (error.response) {
    const data = error.response.data;
    if (typeof data === 'string') {
      (error.response as AxiosResponse).data = { detail: data };
    } else if (data && typeof data === 'object') {
      const detail = (data as { detail?: string; message?: string }).detail ?? (data as { message?: string }).message;
      if (detail && !(data as { detail?: string }).detail) {
        (error.response as AxiosResponse).data = { ...data, detail };
      }
    }
  } else {
    (error as AxiosError).response = {
      data: { detail: error.message }
    } as AxiosResponse;
  }

  return Promise.reject(error);
};

api.interceptors.request.use(attachAuthToken);
api.interceptors.response.use((response) => response, normalizeError);

export default api;
