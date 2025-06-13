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

export class Clockify {
  private apiKey: string;
  private workspaceId: string;
  private baseURL = 'https://api.clockify.me/api/v1';

  constructor() {
    this.apiKey = process.env.CLOCKIFY_API_KEY!;
    this.workspaceId = process.env.CLOCKIFY_WORKSPACE_ID!;

    if (!this.apiKey || !this.workspaceId) {
      throw new Error('Clockify API key and workspace ID are required');
    }
  }

  public async getProjects(): Promise<ClockifyProject[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/workspaces/${this.workspaceId}/projects?hydrated=true`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Clockify API error: ${response.status} ${response.statusText}`);
      }

      const projects: ClockifyProject[] = await response.json();
      return projects;
    } catch (error) {
      console.error(`Error fetching Clockify projecdts: ${error}`);
      throw error;
    }
  }
}
