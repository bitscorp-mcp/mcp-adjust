import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import AdjustApiClient from "./adjust/client.js";
import { z } from "zod";

// Create an MCP server
const server = new McpServer({
  name: "Adjust",
  version: "1.0.0",
});

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Please provide a Mixpanel service account username and password and a project ID");
  process.exit(1);
}

const ADJUST_AUTH_TOKEN = process.env.ADJUST_AUTH_TOKEN || args[0] || "YOUR ADJUST AUTH TOKEN";

const client = new AdjustApiClient({
  apiKey: ADJUST_AUTH_TOKEN
});

server.tool("adjust-reporting", "Adjust reporting", {
  date: z.string()
    .describe("Date for the report in YYYY-MM-DD format")
    .default(new Date().toISOString().split('T')[0]),
  metrics: z.string()
    .describe("Comma-separated list of metrics to include")
    .default("installs,sessions,revenue"),
  dimensions: z.string().optional()
    .describe("Comma-separated values to group by (e.g., day,country,network). Options include: hour, day, week, month, year, quarter, os_name, device_type, app, app_token, store_id, store_type, currency, currency_code, network, campaign, campaign_network, campaign_id_network, adgroup, adgroup_network, adgroup_id_network, creative, country, country_code, region, partner_name, partner_id, channel, platform"),
  format_dates: z.boolean().optional()
    .describe("If false, date dimensions are returned in ISO format"),
  date_period: z.string().optional()
    .describe("Date period (e.g., this_month, yesterday, 2023-01-01:2023-01-31, -10d:-3d)"),
  cohort_maturity: z.enum(["immature", "mature"]).optional()
    .describe("Display values for immature or only mature cohorts"),
  utc_offset: z.string().optional()
    .describe("Timezone used in the report (e.g., +01:00)"),
  attribution_type: z.enum(["click", "impression", "all"]).optional()
    .default("click")
    .describe("Type of engagement the attribution awards"),
  attribution_source: z.enum(["first", "dynamic"]).optional()
    .default("dynamic")
    .describe("Whether in-app activity is assigned to install source or divided"),
  reattributed: z.enum(["all", "false", "true"]).optional()
    .default("all")
    .describe("Filter for reattributed users"),
  ad_spend_mode: z.enum(["adjust", "network", "mixed"]).optional()
    .describe("Determines the ad spend source applied in calculations"),
  sort: z.string().optional()
    .describe("Comma-separated list of metrics/dimensions to sort by (use - for descending)"),
  currency: z.string().optional()
    .default("USD")
    .describe("Currency used for conversion of money related metrics"),
}, async (params, extra) => {
  try {
    // Convert all params to a query parameters object
    const queryParams: Record<string, any> = {};

    // Add all non-undefined parameters to the query
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams[key] = value;
      }
    });

    // Fetch data from Adjust using our API module
    const reportData = await client.fetchReports(params.date, queryParams);

    // Handle empty response
    if (!reportData || Object.keys(reportData).length === 0) {
      return {
        isError: false,
        content: [
          {
            type: "text" as const,
            text: `## Adjust Report for ${params.date}\n\nNo data available for the specified parameters.`,
          }
        ],
      };
    }

    // Simple analysis of the data
    const analysis = analyzeReportData(reportData);

    return {
      isError: false,
      content: [
        {
          type: "text" as const,
          text: `## Adjust Report for ${params.date}\n\n${analysis}\n\n\`\`\`json\n${JSON.stringify(reportData, null, 2)}\n\`\`\``,
        }
      ],
    };
  } catch (error) {
    console.error("Error fetching or analyzing Adjust data:", error);

    // Extract status code and message
    let statusCode = 500;
    let errorMessage = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for Axios error with response
      if ('response' in error && error.response && typeof error.response === 'object') {
        const axiosError = error as any;
        statusCode = axiosError.response.status;

        // Provide helpful messages based on status code
        switch (statusCode) {
          case 400:
            errorMessage = "Bad request: Your query contains invalid parameters or is malformed.";
            break;
          case 401:
            errorMessage = "Unauthorized: Please check your API credentials.";
            break;
          case 403:
            errorMessage = "Forbidden: You don't have permission to access this data.";
            break;
          case 429:
            errorMessage = "Too many requests: You've exceeded the rate limit (max 50 simultaneous requests).";
            break;
          case 503:
            errorMessage = "Service unavailable: The Adjust API is currently unavailable.";
            break;
          case 504:
            errorMessage = "Gateway timeout: The query took too long to process.";
            break;
          default:
            errorMessage = axiosError.response.data?.message || errorMessage;
        }
      }
    }

    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `## Error Fetching Adjust Data\n\n**Status Code**: ${statusCode}\n\n**Error**: ${errorMessage}\n\nPlease check your parameters and try again.`,
        },
      ],
    };
  }
});

