FROM node:12

ENV APP_INITIALIZE="0"
ENV APP_RUN_AFTER_INITIALIZE="0"
ENV APP_SKIP_ACCOUNT_VERIFICATION="0"
ENV APP_START_FUNCTION_SERVICE="1"

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY ./src ./src
COPY ./prisma ./prisma
COPY ./bin ./bin
COPY ./emails ./emails
COPY ./build ./build
COPY ./types ./types
COPY ./.env.example ./.env.example
COPY ./docker/app/entry_point.sh ./entry_point.sh

COPY tsconfig.json tsconfig.build.json ./

RUN ./bin/build-env.js .env.example > .env

EXPOSE 3000

RUN npm run attach-prisma
RUN npm run build-app

ENTRYPOINT ["/bin/bash"]
CMD ["/usr/src/app/entry_point.sh"]
