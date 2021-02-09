FROM node:current-alpine

RUN apk add --no-cache --virtual .gyp \
        yarn

WORKDIR /server

COPY . /server
RUN yarn install
RUN yarn run build

EXPOSE 3000
CMD [ "yarn", "run", "start" ]