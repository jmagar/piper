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
      "Plex: get_libraries",
      "Plex: search_library query=\'The Matrix\' library_name=\'Movies\'",
      "Plex: play_media item_title=\'The Dark Knight\' client_name=\'Living Room TV\'",
      "Plex: get_server_info",
      "Plex: list_clients",
      "Plex: get_active_sessions",
      "Plex: control_playback client_name=\'Living Room TV\' action=\'pause\'",
      "Plex: get_recently_added library_name=\'TV Shows\' limit=5",
      "Plex: get_library_size library_name=\'Movies\'",
      "Plex: list_all_library_titles library_name=\'Music\'",
      "Plex: get_library_episodes_count library_name=\'TV Shows\'",
      "Plex: get_music_library_stats library_name=\'Music\'",
      "Plex: media_stats"
    ],
    icon: FilmStrip,
  },
  {
    label: "Overseerr",
    highlight: "Overseerr:",
    prompt: "Overseerr:",
    items: [
      "Overseerr: search_media query=\'Dune Part Two\' media_type=\'movie\'",
      "Overseerr: get_movie_details tmdb_id=787699",
      "Overseerr: get_tv_show_details tmdb_id=1396",
      "Overseerr: request_movie tmdb_id=787699",
      "Overseerr: request_tv_show tmdb_id=1396 seasons=[1,2]",
      "Overseerr: list_failed_requests count=5 skip=0"
    ],
    icon: Ticket,
  },
  {
    label: "SABnzbd",
    highlight: "SABnzbd:",
    prompt: "SABnzbd:",
    items: [
      "SABnzbd: get_server_stats",
      "SABnzbd: get_sab_queue start=0 limit=10 category=\'movies\'",
      "SABnzbd: get_sab_history start=0 limit=5",
      "SABnzbd: pause_sab_queue",
      "SABnzbd: resume_sab_queue",
      "SABnzbd: toggle_pause_sabnzbd",
      "SABnzbd: add_nzb_url nzb_url=\'http://example.com/file.nzb\' category=\'tv\'",
      "SABnzbd: set_sab_speedlimit percentage=50"
    ],
    icon: DownloadSimple,
  },
  {
    label: "qBittorrent",
    highlight: "qBit:",
    prompt: "qBit:",
    items: [
      "qBit: list_torrents filter=\'downloading\' category=\'movies\' tag=\'hd\'",
      "qBit: add_torrent_url torrent_url=\'magnet:?xt=urn:btih:...\' save_path=\'/downloads/movies\' category=\'movies\' tags=[\'hd\',\'action\'] is_paused=false upload_limit_kib=1000 download_limit_kib=5000",
      "qBit: pause_torrent torrent_hash=\'abcdef12345\'",
      "qBit: resume_torrent torrent_hash=\'abcdef12345\'",
      "qBit: get_qb_transfer_info",
      "qBit: get_qb_app_preferences"
    ],
    icon: Magnet,
  },
  {
    label: "Tautulli",
    highlight: "Tautulli:",
    prompt: "Tautulli:",
    items: [
      "Tautulli: get_tautulli_activity",
      "Tautulli: get_tautulli_home_stats time_range=7 stats_count=5",
      "Tautulli: get_tautulli_history user_id=123 section_id=1 length=10",
      "Tautulli: get_tautulli_users"
    ],
    icon: ChartLineUp,
  },
  {
    label: "Prowlarr",
    highlight: "Prowlarr:",
    prompt: "Prowlarr:",
    items: [
      "Prowlarr: list_indexers",
      "Prowlarr: get_indexer_details id=5",
      "Prowlarr: search_releases query=\'Ubuntu ISO\' indexerIds=[1,2] categories=[5000,5070] type=\'movie\' limit=10 offset=0",
      "Prowlarr: test_indexer id=5",
      "Prowlarr: update_indexer id=5 indexer_config={\'enableRss\':true}",
      "Prowlarr: list_applications",
      "Prowlarr: get_system_status",
      "Prowlarr: get_indexer_categories",
      "Prowlarr: get_history page=1 pageSize=10 sortKey=\'date\' sortDirection=\'desc\' eventType=[1] successful=true downloadId=\'xyz\' indexerIds=[1]",
      "Prowlarr: test_all_indexers"
    ],
    icon: Detective,
  },
  {
    label: "Portainer",
    highlight: "Portainer:",
    prompt: "Portainer:",
    items: [
      "Portainer: list_endpoints search=\'local\' group_ids=[1] tag_ids=[2] types=[1,2]",
      "Portainer: get_endpoint_details endpoint_id=1",
      "Portainer: list_docker_containers endpoint_id=1 all_containers=true filters={\'name\':[\'my-container\']}",
      "Portainer: inspect_docker_container endpoint_id=1 container_id=\'my-app\'",
      "Portainer: manage_docker_container endpoint_id=1 container_id=\'my-app\' action=\'stop\'",
      "Portainer: get_docker_container_logs endpoint_id=1 container_id=\'my-app\' timestamps=true tail=\'50\' since=\'1h\'",
      "Portainer: list_stacks filters={\'SwarmID\':\'abc...\',\'EndpointID\':1}",
      "Portainer: inspect_stack stack_id=10",
      "Portainer: get_stack_file stack_id=10"
    ],
    icon: Cube,
  },
  {
    label: "Unifi",
    highlight: "Unifi:",
    prompt: "Unifi:",
    items: [
      "Unifi: list_hosts",
      "Unifi: get_host_by_id host_id=\'xxxxxxxxxxxxxxxxxxxxxxxx\'",
      "Unifi: list_sites",
      "Unifi: list_devices host_ids=[\'xxxxxxxxxxxxxxxxxxxxxxxx\']",
      "Unifi: get_isp_metrics",
      "Unifi: query_isp_metrics site_queries=[{\'site_id\':\'site_uuid\',\'metrics\':[\'latency\'],\'interval\':\'5m\'}]",
      "Unifi: list_sdwan_configs",
      "Unifi: get_sdwan_config_by_id config_id=\'sdwan_config_uuid\'",
      "Unifi: get_sdwan_config_status config_id=\'sdwan_config_uuid\'"
    ],
    icon: WifiHigh,
  },
  {
    label: "Unraid",
    highlight: "Unraid:",
    prompt: "Unraid:",
    items: [
      "Unraid: get_system_info",
      "Unraid: get_array_status",
      "Unraid: list_docker_containers skip_cache=true",
      "Unraid: manage_docker_container container_id=\'my-container\' action=\'start\'",
      "Unraid: get_docker_container_details container_identifier=\'my-container\'",
      "Unraid: list_vms",
      "Unraid: manage_vm vm_id=\'vm-uuid\' action=\'stop\'",
      "Unraid: get_vm_details vm_identifier=\'Windows11\'",
      "Unraid: get_shares_info",
      "Unraid: get_notifications_overview",
      "Unraid: list_notifications type=\'error\' offset=0 limit=10 importance=\'high\'",
      "Unraid: list_available_log_files",
      "Unraid: get_logs log_file_path=\'syslog\' tail_lines=50",
      "Unraid: list_physical_disks",
      "Unraid: get_disk_details disk_id=\'sda\'",
      "Unraid: get_unraid_variables",
      "Unraid: get_network_config",
      "Unraid: get_registration_info",
      "Unraid: get_connect_settings"
    ],
    icon: HardDrives,
  },
  {
    label: "Gotify",
    highlight: "Gotify:",
    prompt: "Gotify:",
    items: [
      "Gotify: create_message app_token=\'AppTokenForSending\' message=\'Test notification\' title=\'Test\' priority=5 extras={\'custom\':\'data\'}",
      "Gotify: get_messages limit=10 since=1234567890",
      "Gotify: delete_message message_id=100",
      "Gotify: delete_all_messages",
      "Gotify: create_application name=\'My New App\' description=\'Sends important alerts\' default_priority=8",
      "Gotify: get_applications",
      "Gotify: update_application app_id=5 name=\'My Updated App\' description=\'Better description\' default_priority=7",
      "Gotify: delete_application app_id=5",
      "Gotify: create_client name=\'My Phone Client\'",
      "Gotify: get_clients",
      "Gotify: get_health",
      "Gotify: get_version"
    ],
    icon: Bell
  }
]

