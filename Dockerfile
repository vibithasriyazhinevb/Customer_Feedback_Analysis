FROM node:22-alpine AS frontend

WORKDIR /app/client
COPY client/vite-project/package*.json ./
RUN npm ci
COPY client/vite-project/ ./
RUN npm run build

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY server/server.js ./server/server.js
COPY server/models ./server/models
COPY --from=frontend /app/client/dist ./client/vite-project/dist

CMD ["npm", "--prefix", "server", "start"]
