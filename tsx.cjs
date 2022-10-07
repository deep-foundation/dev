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

  await deep.insert({
    type_id: deep.idSync('@deep-foundation/core', 'PackageQuery'),
    string: { data: { value: `https://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@gist.github.com/ivansglazunov/450e028fccc4dbcb2ae0cdde37dad1d0` } },
    in: { data: [
      {
        type_id: deep.idSync('@deep-foundation/core', 'PackageInstall'),
        from_id: deep.linkId,
        in: { data: [
          {
            type_id: deep.idSync('@deep-foundation/core', 'Contain'),
            from_id: deep.linkId,
            string: { data: { value: 'tsxPackageInstall' } },
          },
        ] },
      },
      {
        type_id: deep.idSync('@deep-foundation/core', 'Contain'),
        from_id: deep.linkId,
        string: { data: { value: 'tsxPackage' } },
      },
    ] },
  });
  await delay(1000);
  await deep.insert({
    type_id: deep.idSync('@deep-foundation/core', 'Join'),
    from_id: await deep.id('@deep-foundation/tsx'),
    to_id: await deep.id('deep', 'admin'),
  });
};
f();