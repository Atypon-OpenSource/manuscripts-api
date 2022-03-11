FROM postgres
RUN mkdir -p /var/lib/postgresql/data
RUN chmod -R 777 /var/lib/postresql/data
RUN echo 'fixed postgres data permissions'
ENTRYPOINT docker-entrypoint.sh