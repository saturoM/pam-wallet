FROM node:22-bookworm-slim
WORKDIR /app
COPY api/package.json api/package-lock.json api/
COPY web/package.json web/package-lock.json web/
RUN npm ci --prefix api && npm ci --prefix web
COPY api api
COPY web web
RUN npm run build --prefix web
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start", "--prefix", "api"]
