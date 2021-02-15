FROM node:current-alpine
WORKDIR /server

COPY src /server/src
COPY public /server/public
COPY package.json /server
COPY tsconfig.json /server
COPY yarn.lock /server
RUN apk add --no-cache --virtual .gyp \
        yarn &&\
    yarn install && \
    yarn run build && \
    apk del .gyp

EXPOSE 3000
CMD [ "yarn", "run", "start" ]