FROM node:22-alpine
WORKDIR /app
RUN echo "=== FITTE BUILD: FAL.AI VERSION ==="
COPY package*.json ./
RUN npm install
COPY src ./src
COPY tsconfig.json ./
RUN npm run build
RUN grep -r "fal-ai" dist/services/visualizeService.js && echo "=== FAL.AI CODE CONFIRMED ===" || (echo "=== ERROR: OLD OPENAI CODE DETECTED ===" && exit 1)
EXPOSE 3000
CMD ["node", "dist/index.js"]
