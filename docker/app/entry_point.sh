#!/bin/bash
set -e


sleep 2
yarn migrate-prisma-deploy
node dist/index
