FROM alpine:edge


WORKDIR /github-data-link

COPY . /github-data-link


RUN apk add -U curl git nodejs

EXPOSE 7770

ENV NODE_ENV production
ENV PORT 7770

ENTRYPOINT ["sh", "manage.sh"]

CMD ["run-server"]