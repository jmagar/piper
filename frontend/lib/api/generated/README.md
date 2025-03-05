# Generated API Client

This directory contains TypeScript API clients generated from the OpenAPI schema.

## Usage

```typescript
import { ChatService, ChatMessage } from '@/lib/api/generated';

// Create a new instance of the service
const chatService = new ChatService({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Use the service
const messages = await chatService.getChatMessages();
```

## Regenerating

To regenerate the API client, run:

```bash
pnpm run generate-api
```

This will update all files in this directory based on the latest OpenAPI schema.
```
