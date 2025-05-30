# Piper Installation Guide (Self-Hosted Admin-Only)

Piper is an AI chat app with multi-model support, refactored for self-hosting as an admin-only application. This guide covers how to install and run Piper using Docker.

## Prerequisites

-   Node.js 18.x or later (for local development or building Docker image if modified)
-   npm or yarn
-   Git
-   Docker
-   Docker Compose
-   API keys for any AI models you wish to use (OpenAI, Mistral, Anthropic, Gemini, etc.)

## Environment Setup

Piper is configured using environment variables. For Docker deployment, these are typically set in an `.env` file in the project root, which `docker-compose.yml` will use.

1.  Copy the [`.env.example`](.env.example:1) file to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `.env` file and provide the necessary values:

    ```dotenv
    # Admin Authentication (for external auth provider like Authelia)
    # These are NOT used by Piper directly for login but may be needed by your reverse proxy/auth setup.
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=changeme

    # Postgres connection (used by Piper and Prisma)
    # This matches the credentials in docker-compose.yml for the PostgreSQL service.
    DATABASE_URL=postgresql://piper:piper@postgres:5432/piper

    # Directory for file uploads (within Docker container, mapped to host ./uploads)
    UPLOADS_DIR=/uploads

    # Directory for config files (within Docker container, mapped to host ./config)
    CONFIG_DIR=/config

    # CSRF Protection (Generate a secure random string)
    CSRF_SECRET=your_csrf_secret_key_generated_below

    # --- AI Model API Keys (Add keys for models you intend to use) ---
    # OpenAI
    OPENAI_API_KEY=your_openai_api_key

    # Mistral
    MISTRAL_API_KEY=your_mistral_api_key

    # OpenRouter
    OPENROUTER_API_KEY=your_openrouter_api_key

    # Exa
    EXA_API_KEY=your_exa_api_key

    # Gemini
    GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

    # Anthropic
    ANTHROPIC_API_KEY=your_anthropic_api_key

    # Xai (if supported by your models/providers)
    # XAI_API_KEY=your_xai_api_key
    ```

### Generating a CSRF Secret

The `CSRF_SECRET` is used to protect your application. Generate a secure random string using one of the methods below and add it to your `.env` file:

#### Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Using OpenSSL
```bash
openssl rand -hex 32
```

#### Using Python
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Docker Deployment (Recommended)

The easiest and recommended way to run Piper is using Docker Compose, which will set up the Piper application and a PostgreSQL database.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/piper.git # Replace with actual repo URL
    cd piper
    ```

2.  **Prepare the `.env` file:**
    As described in the "Environment Setup" section, copy [`.env.example`](.env.example:1) to `.env` and fill in your `ADMIN_USERNAME`, `ADMIN_PASSWORD` (for your external auth provider), `CSRF_SECRET`, and any AI model API keys you plan to use.

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d
    ```
    This command will:
    -   Build the Piper application Docker image (if not already built).
    -   Start the Piper application container.
    -   Start a PostgreSQL container.
    -   Apply database migrations automatically (Prisma handles this).
    -   Create local directories (`./uploads`, `./logs`, `./config`, `./db-data`) if they don't exist, for persistent storage.

    The application will be available at `http://localhost:3000`. You should configure an external authentication provider like Authelia in front of it.

4.  **To view logs:**
    ```bash
    docker-compose logs -f app # For Piper app logs
    docker-compose logs -f postgres # For PostgreSQL logs
    ```
    Upload logs will also be written to `./logs/upload.log` on your host machine.

5.  **To stop the services:**
    ```bash
    docker-compose down
    ```

### Dockerfile

The project includes the following `Dockerfile`:

```dockerfile
# Use official Node.js image
FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy all files
COPY . .

# Build the app (if needed)
RUN npm run build

# Set environment variables (can be overridden)
ENV NODE_ENV=production
ENV UPLOADS_DIR=/uploads
ENV CONFIG_DIR=/config

# Create uploads, config, and logs directories
RUN mkdir -p /uploads /config /logs && chown -R node:node /uploads /config /logs

# Use non-root user for safety
USER node

# Expose app port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
```

### Docker Compose Configuration

The project includes the following `docker-compose.yml`:

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - DATABASE_URL=postgresql://piper:piper@postgres:5432/piper
      - UPLOADS_DIR=/uploads
      - CONFIG_DIR=/config
      - CSRF_SECRET=${CSRF_SECRET} # Ensure CSRF_SECRET is passed
      # Pass through AI API Keys from .env file
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - MISTRAL_API_KEY=${MISTRAL_API_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - EXA_API_KEY=${EXA_API_KEY}
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # Add other AI keys as needed
    volumes:
      - ./uploads:/uploads
      - ./config:/config
      - ./logs:/logs
    depends_on:
      - postgres

  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: piper
      POSTGRES_PASSWORD: piper
      POSTGRES_DB: piper
    volumes:
      - ./db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432" # Exposes DB port to host, remove if not needed
```

## Local Development (Non-Docker)

While Docker is recommended, you can run Piper locally for development:

1.  **Clone the repository and install dependencies:**
    ```bash
    git clone https://github.com/your-repo/piper.git # Replace
    cd piper
    npm install
    ```
2.  **Set up PostgreSQL:**
    Install PostgreSQL locally or use a cloud-hosted instance. Create a database (e.g., `piper_dev`) and a user.
3.  **Configure Environment Variables:**
    Create a `.env.local` file in the project root. Copy contents from [`.env.example`](.env.example:1) and update:
    -   `DATABASE_URL` to point to your local/remote PostgreSQL instance.
    -   `ADMIN_USERNAME`, `ADMIN_PASSWORD` (if your local setup involves a proxy needing them).
    -   `CSRF_SECRET`.
    -   AI API keys.
    -   `UPLOADS_DIR` can be left as default (`./uploads`) or set to a custom path.
    -   `CONFIG_DIR` can be left as default (`./config`).
4.  **Apply Database Migrations:**
    ```bash
    npx prisma migrate deploy
    ```
5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Configuration

-   **Environment Variables**: Primarily configured via an `.env` file (for Docker Compose) or `.env.local` (for local development) as described above.
-   **Application Configuration**: Some application-level settings might be found in `lib/config.ts`. (Verify path and content).

## Troubleshooting

-   **PostgreSQL Connection Issues:**
    -   Ensure your `DATABASE_URL` is correct.
    -   If using Docker, check that the `postgres` container is running (`docker-compose ps`).
    -   Verify firewall rules if connecting to a remote PostgreSQL instance.
-   **AI Models Not Responding:**
    -   Verify your API keys in the `.env` file.
    -   Ensure the models are correctly configured in the application if applicable.
-   **Docker Container Exits Immediately:**
    -   Check logs: `docker-compose logs -f app`.
    -   Ensure all required environment variables are set in your `.env` file.
    -   Verify directory permissions for mapped volumes (`uploads`, `logs`, `config`, `db-data`) if issues persist.

## License

Apache License 2.0
