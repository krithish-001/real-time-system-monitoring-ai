# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html
# Add custom nginx config for single page apps if necessary, default is usually ok for simple vite build
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
