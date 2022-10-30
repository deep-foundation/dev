require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');

const { generateApolloClient } = require("@deep-foundation/hasura/client");
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const { minilinks, Link } = require('@deep-foundation/deeplinks/imports/minilinks');

const apolloClient = generateApolloClient({
  path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
  ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost') ? false : true,
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzYyIn0sImlhdCI6MTY2NTk4OTg5OX0.wIZBhwdBZ8Oui69jj3jDUcPNpgmwTQVNvb_M5d7V2pE',
});

const delay = (time = 1000) => new Promise(res => setTimeout(res, time));

const f = async () => {
  const deep = new DeepClient({ apolloClient });

  console.log((await deep.select({
    down: {
      link: {
        type_id: deep.idSync('@deep-foundation/core', 'Supports')
      },
    },
  }))?.data?.find(l => l?.value?.value === 'dockerSupportsJs'))
};
f();