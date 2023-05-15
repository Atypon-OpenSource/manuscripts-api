FROM node:18-bullseye-slim AS node

FROM node AS build
WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --non-interactive --frozen-lock-file

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./emails ./emails
COPY ./build ./build
COPY ./types ./types

COPY tsconfig.json tsconfig.build.json ./

RUN yarn build

RUN yarn install --production

FROM node
WORKDIR /app

COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
