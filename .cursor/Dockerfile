# Use Node.js LTS as base image
FROM node:20-ubuntu

# Set timezone and locale
ENV TZ=UTC
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    python3 \
    python3-pip \
    postgresql-client \
    redis-tools \
    jq \
    vim \
    nano \
    tree \
    htop \
    unzip \
    zip \
    openssh-client \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages commonly used in development
RUN npm install -g \
    typescript \
    @types/node \
    prisma \
    eslint \
    prettier \
    nodemon \
    ts-node \
    @next/codemod \
    turbo \
    pnpm

# Create a non-root user with proper shell setup
RUN useradd -m -s /bin/bash ubuntu && \
    echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Set user and working directory (good practice for background agents)
USER ubuntu
WORKDIR /home/ubuntu

# Set environment variables
ENV NODE_ENV=development
ENV PATH="/home/ubuntu/.local/bin:$PATH"
ENV SHELL=/bin/bash

# Configure git (placeholder values - agents can override)
RUN git config --global init.defaultBranch main && \
    git config --global pull.rebase false && \
    git config --global user.name "Background Agent" && \
    git config --global user.email "agent@cursor.sh"

# Set up shell environment for better development experience
RUN echo 'export PS1="\[\033[36m\]\u@\h\[\033[m\]:\[\033[33;1m\]\w\[\033m\]\$ "' >> ~/.bashrc && \
    echo 'alias ll="ls -alF"' >> ~/.bashrc && \
    echo 'alias la="ls -A"' >> ~/.bashrc && \
    echo 'alias l="ls -CF"' >> ~/.bashrc && \
    echo 'alias npm-check="npm outdated"' >> ~/.bashrc && \
    echo 'alias logs="tail -f logs/*.log"' >> ~/.bashrc

# Create common directories that might be useful
RUN mkdir -p ~/.ssh ~/.local/bin ~/.npm ~/.cache/pnpm

# Set proper permissions and optimize cache directories
RUN chmod 700 ~/.ssh && \
    chown -R ubuntu:ubuntu ~/.npm ~/.cache

# Configure npm and pnpm for better caching
RUN npm config set cache ~/.npm && \
    echo 'store-dir=~/.cache/pnpm' > ~/.npmrc

# Expose common development ports (Next.js, API, databases)
EXPOSE 3000 3001 5432 6379

# Create volume mount points for common development needs
VOLUME ["/home/ubuntu/workspace", "/home/ubuntu/.ssh", "/home/ubuntu/.cache"]

# Health check to ensure Node.js is working
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version && npm --version || exit 1

# Note: Code will be cloned by the agent, so we don't COPY any source code here
