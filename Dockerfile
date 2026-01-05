FROM node:iron-bullseye-slim
WORKDIR /app

COPY package.json ./package.json
COPY dist ./dist
COPY node_modules ./node_modules
COPY doc ./doc
COPY data ./data
COPY prisma ./prisma

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
