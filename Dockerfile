# Backend Dockerfile
# Node is already installed in the base image, so less manual configuration is needed.

FROM node:20-bookworm-slim AS builder

ENV NODE_ENV=production

WORKDIR /app

# This is the error you may get if OpenSSL is not installed, since Prisma requires it.
# prisma:warn Prisma failed to detect the libssl/openssl version to use, and may not work as expected. Defaulting to "openssl-1.1.x".

# Please manually install OpenSSL via `apt-get update -y && apt-get install -y openssl` and try installing Prisma again. If you're running Prisma on Docker, add this command to your Dockerfile, or switch to an image that already has OpenSSL installed.

# Layering: combine commands and clean up the package lists in the same layer.
# As seen at end we delete teh directory if they were seperate RUN commands the deleted stuff would still persist in the update and install commands layer . Here for all three you create a single final layer with those files deleted.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first for build caching.
# Later we already do copy all the stuff then why we did package.json earlier ??
# Docker invalidates the cache write from the layer at which something is changed
# So if we copy all files first and later do this then if we change anything in lets say src/app.js then the corresponding layer cache is invalidated and hence you would again install the dependencies but did you actually needed to do thta dependencies haven't changes
# So placement of commands becomes quite important for cacheing
# Thumb Rule - Those commands which dont change often keep it on TOP
COPY package*.json ./

# Question: Why do we install only production dependencies here but not in the frontend? Find out yourself.
RUN npm ci --only=production
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

# The schema requires a URL field, but this is not an actual database connection.
# Prisma requires a database URL when generating the client, so we provide a dummy URL as a placeholder. An actual database connection is not required for this step.
RUN DATABASE_URL="postgresql://generate:generate@localhost:5432/generate" \
    npm run prisma:generate

# Copy source later so source changes do not invalidate earlier dependency layers.
COPY src ./src
COPY seed ./seed
COPY scripts ./scripts
COPY data/approvedUsers.js ./data/approvedUsers.js

EXPOSE 3000

# Why do we use npm start here, while locally we use npm run dev? Why would npm run dev not work here?
CMD ["npm","start"]