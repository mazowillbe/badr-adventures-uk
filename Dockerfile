FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# Basic deps
RUN apt-get update && apt-get install -y curl ca-certificates build-essential git && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL=/root/.bun
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy project
COPY . .

# Install dependencies and build
RUN bun install
RUN NODE_ENV=production bun run build

# Expose the app port (Render will provide $PORT at runtime)
EXPOSE 54404

CMD ["sh", "-lc", "PORT=${PORT:-54404} bun run server.ts"]
