FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npm run prisma -- generate

COPY tsconfig.json ./tsconfig.json
COPY src ./src

RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
