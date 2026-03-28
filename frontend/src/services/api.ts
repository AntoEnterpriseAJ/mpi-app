import { API_BASE_URL } from '../config/env';

export type HealthResponse = {
  message: string;
  status: string;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}.`);
  }

  return (await response.json()) as HealthResponse;
}
