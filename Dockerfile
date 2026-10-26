FROM node:20-bookworm-slim AS builder

# there are certain config in the code that are based on whether the code is running locally or like in production
ENV NODE_ENV=production

WORKDIR /app

# open ssl is required for the prisma client
# in a single line because otherwise what was deleted in last line woudl stay in the prev layers
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
