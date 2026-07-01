#!/bin/sh
set -eu

: "${RABBITMQ_DEFAULT_USER:?RABBITMQ_DEFAULT_USER must be set}"
: "${RABBITMQ_DEFAULT_PASS:?RABBITMQ_DEFAULT_PASS must be set}"
: "${RABBITMQ_API_USER:?RABBITMQ_API_USER must be set}"
: "${RABBITMQ_API_PASS:?RABBITMQ_API_PASS must be set}"

RABBITMQ_PASSWORD_HASH=$(rabbitmqctl hash_password "$RABBITMQ_DEFAULT_PASS" | tail -n 1)
RABBITMQ_API_PASSWORD_HASH=$(rabbitmqctl hash_password "$RABBITMQ_API_PASS" | tail -n 1)

sed \
  -e "s|\${RABBITMQ_DEFAULT_USER}|$RABBITMQ_DEFAULT_USER|g" \
  -e "s|\${RABBITMQ_PASSWORD_HASH}|$RABBITMQ_PASSWORD_HASH|g" \
  -e "s|\${RABBITMQ_API_USER}|$RABBITMQ_API_USER|g" \
  -e "s|\${RABBITMQ_API_PASSWORD_HASH}|$RABBITMQ_API_PASSWORD_HASH|g" \
  /etc/rabbitmq/definitions.json.template > /etc/rabbitmq/definitions.json

exec docker-entrypoint.sh "$@"
