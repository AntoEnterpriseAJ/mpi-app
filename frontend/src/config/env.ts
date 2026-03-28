const DEFAULT_API_BASE_URL = 'http://localhost:8000';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  '',
);
