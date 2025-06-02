import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Piper - AI Assistant',
    short_name: 'Piper',
    description: 'Your intelligent AI assistant for productivity, automation, and seamless conversations',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['productivity', 'utilities', 'business', 'artificial intelligence'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'New Chat',
        short_name: 'New Chat',
        description: 'Start a new conversation with Piper',
        url: '/c/new',
        icons: [
          {
            src: '/icons/shortcut-new-chat.png',
            sizes: '96x96',
            type: 'image/png'
          }
        ]
      },
      {
        name: 'Chat History',
        short_name: 'History',
        description: 'View your conversation history',
        url: '/dashboard',
        icons: [
          {
            src: '/icons/shortcut-history.png',
            sizes: '96x96',
            type: 'image/png'
          }
        ]
      },
      {
        name: 'Agent Manager',
        short_name: 'Agents',
        description: 'Manage your AI agents',
        url: '/dashboard/manager',
        icons: [
          {
            src: '/icons/shortcut-agents.png',
            sizes: '96x96',
            type: 'image/png'
          }
        ]
      }
    ],
    prefer_related_applications: false,
    related_applications: []
  }
} 