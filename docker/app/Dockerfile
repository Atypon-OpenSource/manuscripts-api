FROM node:16

ENV APP_SKIP_ACCOUNT_VERIFICATION="0"

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./

RUN yarn install --non-interactive --frozen-lock-file

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

EXPOSE 3000 9229

RUN yarn attach-prisma
RUN yarn build-app
RUN ./bin/build-validator-function.js

ENTRYPOINT ["/bin/bash"]
CMD ["/usr/src/app/entry_point.sh"]
