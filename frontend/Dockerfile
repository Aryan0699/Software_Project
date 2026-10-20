# Build Stage - Intially use heavy nodejs to build and get the static file and later serve them using a lightweight nginx image.
# Builder is just an Alias for this stage , Alpine means lightweight image of linux with nodejs installed.
FROM node:20-alpine AS builder 

# Create and move into app folder inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
RUN npm ci

# Copy rest of the files excpet those mentioned in .dockerignore
COPY . .

ARG VITE_API_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# To get the /dist static files to serve
RUN npm run build


FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

EXPOSE 80
EXPOSE 443
EXPOSE 443/udp
