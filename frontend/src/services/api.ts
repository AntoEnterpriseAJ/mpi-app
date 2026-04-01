import { API_BASE_URL } from '../config/env';

export type HealthResponse = {
  message: string;
  status: string;
};

export type User = {
  id: number;
  name: string;
  role: string;
  position: string;
  seniority: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}.`);
  }

  return (await response.json()) as HealthResponse;
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/users`);

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}
