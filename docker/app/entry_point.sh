#!/bin/bash
set -e


sleep 2
npm run migrate-prisma
npm run run
