import { createEnhancedSSEMCPClient, EnhancedSSEConfig } from './enhanced-mcp-client'

export async function loadMCPToolsFromURL(url: string) {
  const config: EnhancedSSEConfig = {
    url,
    clientName: 'piper-mcp-client',
    timeout: 30000
  }

  const client = await createEnhancedSSEMCPClient(config)
  return { tools: client.tools, close: () => client.close() }
}
