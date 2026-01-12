import { attachAuthToken } from '../api';
import type { InternalAxiosRequestConfig } from 'axios';

describe('api interceptors', () => {
  it('attaches Authorization header from localStorage', () => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('orgId', 'acme-org');
    const config = attachAuthToken({ headers: { 'Content-Type': 'application/json' } } as InternalAxiosRequestConfig);

    expect(config.headers?.Authorization).toBe('Bearer test-token');
    expect(config.headers?.['X-Org-Id']).toBe('acme-org');
    localStorage.removeItem('token');
    localStorage.removeItem('orgId');
  });
});
