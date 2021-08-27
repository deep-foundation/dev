FROM node:15.10.0-alpine3.12
COPY package.json .
COPY tsconfig.json .
COPY packages ./packages
COPY node_modules ./node_modules
CMD [ "npm", "run", "pwd-start" ]