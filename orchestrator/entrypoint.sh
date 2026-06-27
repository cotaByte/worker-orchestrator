#!/bin/sh
set -e
npx tsc
exec node dist/main.js
