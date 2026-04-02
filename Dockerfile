FROM oven/bun:1

WORKDIR /app

# Install dependencies first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# data/ is expected to be mounted as a volume at runtime.
# Create it here so the container doesn't crash if no volume is mounted.
RUN mkdir -p /app/data

CMD ["bun", "src/index.ts"]
