export interface PlausibleStats {
  visitors: number;
  pageviews: number;
  bounce_rate?: number;
  visit_duration?: number;
}

export interface PlausibleBreakdownRow {
  name: string;
  visitors: number;
  pageviews: number;
}

type PlausibleQueryResult = {
  dimensions?: string[];
  metrics?: number[];
};

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
      const data = await this.query({
        metrics: ['visitors', 'pageviews', 'bounce_rate', 'visit_duration'],
        date_range: dateRange,
      });

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

  public async getTopPages(
    dateRange: string = '30d',
    limit: number = 5,
  ): Promise<PlausibleBreakdownRow[]> {
    return this.getBreakdownWithFallbacks(['event:page', 'visit:entry_page'], dateRange, limit);
  }

  public async getTopReferrers(
    dateRange: string = '30d',
    limit: number = 5,
  ): Promise<PlausibleBreakdownRow[]> {
    return this.getBreakdownWithFallbacks(['visit:referrer', 'visit:source'], dateRange, limit);
  }

  public async getTopCountries(
    dateRange: string = '30d',
    limit: number = 5,
  ): Promise<PlausibleBreakdownRow[]> {
    return this.getBreakdownWithFallbacks(['visit:country_name', 'visit:country'], dateRange, limit);
  }

  private async getBreakdownWithFallbacks(
    dimensions: string[],
    dateRange: string,
    limit: number,
  ): Promise<PlausibleBreakdownRow[]> {
    for (const dimension of dimensions) {
      const rows = await this.getBreakdown(dimension, dateRange, limit).catch(() => []);
      if (rows.length > 0) {
        return rows;
      }
    }

    return [];
  }

  private async getBreakdown(
    dimension: string,
    dateRange: string,
    limit: number,
  ): Promise<PlausibleBreakdownRow[]> {
    const data = await this.query({
      metrics: ['visitors', 'pageviews'],
      dimensions: [dimension],
      date_range: dateRange,
      filters: [['is_not', dimension, ['']]],
      order_by: [['visitors', 'desc']],
      include: { imports: true },
      pagination: {
        limit,
        offset: 0,
      },
    });

    return (data.results as PlausibleQueryResult[]).map((row) => ({
      name: row.dimensions?.[0] || '(direct)',
      visitors: row.metrics?.[0] || 0,
      pageviews: row.metrics?.[1] || 0,
    }));
  }

  private async query(body: Record<string, unknown>) {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: this.siteId,
        ...body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Plausible API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
