import {
  FilmStrip,
  Ticket,
  DownloadSimple,
  Magnet,
  ChartLineUp,
  Detective,
  Cube,
  WifiHigh,
  HardDrives,
  Bell,
} from "@phosphor-icons/react/dist/ssr"

export const NON_AUTH_DAILY_MESSAGE_LIMIT = 5
export const AUTH_DAILY_MESSAGE_LIMIT = 1000
export const REMAINING_QUERY_ALERT_THRESHOLD = 2
export const DAILY_FILE_UPLOAD_LIMIT = 5
export const DAILY_SPECIAL_AGENT_LIMIT = 2
export const DAILY_LIMIT_PRO_MODELS = 5

export const FREE_MODELS_IDS = [
  "deepseek-r1",
  "pixtral-large-latest",
  "mistral-large-latest",
  "gpt-4.1-nano",
]

export const MODEL_DEFAULT = "gpt-4.1-nano"

export const APP_NAME = "Piper"
export const APP_DOMAIN = "https://piper.chat"
export const APP_DESCRIPTION =
  "Piper is a free, open-source AI chat app with multi-model support, powered by MCP."

export const SUGGESTIONS = [

  {
    label: "Plex",
    highlight: "Plex:",
    prompt: "Plex:",
    items: [
      "Plex: List all libraries",
      "Plex: Search for 'The Matrix' in movies",
      "Plex: Play 'The Dark Knight' on Living Room TV",
      "Plex: Show server info",
    ],
    icon: FilmStrip,
  },
  {
    label: "Overseerr",
    highlight: "Overseerr:",
    prompt: "Overseerr:",
    items: [
      "Overseerr: Search for 'Dune Part Two' movie",
      "Overseerr: Request movie with TMDB ID 12345",
      "Overseerr: Show failed requests",
      "Overseerr: Get details for movie TMDB ID 787699",
    ],
    icon: Ticket,
  },
  {
    label: "SABnzbd",
    highlight: "SABnzbd:",
    prompt: "SABnzbd:",
    items: [
      "SABnzbd: Show server stats",
      "SABnzbd: View current download queue",
      "SABnzbd: Pause downloads",
      "SABnzbd: Add NZB from http://example.com/file.nzb",
    ],
    icon: DownloadSimple,
  },
  {
    label: "qBittorrent",
    highlight: "qBit:",
    prompt: "qBit:",
    items: [
      "qBit: List all downloading torrents",
      "qBit: Add torrent from magnet:?xt=urn:btih:...",
      "qBit: Pause torrent with hash abcdef12345",
      "qBit: Show transfer info",
    ],
    icon: Magnet,
  },
  {
    label: "Tautulli",
    highlight: "Tautulli:",
    prompt: "Tautulli:",
    items: [
      "Tautulli: What's currently playing?",
      "Tautulli: Show home stats for the last 7 days",
      "Tautulli: List all users",
      "Tautulli: Get watch history for user ID 123",
    ],
    icon: ChartLineUp,
  },
  {
    label: "Prowlarr",
    highlight: "Prowlarr:",
    prompt: "Prowlarr:",
    items: [
      "Prowlarr: List all indexers",
      "Prowlarr: Search for 'Ubuntu ISO' in categories 5000,5070",
      "Prowlarr: Test indexer ID 5",
      "Prowlarr: Show system status",
    ],
    icon: Detective,
  },
  {
    label: "Portainer",
    highlight: "Portainer:",
    prompt: "Portainer:",
    items: [
      "Portainer: List all endpoints",
      "Portainer: List Docker containers in endpoint 1",
      "Portainer: Get logs for container 'my-app' in endpoint 1",
      "Portainer: List all stacks",
    ],
    icon: Cube,
  },
  {
    label: "Unifi",
    highlight: "Unifi:",
    prompt: "Unifi:",
    items: [
      "Unifi: List all hosts",
      "Unifi: List all sites",
      "Unifi: List all devices",
      "Unifi: Show ISP metrics",
    ],
    icon: WifiHigh,
  },
  {
    label: "Unraid",
    highlight: "Unraid:",
    prompt: "Unraid:",
    items: [
      "Unraid: Show system info",
      "Unraid: Get array status",
      "Unraid: List Docker containers",
      "Unraid: Get details for VM 'Windows11'",
    ],
    icon: HardDrives,
  },
  {
    label: "Gotify",
    highlight: "Gotify:",
    prompt: "Gotify:",
    items: [
      "Gotify: Send message 'Test notification' with title 'Test' using app token XXXXX",
      "Gotify: Get recent messages",
      "Gotify: List applications",
      "Gotify: Check server health",
    ],
    icon: Bell
  }
]

export const SYSTEM_PROMPT_DEFAULT = `You are Piper, a thoughtful and clear assistant. Your tone is calm, minimal, and human. You write with intention—never too much, never too little. You avoid clichés, speak simply, and offer helpful, grounded answers. When needed, you ask good questions. You don’t try to impress—you aim to clarify. You may use metaphors if they bring clarity, but you stay sharp and sincere. You're here to help the user think clearly and move forward, not to overwhelm or overperform.`

export const MESSAGE_MAX_LENGTH = 4000

export const CURATED_AGENTS_SLUGS = [
  "github/ibelick/prompt-kit",
  "github/jmagar/piper",
  "github/shadcn/ui",
  "tweet-vibe-checker",
  "blog-draft",
]
