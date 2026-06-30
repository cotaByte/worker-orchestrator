FROM rabbitmq:4-management

COPY rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY definitions.json.template /etc/rabbitmq/definitions.json.template
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 5672
EXPOSE 15672

ENTRYPOINT ["entrypoint.sh"]
CMD ["rabbitmq-server"]
