FROM node:20-alpine AS builder

# Create and enter the application directory.
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

# Generate the /dist static files.
RUN npm run build


# Stage 2: Serve the files using NGINX. The earlier Node.js environment is not included in this final stage.
FROM nginx:1.25-alpine

# Reference the previous stage to copy the dist folder.
COPY --from=builder /app/dist /etc/nginx/sites-available/dist/

# Copy the NGINX configuration into a directory that is included by nginx.conf as mentioned earlier.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# We need to listen on both HTTP and HTTPS ports.
EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g","daemon off;"]