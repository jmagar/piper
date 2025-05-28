import { exaCrawlToolConfig as crawlConfig } from "./crawl/crawlTool.definition"
import { crawlTool } from "./crawl/tool"
import { exaSearchToolConfig as webSearchConfig } from "./webSearch/webSearchTool.definition"
import { webSearchTool } from "./webSearch/tool"

const isAvailable = (envVars: string[]) => {
  return envVars.every((v) => !!process.env[v])
}

export const exaTools = {
  "exa.webSearch": {
    ...webSearchTool,
    isAvailable: () => isAvailable(webSearchConfig.envVars),
  },
  "exa.crawl": {
    ...crawlTool,
    isAvailable: () => isAvailable(crawlConfig.envVars),
  },
}
