# Chat API Documentation

## Base URL
```
http://localhost:4100
```

## Authentication
Currently, authentication is handled through user IDs passed in requests. A proper authentication system should be implemented for production use.

## Endpoints

### Send Message
Send a message to the chat system.

```http
POST /chat
```

#### Request Body
```json
{
    "message": "string",
    "conversationId": "string (optional)",
    "userId": "string (optional)"
}
```

#### Response
```text
Plain text response from the assistant
```

### Star Message
Mark a message as starred/favorited.

```http
POST /chat/star
```

#### Request Body
```json
{
    "messageId": "string",
    "userId": "string",
    "note": "string (optional)"
}
```

#### Response
```json
{
    "success": true
}
```

### Unstar Message
Remove a message from starred/favorites.

```http
POST /chat/unstar
```

#### Request Body
```json
{
    "messageId": "string",
    "userId": "string"
}
```

#### Response
```json
{
    "success": true
}
```

### Get Starred Messages
Retrieve all starred messages for a user.

```http
GET /chat/starred/:userId
```

#### Response
```json
[
    {
        "id": "string",
        "message_id": "string",
        "user_id": "string",
        "note": "string",
        "created_at": "datetime",
        "message": {
            "id": "string",
            "content": "string",
            "role": "user | assistant",
            "created_at": "datetime",
            // ... other message fields
        }
    }
]
```

### Archive Conversation
Move a conversation to archives.

```http
POST /chat/archive
```

#### Request Body
```json
{
    "conversationId": "string"
}
```

#### Response
```json
{
    "success": true
}
```

### Unarchive Conversation
Restore a conversation from archives.

```http
POST /chat/unarchive
```

#### Request Body
```json
{
    "conversationId": "string"
}
```

#### Response
```json
{
    "success": true
}
```

### Get Conversations
Retrieve user's conversations (active or archived).

```http
GET /chat/conversations/:userId
```

#### Query Parameters
- `type`: "active" (default) | "archived"

#### Response
```json
[
    {
        "id": "string",
        "title": "string",
        "summary": "string",
        "created_at": "datetime",
        "updated_at": "datetime",
        "last_message_at": "datetime",
        "is_archived": "boolean",
        "messages": [
            {
                "id": "string",
                "content": "string",
                "role": "user | assistant",
                "created_at": "datetime"
            }
        ],
        "stats": {
            "message_count": "number",
            "user_message_count": "number",
            "bot_message_count": "number",
            "tool_usage_count": "number",
            "average_response_time": "number"
        }
    }
]
```

### Get Statistics
Retrieve statistics for a user or conversation.

```http
GET /chat/stats
```

#### Query Parameters
One of these is required:
- `userId`: string
- `conversationId`: string

#### Response for User Stats
```json
{
    "total_conversations": "number",
    "total_messages": "number",
    "total_starred": "number",
    "average_response_length": "number",
    "last_active": "datetime"
}
```

#### Response for Conversation Stats
```json
{
    "message_count": "number",
    "user_message_count": "number",
    "bot_message_count": "number",
    "average_response_time": "number",
    "tool_usage_count": "number"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
When required parameters are missing or invalid.
```json
{
    "error": "Error message describing what's wrong"
}
```

### 500 Internal Server Error
When something goes wrong on the server.
```json
{
    "error": "Internal server error",
    "details": "Optional error details"
}
```

## Rate Limiting
Currently, no rate limiting is implemented. Consider adding rate limiting for production use.

## Websocket Events
Real-time events (typing indicators, online status) are handled through WebSocket connections at `/ws/logs`.

### Event Types
```typescript
interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'debug';
    message: string;
}
``` 