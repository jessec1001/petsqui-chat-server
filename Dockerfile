FROM node:current-alpine

WORKDIR /server

COPY . /server
RUN npm install
RUN npm run build

EXPOSE 3000
CMD [ "npm", "run", "start" ]