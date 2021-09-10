FROM hasura/graphql-engine:v1.3.2 as base
FROM debian:buster
WORKDIR /app
RUN apt update 
RUN apt install -y libpq5 libpq-dev screen curl git

ENV NODE_VERSION=15.11.0
RUN mkdir /var/local/.nvm
ENV NVM_DIR=/var/local/.nvm
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
RUN cp /var/local/.nvm/versions/node/v${NODE_VERSION}/bin/node /bin/node
RUN cp /var/local/.nvm/versions/node/v${NODE_VERSION}/bin/npx /bin/npx
RUN cp /var/local/.nvm/versions/node/v${NODE_VERSION}/bin/npm /bin/npm

COPY ./start.js .
COPY ./package.json .
COPY ./package-lock.json .
COPY ./tsconfig.json .
COPY ./gulpfile.ts .
COPY .gitmodules .

RUN . "$NVM_DIR/nvm.sh" && npm ci

ENV MIGRATIONS_HASURA_PATH localhost:8080
ENV MIGRATIONS_HASURA_SSL 0
ENV HASURA_GRAPHQL_ADMIN_SECRET: myadminsecretkey
ENV MIGRATIONS_HASURA_SECRET: myadminsecretkey
ENV NEXT_PUBLIC_HASURA_PATH: localhost:8080
ENV NEXT_PUBLIC_HASURA_SSL: 0

COPY --from=base /bin/graphql-engine /bin/graphql-engine
EXPOSE 8080
ENTRYPOINT ["node", "start.js"]