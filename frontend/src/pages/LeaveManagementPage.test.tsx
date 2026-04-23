import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LeaveManagementPage } from './LeaveManagementPage';

type FetchResponseHandler = (
  url: string,
  init: RequestInit | undefined,
  callIndex: number,
) => Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(year, month - 1, day));
}

function mockFetchWith(handler: FetchResponseHandler) {
  let callIndex = 0;
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        callIndex += 1;
        return handler(url, init, callIndex);
      },
    );
}

async function selectValidDatesAndSubmit(
  startDate = '2026-04-25',
  endDate = '2026-04-25',
): Promise<void> {
  fireEvent.change(await screen.findByLabelText('Start date'), {
    target: { value: startDate },
  });
  fireEvent.change(screen.getByLabelText('End date'), {
    target: { value: endDate },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Submit Leave Request' }));
}

describe('LeaveManagementPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a valid leave request and refreshes history', async () => {
    const createdRequest = {
      id: 77,
      user_id: 1,
      start_date: '2026-04-25',
      end_date: '2026-04-25',
      days_requested: 1,
      status: 'PENDING',
      created_at: '2026-04-20T10:00:00Z',
    };

    const fetchSpy = mockFetchWith(async (url, init, callIndex) => {
      const method = init?.method ?? 'GET';

      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }

      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        if (callIndex < 4) {
          return jsonResponse([]);
        }
        return jsonResponse([createdRequest]);
      }

      if (url.endsWith('/leave/request') && method === 'POST') {
        return jsonResponse(createdRequest, 201);
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    await selectValidDatesAndSubmit();

    expect(
      await screen.findByText('Leave request created successfully.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('PENDING')).toBeInTheDocument();

    const postRequestCall = fetchSpy.mock.calls.find(([, init]) => {
      return init?.method === 'POST';
    });

    expect(postRequestCall).toBeDefined();
    expect(String(postRequestCall?.[0])).toContain('/leave/request');
  });

  it('prevents submission when end date is before start date', async () => {
    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Maria Ionescu',
            role: 'Manager',
            position: 'Engineering Manager',
            seniority: 'Senior',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        return jsonResponse([]);
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Start date'), {
      target: { value: '2026-04-25' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-04-24' },
    });

    expect(
      screen.getByText('End date must be on or after the start date.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Submit Leave Request' }),
    ).toBeDisabled();
  });

  it('shows backend 400 entitlement error when leave balance is exceeded', async () => {
    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        return jsonResponse([]);
      }
      if (url.endsWith('/leave/request') && method === 'POST') {
        return jsonResponse(
          {
            detail: 'Not enough leave days. Requested: 5, Available: 1.5',
          },
          400,
        );
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    await selectValidDatesAndSubmit('2026-04-25', '2026-04-29');

    expect(
      await screen.findByText(
        'Not enough leave days. Requested: 5, Available: 1.5',
      ),
    ).toBeInTheDocument();
  });

  it('shows frontend 404 message when selected user no longer exists', async () => {
    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        return jsonResponse([]);
      }
      if (url.endsWith('/leave/request') && method === 'POST') {
        return jsonResponse({ detail: 'User not found' }, 404);
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    await selectValidDatesAndSubmit();

    expect(
      await screen.findByText(
        'Selected user was not found. Refresh users and choose a valid user.',
      ),
    ).toBeInTheDocument();
  });

  it('renders history entries in newest-first order provided by API', async () => {
    const newestRequest = {
      id: 20,
      user_id: 1,
      start_date: '2026-05-10',
      end_date: '2026-05-12',
      days_requested: 3,
      status: 'APPROVED',
      created_at: '2026-05-01T09:30:00Z',
    };

    const olderRequest = {
      id: 10,
      user_id: 1,
      start_date: '2026-04-15',
      end_date: '2026-04-16',
      days_requested: 2,
      status: 'PENDING',
      created_at: '2026-04-10T08:20:00Z',
    };

    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        return jsonResponse([newestRequest, olderRequest]);
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);

    expect(
      within(rows[1]).getByText(formatDate(newestRequest.start_date)),
    ).toBeInTheDocument();
    expect(
      within(rows[2]).getByText(formatDate(olderRequest.start_date)),
    ).toBeInTheDocument();
  });

  it('shows no-history message when API returns 404 for user history', async () => {
    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        return jsonResponse(
          { detail: 'No leave requests found for this user' },
          404,
        );
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No leave requests found for this user'),
    ).toBeInTheDocument();
  });

  it('shows history loading failure and supports retry action', async () => {
    let shouldFailHistory = true;

    mockFetchWith(async (url, init) => {
      const method = init?.method ?? 'GET';
      if (url.endsWith('/users') && method === 'GET') {
        return jsonResponse([
          {
            id: 1,
            name: 'Ion Popescu',
            role: 'User',
            position: 'Backend Developer',
            seniority: 'Mid',
          },
        ]);
      }
      if (url.endsWith('/leave/my-requests/1') && method === 'GET') {
        if (shouldFailHistory) {
          shouldFailHistory = false;
          return jsonResponse({ detail: 'Temporary backend error' }, 500);
        }
        return jsonResponse([]);
      }
      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    render(
      <MemoryRouter>
        <LeaveManagementPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Could not load leave history'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Could not load leave history'),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByText('No leave requests found for this user.'),
    ).toBeInTheDocument();
  });
});
