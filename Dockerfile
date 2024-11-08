# Build stage
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Runtime stage
FROM node:18-slim AS runner

# Install Azure CLI and dependencies (if still needed in runtime)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/* \
    && curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
    && az extension add --name containerapp --upgrade --allow-preview true

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001
ENV PORT=3001

CMD ["npm", "start"] 