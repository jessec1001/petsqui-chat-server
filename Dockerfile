FROM node:current-alpine
WORKDIR /server
ARG version2
COPY src src
COPY package.json package.json
COPY public public
COPY tsconfig.json /server
COPY yarn.lock /server
COPY patches /server/patches
RUN apk add --no-cache --virtual .gyp \
        python3 \
        make \
        g++ \
        && apk add yarn \
        && yarn install \
        && yarn run build \
        && apk del .gyp

EXPOSE 3000
CMD [ "yarn", "run", "start" ]
