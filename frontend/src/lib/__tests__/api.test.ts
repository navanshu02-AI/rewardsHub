import { attachAuthToken } from '../api';
import type { InternalAxiosRequestConfig } from 'axios';

describe('api interceptors', () => {
  it('attaches Authorization header from localStorage', () => {
    localStorage.setItem('token', 'test-token');
    const config = attachAuthToken({ headers: { 'Content-Type': 'application/json' } } as InternalAxiosRequestConfig);

    expect(config.headers?.Authorization).toBe('Bearer test-token');
    localStorage.removeItem('token');
  });
});
