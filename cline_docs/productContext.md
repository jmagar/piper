# Product Context: Piper Chat Application

## Overview

Piper is a web-based chat application designed to facilitate interactions with various AI models. It allows users to create and manage chat sessions, select different AI models for conversation, and persists chat history. The application is intended for local development and potentially self-hosted deployment, utilizing Docker for containerization.

## Problems Solved

- Provides a user interface for engaging with multiple AI models within a single application.
- Manages and stores chat history for users.
- Aims to provide a stable and configurable environment for AI chat interactions.

## How It Should Work (User Perspective)

- Users access Piper through a web browser (e.g., `http://localhost:8630` in development).
- Users can create new chat sessions.
- For each chat, users can select an AI model to interact with.
- Chat messages and session details are saved to a PostgreSQL database.
- The application should handle user authentication (currently a single admin user defined in `.env`).
- API calls are made from the frontend (Next.js client-side components) to backend Next.js API routes to perform actions such as creating chats, sending messages, and fetching data.
- The backend uses Prisma ORM to communicate with the PostgreSQL database.
- Environment variables (`.env` file) are crucial for configuring database connections, API keys (though not directly used in the current debugging scope), and security settings like `CSRF_SECRET`.
- CSRF protection is implemented to secure state-changing operations, requiring a valid token to be passed with relevant requests.