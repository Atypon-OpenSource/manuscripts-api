FROM node:iron-bullseye-slim AS node

FROM node AS build
WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --non-interactive --frozen-lock-file

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./build ./build
COPY ./types ./types
COPY ./doc ./doc
COPY ./data ./data

COPY tsconfig.json tsconfig.build.json ./

RUN yarn build

RUN yarn install --production

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
