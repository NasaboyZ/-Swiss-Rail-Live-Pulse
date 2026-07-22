FROM node:20-alpine

WORKDIR /app

# Copy manifests first so Docker layer-caches the install step
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run as a non-root user (security best practice)
RUN addgroup -S rail && adduser -S rail -G rail
USER rail

EXPOSE 3001

CMD ["node", "src/app.js"]
