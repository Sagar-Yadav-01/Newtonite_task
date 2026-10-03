import axios from 'axios';
import { ApiErrorResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('newtonite_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to format errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.error) {
      const errPayload: ApiErrorResponse = error.response.data;
      return Promise.reject({
        status: error.response.status,
        code: errPayload.error.code,
        message: errPayload.error.message,
        requestId: errPayload.error.requestId,
      });
    }
    return Promise.reject({
      status: error.response?.status || 500,
      code: 'NETWORK_ERROR',
      message: error.message || 'Unable to connect to the Newtonite server.',
    });
  }
);
