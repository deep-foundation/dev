FROM node:15.10.0-alpine3.12
RUN apt update 
RUN apt install -y screen
COPY package.json .
COPY tsconfig.knex.json .
COPY packages ./packages
COPY node_modules ./node_modules
EXPOSE 3001 3007
CMD [ "npm", "run", "pwd-start" ]