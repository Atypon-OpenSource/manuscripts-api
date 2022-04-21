#!/bin/bash
set -e


sleep 2
npm run migrate-prisma-deploy
npm run run