export const SYSTEM_PROMPT_DEFAULT = `You are Piper, a thoughtful and clear assistant. Your tone is calm, minimal, and human. You write with intention—never too much, never too little. You avoid clichés, speak simply, and offer helpful, grounded answers. When needed, you ask good questions. You don\\'t try to impress—you aim to clarify. You may use metaphors if they bring clarity, but you stay sharp and sincere. You're here to help the user think clearly and move forward, not to overwhelm or overperform.You have access to a variety of specialized tools and MCP servers to assist the user. These include capabilities for:\\n*   Fetching web content (\\\`fetch\\\`)\\n*   Interacting with Prisma databases (\\\`Prisma\\\`)\\n*   Managing Docker containers (\\\`mcp-server-docker\\\`, \\\`mcp-portainer\\\`, \\\`mcp-unraid\\\` for Docker/VMs)\\n*   Generating Mermaid diagrams (\\\`mcp-mermaid\\\`) and charts (\\\`mcp-server-chart\\\`)\\n*   Executing shell commands (such as \\\`ls\\\`, \\\`cat\\\`, \\\`pwd\\\`, \\\`grep\\\`, \\\`wc\\\`, \\\`touch\\\`, \\\`find\\\` via \\\`shell\\\`)\\n*   Crawling web pages and repositories, and performing RAG queries on crawled content (\\\`crawl4mcp\\\`)\\n*   Web searching (\\\`searxng\\\`)\\n*   Interacting with GitHub repositories (indexing and querying via \\\`github-chat\\\`)\\n*   Filesystem operations (reading, writing, listing, searching files/directories in allowed paths like /code, /docs, /data, /compose, /downloads via \\\`filesystem\\\`)\\n*   Structured thought processes and planning (\\\`sequential-thinking\\\`)\\n*   Code repository analysis (\\\`repomix\\\`)\\n*   YouTube video summarization and querying (\\\`youtube-vision\\\`)\\n*   Generating deep directory tree structures (\\\`deep-directory-tree\\\`)\\n*   Accessing contextual documentation (\\\`context7\\\`)\\n*   Managing Unraid servers (system info, array status, Docker/VMs, shares, logs via \\\`mcp-unraid\\\`)\\n*   Managing Gotify notifications (sending/receiving messages, managing apps/clients via \\\`mcp-gotify\\\`)\\n*   Interacting with Prowlarr (managing indexers, searching releases via \\\`mcp-prowlarr\\\`)\\n*   Managing Plex media (libraries, search, playback, server info via \\\`mcp-plex\\\`)\\n*   Managing qBittorrent (listing/adding/pausing torrents, transfer info via \\\`mcp-qbittorrent\\\`)\\n*   Interacting with Overseerr (searching/requesting media, listing requests via \\\`mcp-overseerr\\\`)\\n*   Getting Tautulli stats (Plex activity, history, users via \\\`mcp-tautulli\\\`)\\n*   Managing SABnzbd downloads (queue, history, pause/resume, add NZB, speed limits via \\\`mcp-sabnzbd\\\`)\\n*   Interacting with Unifi network devices (hosts, sites, devices, ISP metrics via \\\`mcp-unifi\\\`)\\n\\nWhen a user\\'s request can be addressed by one of these, clearly state which tool or capability you are using and why. Be mindful of the specific commands or functionalities each tool offers.`

export const MESSAGE_MAX_LENGTH = 20000

export const CURATED_AGENTS_SLUGS = [
  "github/ibelick/prompt-kit",
  "github/jmagar/piper",
  "github/shadcn/ui",
  "tweet-vibe-checker",
  "blog-draft",
]
