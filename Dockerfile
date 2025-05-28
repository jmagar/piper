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