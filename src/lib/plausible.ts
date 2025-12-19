export interface PlausibleStats {
  visitors: number;
  pageviews: number;
  bounce_rate?: number;
  visit_duration?: number;
}

export class Plausible {
  private apiKey: string;
  private siteId: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.PLAUSIBLE_API_KEY!;
    this.siteId = process.env.PLAUSIBLE_SITE_ID!;
    this.baseURL = process.env.PLAUSIBLE_API_URL || 'https://plausible.io/api/v2/query';

    if (!this.apiKey || !this.siteId) {
      throw new Error('Plausible API key and site ID are required');
    }
  }

  public async getStats(dateRange: string = '30d'): Promise<PlausibleStats> {
    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: this.siteId,
          metrics: ['visitors', 'pageviews', 'bounce_rate', 'visit_duration'],
          date_range: dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`Plausible API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        visitors: data.results[0]?.metrics?.[0] || 0,
        pageviews: data.results[0]?.metrics?.[1] || 0,
        bounce_rate: data.results[0]?.metrics?.[2],
        visit_duration: data.results[0]?.metrics?.[3],
      };
    } catch (error) {
      console.error(`Error fetching Plausible stats: ${error}`);
      throw error;
    }
  }
}
