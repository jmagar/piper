import type { FetchedToolInfo } from "@/lib/mcp/enhanced/types";

// Define an interface for the raw tool structure from the API
interface ApiTool {
  fullId: string;
  name: string;
  description: string;
  serverId: string;
  serverLabel: string;
  // parameters?: any; // Add if parameters become part of the API response
}

export const getAllTools = async (): Promise<FetchedToolInfo[]> => {
  try {
    const response = await fetch('/api/mcp-tools-available');
    if (!response.ok) {
      console.error(`Error fetching tools: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (data && Array.isArray(data.tools)) {
      return data.tools.map((tool: ApiTool) => ({
        id: tool.fullId,
        name: tool.name,
        description: tool.description,
        serverKey: tool.serverId,
        serverLabel: tool.serverLabel,
        // parameters: tool.parameters // Assuming parameters are not yet part of the API response
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch or process tools:", error);
    return [];
  }
}

export function validateFile(file: File): boolean {
  // TODO: Implement actual file validation logic
  console.warn("STUB: validateFile() called, returning true.", file);
  return true;
}
