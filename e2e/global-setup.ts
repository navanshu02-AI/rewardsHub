import { chromium, type FullConfig } from '@playwright/test';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loginAs } from './helpers/auth';

interface PersonaConfig {
  name: string;
  storageStatePath: string;
  emailEnvVar: string;
  passwordEnvVar: string;
}

const authDir = path.join(__dirname, '.auth');

const personas: PersonaConfig[] = [
  {
    name: 'employee',
    storageStatePath: path.join(authDir, 'employee.json'),
    emailEnvVar: 'E2E_EMPLOYEE_EMAIL',
    passwordEnvVar: 'E2E_EMPLOYEE_PASSWORD'
  },
  {
    name: 'manager',
    storageStatePath: path.join(authDir, 'manager.json'),
    emailEnvVar: 'E2E_MANAGER_EMAIL',
    passwordEnvVar: 'E2E_MANAGER_PASSWORD'
  },
  {
    name: 'hr',
    storageStatePath: path.join(authDir, 'hr.json'),
    emailEnvVar: 'E2E_HR_EMAIL',
    passwordEnvVar: 'E2E_HR_PASSWORD'
  }
];

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const getBaseUrl = (config: FullConfig) => {
  const projectBaseUrl = config.projects[0]?.use?.baseURL;
  return (projectBaseUrl ?? config.use?.baseURL ?? 'http://localhost:3000') as string;
};

const ensureStorageState = async (baseURL: string, persona: PersonaConfig) => {
  if (await fileExists(persona.storageStatePath)) {
    return;
  }

  const email = process.env[persona.emailEnvVar];
  const password = process.env[persona.passwordEnvVar];

  if (!email || !password) {
    throw new Error(
      `Missing ${persona.name} credentials. Set ${persona.emailEnvVar} and ${persona.passwordEnvVar} to generate ${persona.storageStatePath}.`
    );
  }

  await mkdir(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await loginAs(page, { email, password });
    await page.context().storageState({ path: persona.storageStatePath });
  } finally {
    await browser.close();
  }
};

async function globalSetup(config: FullConfig) {
  const baseURL = getBaseUrl(config);

  for (const persona of personas) {
    await ensureStorageState(baseURL, persona);
  }
}

export default globalSetup;
