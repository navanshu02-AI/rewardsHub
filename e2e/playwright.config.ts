import { defineConfig } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '.auth');

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html']],
  retries: process.env.CI ? 2 : 0,
  globalSetup: './global-setup',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'employee',
      use: {
        storageState: path.join(authDir, 'employee.json')
      }
    },
    {
      name: 'manager',
      use: {
        storageState: path.join(authDir, 'manager.json')
      }
    },
    {
      name: 'executive',
      use: {
        storageState: path.join(authDir, 'executive.json')
      }
    },
    {
      name: 'hr',
      use: {
        storageState: path.join(authDir, 'hr.json')
      }
    }
  ]
});
