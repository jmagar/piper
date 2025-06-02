# Use official Node.js image
FROM node:22-alpine AS base

ARG REDIS_URL

WORKDIR /app

# Install Python and system dependencies for both Node.js and Python MCP servers
RUN apk add --no-cache python3 py3-pip curl

# Install uv (includes uvx) using official installer to global location
ENV UV_INSTALL_DIR="/usr/local"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Move uv binaries to proper bin directory
RUN mv /usr/local/uv /usr/local/bin/uv && \
    mv /usr/local/uvx /usr/local/bin/uvx

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy all files
COPY . .


# Generate Prisma client
RUN npx prisma generate

# Copy config.json if it exists in the build context, for build-time access
COPY config/config.json /config/config.json

# Make REDIS_URL available during build
ENV REDIS_URL=${REDIS_URL}

# Build the app (if needed)
RUN npm run build

# Set environment variables (can be overridden)
ENV NODE_ENV=production
ENV UPLOADS_DIR=/uploads
ENV CONFIG_DIR=/config
# Add uv/uvx to PATH for the node user
ENV PATH="/usr/local/bin:$PATH"

# Create uploads, config, and logs directories
RUN mkdir -p /uploads /config /logs && chown -R node:node /uploads /config /logs

# Use non-root user for safety
USER node

# Expose app port
EXPOSE 3000

# Start app
CMD ["npm", "start"]