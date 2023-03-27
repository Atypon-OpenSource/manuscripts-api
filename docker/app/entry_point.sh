#!/bin/bash
set -e


sleep 2
yarn migrate-prisma-deploy
node --inspect=0.0.0.0 --expose-gc dist/index