// Add a new tool for standard reports with simplified parameters
server.tool("adjust-standard-report", "Get a standard Adjust report with common metrics", {
  app_tokens: z.string()
    .describe("Comma-separated list of app tokens to include")
    .default(""),
  date_range: z.string()
    .describe("Date range (e.g., 2023-01-01:2023-01-31, yesterday, last_7_days, this_month)")
    .default("last_7_days"),
  report_type: z.enum(["performance", "retention", "cohort", "revenue"])
    .describe("Type of standard report to generate")
    .default("performance"),
}, async (params, extra) => {
  try {
    // Set up metrics and dimensions based on report type
    let metrics: string[] = [];
    let dimensions: string[] = [];

    switch (params.report_type) {
      case "performance":
        metrics = ["installs", "clicks", "impressions", "network_cost", "network_ecpi", "sessions"];
        dimensions = ["app", "partner_name", "campaign", "day"];
        break;
      case "retention":
        metrics = ["installs", "retention_rate_d1", "retention_rate_d7", "retention_rate_d30"];
        dimensions = ["app", "partner_name", "campaign", "day"];
        break;
      case "cohort":
        metrics = ["installs", "sessions_per_user", "revenue_per_user"];
        dimensions = ["app", "partner_name", "campaign", "cohort"];
        break;
      case "revenue":
        metrics = ["installs", "revenue", "arpu", "arpdau"];
        dimensions = ["app", "partner_name", "campaign", "day"];
        break;
    }

    // Build query parameters
    const queryParams: Record<string, any> = {
      date_period: params.date_range,
      metrics: metrics.join(','),
      dimensions: dimensions.join(','),
      ad_spend_mode: "network"
    };

    // Handle app tokens
    if (params.app_tokens) {
      queryParams.app_token__in = params.app_tokens;
    }

    // Fetch data from Adjust
    const reportData = await client.fetchReports(params.date_range, queryParams);

    // Generate a report title based on the type
    const reportTitle = `## Adjust ${params.report_type.charAt(0).toUpperCase() + params.report_type.slice(1)} Report`;
    const dateRangeInfo = `### Date Range: ${params.date_range}`;

    // Analyze the data
    const analysis = analyzeReportData(reportData);

    return {
      isError: false,
      content: [
        {
          type: "text" as const,
          text: `${reportTitle}\n${dateRangeInfo}\n\n${analysis}\n\n\`\`\`json\n${JSON.stringify(reportData, null, 2)}\n\`\`\``,
        }
      ],
    };
  } catch (error) {
    console.error("Error fetching standard Adjust report:", error);

    // Extract status code and message (same error handling as before)
    let statusCode = 500;
    let errorMessage = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;

      if ('response' in error && error.response && typeof error.response === 'object') {
        const axiosError = error as any;
        statusCode = axiosError.response.status;

        // Provide helpful messages based on status code
        switch (statusCode) {
          case 400:
            errorMessage = "Bad request: Your query contains invalid parameters or is malformed.";
            break;
          case 401:
            errorMessage = "Unauthorized: Please check your API credentials.";
            break;
          case 403:
            errorMessage = "Forbidden: You don't have permission to access this data.";
            break;
          case 429:
            errorMessage = "Too many requests: You've exceeded the rate limit.";
            break;
          case 503:
            errorMessage = "Service unavailable: The Adjust API is currently unavailable.";
            break;
          case 504:
            errorMessage = "Gateway timeout: The query took too long to process.";
            break;
          default:
            errorMessage = axiosError.response.data?.message || errorMessage;
        }
      }
    }

    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `## Error Fetching Adjust Standard Report\n\n**Status Code**: ${statusCode}\n\n**Error**: ${errorMessage}\n\nPlease check your parameters and try again.`,
        },
      ],
    };
  }
});

// Helper function to analyze report data
function analyzeReportData(data: any) {
  let analysis = "";

  if (!data || !data.rows || data.rows.length === 0) {
    return "No data available for analysis.";
  }

  // Add totals summary
  if (data.totals) {
    analysis += "## Summary\n";
    Object.entries(data.totals).forEach(([metric, value]) => {
      analysis += `**Total ${metric}**: ${value}\n`;
    });
    analysis += "\n";
  }

  // Add row analysis
  analysis += "## Breakdown\n";

  // Get all metrics (non-dimension fields) from the first row
  const firstRow = data.rows[0];
  const metrics = Object.keys(firstRow).filter(key =>
    !['attr_dependency', 'app', 'partner_name', 'campaign', 'campaign_id_network',
      'campaign_network', 'adgroup', 'creative', 'country', 'os_name', 'day', 'week',
      'month', 'year'].includes(key)
  );

  // Analyze each row
  data.rows.forEach((row: any, index: number) => {
    // Create a title for this row based on available dimensions
    let rowTitle = "";
    if (row.campaign) rowTitle += `Campaign: ${row.campaign} `;
    if (row.partner_name) rowTitle += `(${row.partner_name}) `;
    if (row.app) rowTitle += `- App: ${row.app} `;
    if (row.country) rowTitle += `- Country: ${row.country} `;
    if (row.os_name) rowTitle += `- OS: ${row.os_name} `;

    analysis += `### ${rowTitle || `Row ${index + 1}`}\n`;

    // Add metrics for this row
    metrics.forEach(metric => {
      if (row[metric] !== undefined) {
        analysis += `**${metric}**: ${row[metric]}\n`;
      }
    });
    analysis += "\n";
  });

  // Add warnings if any
  if (data.warnings && data.warnings.length > 0) {
    analysis += "## Warnings\n";
    data.warnings.forEach((warning: string) => {
      analysis += `- ${warning}\n`;
    });
  }

  return analysis;
}

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Adjust MCP Server running");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();