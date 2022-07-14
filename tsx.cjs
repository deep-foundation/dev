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
});

const unloginedDeep = new DeepClient({ apolloClient });

const delay = (time = 1000) => new Promise(res => setTimeout(res, time));

const f = async () => {
  const guest = await unloginedDeep.guest();
  const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
  const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
  const deep = new DeepClient({ deep: guestDeep, ...admin });

  const { data: [{ id: packageId }] } = await deep.insert({
    type_id: await deep.id('@deep-foundation/core', 'Package'),
    string: { data: { value: '@deep-foundation/tsx' } },
    in: { data: {
      type_id: await deep.id('@deep-foundation/core', 'Contain'),
      from_id: await guestDeep.id('deep', 'admin'),
      string: { data: { value: 'tsx' } },
    } },
    out: { data: {
      type_id: await deep.id('@deep-foundation/core', 'Join'),
      to_id: await guestDeep.id('deep', 'admin'),
      string: { data: { value: 'tsx' } },
    } },
  });

  const { data: [{ id: handlerId }] } = await deep.insert([
    {
      type_id: await deep.id('@deep-foundation/core', 'Handler'),
      from_id: await deep.id('@deep-foundation/core', 'dockerSupportsJs'),
      in: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Contain'),
        from_id: packageId,
        string: { data: { value: 'handler' } },
      } },
      to: { data: {
        type_id: await deep.id('@deep-foundation/core', 'SyncTextFile'),
        in: { data: {
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          from_id: packageId,
          string: { data: { value: 'syncTextFile' } },
        } },
        string: { data: {
          value: /*javascript*/`
async ({ deep, require, gql, data: { newLink } }) => {
  const { data: [generatedFrom] } = await deep.select({
    type_id: await deep.id('@deep-foundation/core', 'GeneratedFrom'),
    to_id: newLink.id,
  });
  if (!generatedFrom) {
    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'GeneratedFrom'),
      to_id: newLink.id,
      from: { data: {
        type_id: await deep.id('@deep-foundation/core', 'SyncTextFile'),
        string: { data: { value: newLink?.value?.value || '' } },
      } },
    });
  } else {
    await deep.update({
      link_id: { _eq: generatedFrom.from_id },
    }, {
      value: newLink?.value?.value,
    }, { table: 'strings' });
  }
}
          `,
        } },
      } },
    },
  ]);

  await deep.insert([
    {
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      string: { data: { value: 'TSX' } },
      in: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Contain'),
        from_id: packageId,
        string: { data: { value: 'TSX' } },
      } },
      out: { data: [
        {
          type_id: await deep.id('@deep-foundation/core', 'Value'),
          to_id: await deep.id('@deep-foundation/core', 'String'),
        },
        {
          type_id: await deep.id('@deep-foundation/core', 'HandleInsert'),
          in: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            from_id: packageId,
            string: { data: { value: 'handleInsert' } },
          } },
          to_id: handlerId
        },
        {
          type_id: await deep.id('@deep-foundation/core', 'HandleUpdate'),
          in: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            from_id: packageId,
            string: { data: { value: 'HandleUpdate' } },
          } },
          to_id: handlerId
        },
      ] },
    },
  ]);
};
f();