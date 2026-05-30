FROM node:22-alpine
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm install
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
