FROM node:10.13.0-alpine

ENV NODE_ENV production
ENV PORT 7770

WORKDIR /github-data-link

COPY package.json yarn.lock ./

RUN yarn install

COPY . .

EXPOSE 7770

CMD [ "npm", "start" ]