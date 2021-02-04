FROM node:current-alpine
WORKDIR /server

COPY . /server
RUN apk add --no-cache --virtual .gyp \
        make \
        g++ \
        yarn &&\
    yarn install && \
    yarn run build && \
    apk del .gyp

EXPOSE 3000
CMD [ "yarn", "run", "start" ]