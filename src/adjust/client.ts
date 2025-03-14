import axios, { AxiosInstance } from "axios";

interface AdjustApiConfig {
  apiKey: string;
  baseUrl?: string;
}

class AdjustApiClient {
  private axiosInstance: AxiosInstance;

  constructor(private config: AdjustApiConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || "https://api.adjust.com",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async getReport(endpoint: string, params?: Record<string, any>) {
    try {
      const response = await this.axiosInstance.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.error("Adjust API Error:", error);
      throw error;
    }
  }

  async fetchReports(date = "2024-03-10", additionalParams = {}) {
    try {
      const data = await this.getReport("/reports", {
        date,
        ...additionalParams,
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch reports", error);
      throw error;
    }
  }
}

export default AdjustApiClient;
