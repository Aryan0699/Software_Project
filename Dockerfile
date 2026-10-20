FROM node:20-bookworm-slim AS builder

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*


COPY package*.json ./

RUN npm ci --only=production

COPY prisma/ ./prisma/
COPY prisma.config.ts ./

RUN DATABASE_URL="postgresql://generate:generate@localhost:5432/generate" \
    npm run prisma:generate

COPY src ./src
COPY seed ./seed
COPY scripts ./scripts
COPY data/approvedUsers.js ./data/approvedUsers.js

USER node

EXPOSE 3000

CMD ["npm","start"]
