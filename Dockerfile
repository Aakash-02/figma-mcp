FROM node:20-slim

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY index.js ./

# Cloud platforms inject PORT via env; default to 3000
ENV PORT=3000

EXPOSE ${PORT}

# Start in HTTP mode for cloud deployment
CMD ["node", "index.js", "--http"]
