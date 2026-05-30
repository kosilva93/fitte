FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install
COPY apps/api/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
