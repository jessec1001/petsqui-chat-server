# Chat Demo

Steps to run this project:

**Using composer**:

1. run `npm i` command.
2. run `npm run build`.
3. run `docker-compose up` command.
4. comment out the volumes in `docker-compose.yml` if you're facing any issues.

**Local server**:
1. copy `.env.dist` to `.env` and change the values to the correct values.
2. run `npm run build`.
3. run `npm start`.

**Nodemon debugging**:
1. copy `.env.dist` to `.env` and change the values to the correct values.
2. Update the following values in `.env`:
   ```
   TYPEORM_ENTITIES=src/entity/**/*.ts
   TYPEORM_MIGRATIONS=src/migration/**/*.ts
   TYPEORM_SUBSCRIBERS=src/subscriber/**/*.ts
   ```
3. run `npm run local-debug`.

P.S. Visual Studio Code debugger is configured to use these tasks.