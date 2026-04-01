FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src/ ./src
COPY public/ ./public
COPY index.html .
COPY vite.config.ts .
COPY tsconfig*.json ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
