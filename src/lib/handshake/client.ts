/**
 * Handshake EDU API Client
 *
 * Typed client for the Handshake EDU API with pagination,
 * rate limiting, and error handling.
 *
 * API docs: https://docs.joinhandshake.com/edu-api
 */

import { sql } from '@/lib/db';
import { decrypt } from './encryption';

interface HandshakeConfig {
  apiKey: string;
  baseUrl: string;
  institutionId: string;
}

interface HandshakeError {
  status: string;
  code: string;
  detail: string;
}

interface HandshakeErrorResponse {
  errors: HandshakeError[];
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      next_cursor?: string;
      has_more?: boolean;
    };
  };
}

export class HandshakeApiClient {
  private config: HandshakeConfig | null = null;
  private institutionId: string;

  constructor(institutionId: string) {
    this.institutionId = institutionId;
  }

  /**
   * Load config from database (lazy initialization).
   */
  private async getConfig(): Promise<HandshakeConfig> {
    if (this.config) return this.config;

    const rows = await sql`
      SELECT api_key_encrypted, api_base_url
      FROM handshake_integrations
      WHERE institution_id = ${this.institutionId}
        AND is_active = true
    `;

    if (rows.length === 0) {
      throw new Error('No active Handshake integration found for this institution');
    }

    const row = rows[0];
    this.config = {
      apiKey: decrypt(row.api_key_encrypted as string),
      baseUrl: row.api_base_url as string,
      institutionId: this.institutionId,
    };

    return this.config;
  }

  /**
   * Make an authenticated request with retry logic.
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    const config = await this.getConfig();
    const url = new URL(`${config.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && attempt < 3) {
      const waitMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.request<T>(endpoint, params, attempt + 1);
    }

    if (!response.ok) {
      await this.handleErrors(response);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Handle API error responses.
   */
  private async handleErrors(response: Response): Promise<never> {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as HandshakeErrorResponse;
      if (body.errors && body.errors.length > 0) {
        detail = body.errors.map((e) => `${e.code}: ${e.detail}`).join('; ');
      }
    } catch {
      // Response may not be JSON
    }
    throw new Error(`Handshake API error: ${detail}`);
  }

  /**
   * Auto-paginate cursor-based results.
   */
  private async paginate<T>(
    endpoint: string,
    params?: Record<string, string>,
    maxPages = 10
  ): Promise<T[]> {
    const allResults: T[] = [];
    let cursor: string | undefined;
    let page = 0;

    while (page < maxPages) {
      const reqParams = { ...params };
      if (cursor) reqParams.cursor = cursor;

      const response = await this.request<PaginatedResponse<T>>(endpoint, reqParams);
      allResults.push(...(response.data || []));

      const pagination = response.meta?.pagination;
      if (!pagination?.has_more || !pagination?.next_cursor) break;

      cursor = pagination.next_cursor;
      page++;
    }

    return allResults;
  }

  /**
   * Test the connection by fetching a single job.
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.request('/jobs', { per_page: '1' });
      return {
        success: true,
        message: 'Connection successful',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - start,
      };
    }
  }

  async fetchJobs(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/jobs', params);
  }

  async fetchJobQualifications(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/job_qualifications', params);
  }

  async fetchApplications(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/applications', params);
  }

  async fetchPostings(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/postings', params);
  }

  async fetchStudents(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/students', params);
  }

  async fetchCareerFairs(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/career_fairs', params);
  }

  async fetchCareerFairAttendance(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/career_fair_attendance', params);
  }

  async fetchSurveys(params?: Record<string, string>) {
    return this.paginate<Record<string, unknown>>('/first_destination_surveys', params);
  }
}
