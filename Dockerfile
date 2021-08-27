FROM node:15.10.0
RUN apt update 
RUN apt install -y screen
FROM node:15.10.0-alpine3.12
COPY package.json .
COPY tsconfig.json .
COPY packages ./packages
COPY node_modules ./node_modules
EXPOSE 3001 3007
CMD [ "npm", "run", "pwd-start" ]