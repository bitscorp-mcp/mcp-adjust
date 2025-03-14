import axios, { AxiosInstance } from "axios";

interface AdjustApiConfig {
  apiKey: string;
  baseUrl?: string;
}

class AdjustApiClient {
  private axiosInstance: AxiosInstance;

  constructor(private config: AdjustApiConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || "https://automate.adjust.com",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async fetchReports(date: string, params: Record<string, any> = {}) {
    try {
      // Build query parameters
      const queryParams: Record<string, any> = {
        ...params
      };

      // If date_period is not provided, use the date parameter
      if (!queryParams.date_period) {
        queryParams.date_period = date;
      }

      // Make the request to the reports-service endpoint
      const response = await this.axiosInstance.get('/reports-service/report', {
        params: queryParams
      });

      return response.data;
    } catch (error) {
      console.error("Adjust API Error:", error);
      throw error;
    }
  }

  // Example method to fetch a specific report with common parameters
  async getStandardReport(appTokens: string[], dateRange: string, metrics: string[] = ["installs", "sessions", "revenue"]) {
    return this.fetchReports(dateRange, {
      app_token__in: appTokens.join(','),
      date_period: dateRange,
      dimensions: "app,partner_name,campaign,day",
      metrics: metrics.join(','),
      ad_spend_mode: "network"
    });
  }
}

export default AdjustApiClient;
