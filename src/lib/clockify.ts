export interface ClockifyProject {
  id: string;
  name: string;
  clientId: string;
  workspaceId: string;
  billable: boolean;
  color: string;
  estimate?: {
    estimate: string;
    type: string;
  };
}

export interface ClockifyUser {
  id: string;
  email: string;
  name: string;
  activeWorkspace?: string;
  defaultWorkspace?: string;
}

export interface ClockifyTimeInterval {
  start: string;
  end: string | null;
  duration: string | null;
}

export interface ClockifyTimeEntry {
  id: string;
  description: string | null;
  projectId: string | null;
  taskId: string | null;
  tagIds?: string[] | null;
  billable: boolean;
  userId: string;
  workspaceId: string;
  timeInterval: ClockifyTimeInterval;
}

export type StartTimerInput = {
  /** Clockify project id (optional — unassigned timer if omitted). */
  projectId?: string;
  description?: string;
  billable?: boolean;
  /** ISO-8601 start; defaults to now. */
  start?: string;
};

export class Clockify {
  private apiKey: string;
  private workspaceId: string;
  private baseURL = 'https://api.clockify.me/api/v1';
  private cachedUserId: string | null = null;

  constructor() {
    this.apiKey = process.env.CLOCKIFY_API_KEY!;
    this.workspaceId = process.env.CLOCKIFY_WORKSPACE_ID!;

    if (!this.apiKey || !this.workspaceId) {
      throw new Error('Clockify API key and workspace ID are required');
    }
  }

  private headers(): HeadersInit {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${path}`, {
      ...init,
      headers: {
        ...this.headers(),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // ignore body read errors
      }
      throw new Error(
        `Clockify API error: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  public async getProjects(): Promise<ClockifyProject[]> {
    try {
      return await this.request<ClockifyProject[]>(
        `/workspaces/${this.workspaceId}/projects?hydrated=true&page-size=1000`,
      );
    } catch (error) {
      console.error(`Error fetching Clockify projects: ${error}`);
      throw error;
    }
  }

  /** Resolve the Clockify user for the configured API key. */
  public async getCurrentUser(): Promise<ClockifyUser> {
    return this.request<ClockifyUser>('/user');
  }

  private async getUserId(): Promise<string> {
    if (process.env.CLOCKIFY_USER_ID) {
      return process.env.CLOCKIFY_USER_ID;
    }
    if (this.cachedUserId) return this.cachedUserId;
    const user = await this.getCurrentUser();
    this.cachedUserId = user.id;
    return user.id;
  }

  /**
   * Start a running timer (time entry with no end).
   * Clockify may auto-stop any previously running timer for this user.
   */
  public async startTimer(input: StartTimerInput = {}): Promise<ClockifyTimeEntry> {
    const body: Record<string, unknown> = {
      start: input.start ?? new Date().toISOString(),
      type: 'REGULAR',
    };
    if (input.projectId) body.projectId = input.projectId;
    if (input.description != null) body.description = input.description;
    if (input.billable != null) body.billable = input.billable;

    return this.request<ClockifyTimeEntry>(`/workspaces/${this.workspaceId}/time-entries`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** Stop the currently running timer for the API-key user. */
  public async stopTimer(end?: string): Promise<ClockifyTimeEntry> {
    const userId = await this.getUserId();
    return this.request<ClockifyTimeEntry>(
      `/workspaces/${this.workspaceId}/user/${userId}/time-entries`,
      {
        method: 'PATCH',
        body: JSON.stringify({ end: end ?? new Date().toISOString() }),
      },
    );
  }

  /** In-progress timers on the workspace (filtered to the API-key user when possible). */
  public async getInProgressTimers(): Promise<ClockifyTimeEntry[]> {
    const entries = await this.request<ClockifyTimeEntry[]>(
      `/workspaces/${this.workspaceId}/time-entries/status/in-progress`,
    );
    const userId = await this.getUserId().catch(() => null);
    if (!userId) return entries;
    return entries.filter((entry) => entry.userId === userId);
  }
}
