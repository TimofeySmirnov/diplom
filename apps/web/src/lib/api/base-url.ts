const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? '4000';
const DEFAULT_API_PATH = '/api';

export function getApiBaseUrl() {
  const configuredUrl = normalizeApiBaseUrl(CONFIGURED_API_BASE_URL);

  if (typeof window === 'undefined') {
    return configuredUrl || `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
  }

  const browserHost = window.location.hostname;
  if (browserHost && shouldUseBrowserHost(browserHost, configuredUrl)) {
    const protocol = window.location.protocol || 'http:';
    const port = readApiPort(configuredUrl);
    const path = readApiPath(configuredUrl);
    return `${protocol}//${browserHost}:${port}${path}`;
  }

  return configuredUrl || `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
}

export function getApiOrigin() {
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return '';
  }
}

function shouldUseBrowserHost(browserHost: string, configuredUrl: string) {
  if (isLocalHost(browserHost)) {
    return false;
  }

  if (!configuredUrl) {
    return true;
  }

  try {
    const configuredHost = new URL(configuredUrl).hostname;
    return isLocalHost(configuredHost) || configuredHost === '0.0.0.0';
  } catch {
    return true;
  }
}

function readApiPort(configuredUrl: string) {
  if (!configuredUrl) {
    return DEFAULT_API_PORT;
  }

  try {
    return new URL(configuredUrl).port || DEFAULT_API_PORT;
  } catch {
    return DEFAULT_API_PORT;
  }
}

function readApiPath(configuredUrl: string) {
  if (!configuredUrl) {
    return DEFAULT_API_PATH;
  }

  try {
    const path = new URL(configuredUrl).pathname.replace(/\/$/, '');
    return path || DEFAULT_API_PATH;
  } catch {
    return DEFAULT_API_PATH;
  }
}

function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/$/, '');
}

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
