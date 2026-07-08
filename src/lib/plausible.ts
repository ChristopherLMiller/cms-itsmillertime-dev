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
    let response: Response;
    try {
      response = await fetch(this.baseURL, {
        method: 'POST',
        // Do not silently follow redirects: a proxy/CDN redirecting API calls
        // to an HTML page would otherwise surface as an opaque JSON parse error
        // ("Unexpected token '<'") that hides the real status and destination.
        redirect: 'manual',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_id: this.siteId,
          ...body,
        }),
      });
    } catch (error) {
      throw new Error(
        `Plausible API unreachable at ${this.baseURL}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') ?? '(no Location header)';
      throw new Error(
        `Plausible API at ${this.baseURL} returned ${response.status} redirect to ${location}. The host is misrouted — a proxy/CDN is redirecting API calls instead of serving Plausible.`,
      );
    }

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      throw new Error(`Plausible API error: ${response.status} ${response.statusText} ${text.slice(0, 200)}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (text.trim() && !contentType.includes('json')) {
      throw new Error(
        `Plausible API at ${this.baseURL} returned ${contentType || 'a non-JSON response'} instead of JSON: ${text.slice(0, 200)}`,
      );
    }

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Plausible API at ${this.baseURL} returned an unparseable body: ${text.slice(0, 200)}`,
      );
    }
  }
}
