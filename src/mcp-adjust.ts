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
    .default("installs,sessions,revenue")
}, async (params, extra) => {
  try {
    // Parse the metrics into an array
    const metricsArray = params.metrics.split(',').map((m: string) => m.trim());

    // Fetch data from Adjust using our API module
    const reportData = await client.fetchReports(params.date, { metrics: metricsArray });

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
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Failed to fetch or analyze Adjust data: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

// Helper function to analyze report data
function analyzeReportData(data: any) {
  // This is a placeholder for your actual analysis logic
  // You would implement more sophisticated analysis based on your needs

  let analysis = "";

  if (!data || Object.keys(data).length === 0) {
    return "No data available for analysis.";
  }

  // Example: Summarize key metrics
  if (data.installs) {
    analysis += `Total Installs: ${data.installs}\n`;
  }

  if (data.sessions) {
    analysis += `Total Sessions: ${data.sessions}\n`;
  }

  if (data.revenue) {
    analysis += `Total Revenue: $${parseFloat(data.revenue).toFixed(2)}\n`;
  }

  // Add more analysis as needed
  analysis += "\nKey Insights:\n";
  analysis += "- This is where you would add insights based on the data\n";
  analysis += "- For example, comparing to previous periods or identifying trends\n";

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