FROM node:iron-bullseye-slim AS node

FROM node AS build
WORKDIR /usr/src/app

ARG NODE_AUTH_TOKEN
ENV NODE_AUTH_TOKEN=$NODE_AUTH_TOKEN

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN if [ -n "$NODE_AUTH_TOKEN" ]; then \
      echo "registry=https://us-west4-npm.pkg.dev/atypon-artifact/lwf-virtual-npm-repo" > .npmrc && \
      echo "//us-west4-npm.pkg.dev/atypon-artifact/lwf-virtual-npm-repo:_authToken=\"${NODE_AUTH_TOKEN}\"" >> .npmrc; \
    fi

RUN pnpm install

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./build ./build
COPY ./types ./types
COPY ./doc ./doc
COPY ./data ./data

COPY tsconfig.json ./

RUN pnpm build

RUN pnpm install --production

FROM node
WORKDIR /app

COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/doc ./doc
COPY --from=build /usr/src/app/data ./data
COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
