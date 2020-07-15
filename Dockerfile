FROM node:current-alpine

RUN apk add --no-cache --virtual .gyp \
        python \
        make \
        g++

WORKDIR /server

COPY . /server
RUN npm install
RUN npm run build

EXPOSE 3000
CMD [ "npm", "run", "start" ]