import { chromium, type FullConfig } from '@playwright/test';
import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { loginAs } from './helpers/auth';
import { TEST_USERS } from './constants/users';

interface PersonaConfig {
  name: string;
  storageStatePath: string;
  email: string;
  password: string;
}

const authDir = path.join(__dirname, '.auth');

const personas: PersonaConfig[] = [
  {
    name: 'employee',
    storageStatePath: path.join(authDir, 'employee.json'),
    email: TEST_USERS.employee1.email,
    password: TEST_USERS.employee1.password
  },
  {
    name: 'manager',
    storageStatePath: path.join(authDir, 'manager.json'),
    email: TEST_USERS.manager.email,
    password: TEST_USERS.manager.password
  },
  {
    name: 'hr',
    storageStatePath: path.join(authDir, 'hr.json'),
    email: TEST_USERS.hrAdmin.email,
    password: TEST_USERS.hrAdmin.password
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

  await mkdir(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await loginAs(page, { email: persona.email, password: persona.password });
    await page.context().storageState({ path: persona.storageStatePath });
  } finally {
    await browser.close();
  }
};

const execFileAsync = promisify(execFile);

const ensureHrAdminUser = async (repoRoot: string) => {
  const scriptPath = path.resolve(repoRoot, 'backend', 'scripts', 'create_admin.py');
  await execFileAsync(
    'python',
    [
      scriptPath,
      TEST_USERS.hrAdmin.email,
      TEST_USERS.hrAdmin.password,
      `${TEST_USERS.hrAdmin.firstName}`,
      `${TEST_USERS.hrAdmin.lastName}`,
      '--role',
      TEST_USERS.hrAdmin.role,
      '--department',
      TEST_USERS.hrAdmin.department ?? '',
      '--company',
      TEST_USERS.hrAdmin.company ?? ''
    ],
    { cwd: repoRoot }
  );
};

const requestJson = async <T>(
  baseURL: string,
  pathName: string,
  options: RequestInit & { token?: string } = {}
) => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${baseURL}${pathName}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${message}`);
  }

  return (await response.json()) as T;
};

const loginAndGetToken = async (baseURL: string, email: string, password: string) => {
  const tokenResponse = await requestJson<{ access_token: string }>(baseURL, '/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  return tokenResponse.access_token;
};

const getCurrentUser = async (baseURL: string, token: string) =>
  requestJson<{ id: string }>(baseURL, '/api/v1/users/me', { token });

const getUsersByEmail = async (baseURL: string, token: string) => {
  const users = await requestJson<Array<{ id: string; email: string }>>(baseURL, '/api/v1/users', {
    token
  });
  return new Map(users.map((user) => [user.email, user]));
};

const updateReporting = async (
  baseURL: string,
  token: string,
  userId: string,
  payload: { role?: string; manager_id?: string }
) =>
  requestJson(baseURL, `/api/v1/users/${userId}/reporting`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload)
  });

const provisionUser = async (
  baseURL: string,
  token: string,
  payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
    manager_id?: string;
    department?: string;
    company?: string;
  }
) =>
  requestJson<{ id: string; email: string }>(baseURL, '/api/v1/users/provision', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });

const ensureUserProvisioned = async (
  baseURL: string,
  token: string,
  usersByEmail: Map<string, { id: string; email: string }>,
  payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: string;
    manager_id?: string;
    department?: string;
    company?: string;
  }
) => {
  const existing = usersByEmail.get(payload.email);
  if (existing) {
    await updateReporting(baseURL, token, existing.id, {
      role: payload.role,
      manager_id: payload.manager_id
    });
    return existing;
  }

  const created = await provisionUser(baseURL, token, payload);
  usersByEmail.set(created.email, created);
  return created;
};

const ensureTestUsers = async (baseURL: string) => {
  const repoRoot = path.resolve(__dirname, '..');
  await ensureHrAdminUser(repoRoot);

  const hrToken = await loginAndGetToken(baseURL, TEST_USERS.hrAdmin.email, TEST_USERS.hrAdmin.password);
  const hrUser = await getCurrentUser(baseURL, hrToken);
  const usersByEmail = await getUsersByEmail(baseURL, hrToken);

  await ensureUserProvisioned(baseURL, hrToken, usersByEmail, {
    email: TEST_USERS.executive.email,
    password: TEST_USERS.executive.password,
    first_name: TEST_USERS.executive.firstName,
    last_name: TEST_USERS.executive.lastName,
    role: TEST_USERS.executive.role,
    manager_id: hrUser.id,
    company: TEST_USERS.executive.company
  });

  const managerUser = await ensureUserProvisioned(baseURL, hrToken, usersByEmail, {
    email: TEST_USERS.manager.email,
    password: TEST_USERS.manager.password,
    first_name: TEST_USERS.manager.firstName,
    last_name: TEST_USERS.manager.lastName,
    role: TEST_USERS.manager.role,
    manager_id: hrUser.id,
    department: TEST_USERS.manager.department,
    company: TEST_USERS.manager.company
  });

  await ensureUserProvisioned(baseURL, hrToken, usersByEmail, {
    email: TEST_USERS.employee1.email,
    password: TEST_USERS.employee1.password,
    first_name: TEST_USERS.employee1.firstName,
    last_name: TEST_USERS.employee1.lastName,
    role: TEST_USERS.employee1.role,
    manager_id: managerUser.id,
    company: TEST_USERS.employee1.company
  });

  await ensureUserProvisioned(baseURL, hrToken, usersByEmail, {
    email: TEST_USERS.employee2.email,
    password: TEST_USERS.employee2.password,
    first_name: TEST_USERS.employee2.firstName,
    last_name: TEST_USERS.employee2.lastName,
    role: TEST_USERS.employee2.role,
    manager_id: managerUser.id,
    company: TEST_USERS.employee2.company
  });
};

async function globalSetup(config: FullConfig) {
  const baseURL = getBaseUrl(config);

  await ensureTestUsers(baseURL);

  for (const persona of personas) {
    await ensureStorageState(baseURL, persona);
  }
}

export default globalSetup;
