require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');
const dotenv = require('dotenv');
const { generateApolloClient } = require('@deep-foundation/hasura/client');
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const {
  minilinks,
  Link,
} = require('@deep-foundation/deeplinks/imports/minilinks');
const crypto = require('crypto');
const axios = require('axios');
const uniqid = require('uniqid');
const { expect } = require('chai');
const { get } = require('lodash');
const { default: links } = require('@deep-foundation/deeplinks/imports/router/links');
const { insertHandler } = require('./deep-packages/insertHandler.cjs');
const { sleep } = require('./deep-packages/sleep.cjs');
const fs = require('fs');

const PACKAGE_NAME = "@deep-foundation/logger";

console.log(`Installing ${PACKAGE_NAME} package.`);


const createdLinkIds = [];

const main = async () => {

  const installPackage = async () => {
    const apolloClient = generateApolloClient({
      path: "localhost:3006/gql" || '', // <<= HERE PATH TO UPDATE
      ssl: !!~"localhost:3006/gql".indexOf('localhost')
        ? false
        : true,
      // admin token in prealpha deep secret key
      // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
    });

    const unloginedDeep = new DeepClient({ apolloClient });
    const guest = await unloginedDeep.guest();
    const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
    const admin = await guestDeep.login({
      linkId: await guestDeep.id('deep', 'admin'),
    });
    const deep = new DeepClient({ deep: guestDeep, ...admin });

    const dockerSupportsJs = await deep.id(
      '@deep-foundation/core',
      'dockerSupportsJs'
    );
    const handlerTypeLinkId = await deep.id('@deep-foundation/core', 'Handler');
    const handleInsertTypeLinkId = await deep.id('@deep-foundation/core', 'HandleInsert');
    const handleUpdateTypeLinkId = await deep.id('@deep-foundation/core', 'HandleUpdate');
    const handleDeleteTypeLinkId = await deep.id('@deep-foundation/core', 'HandleDelete');

    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    const typeTypeLinkId = await deep.id('@deep-foundation/core', 'Type');
    const packageTypeLinkId = await deep.id('@deep-foundation/core', 'Package');
    const anyTypeLinkId = await deep.id('@deep-foundation/core', 'Any');
    const syncTextFileTypeLinkId = await deep.id('@deep-foundation/core', 'SyncTextFile');
    const joinTypeLinkId = await deep.id('@deep-foundation/core', 'Join');
    const plv8SupportsJsId = await deep.id('@deep-foundation/core', 'plv8SupportsJs');


    const { data: [{ id: packageId }] } = await deep.insert({
      type_id: packageTypeLinkId,
      string: { data: { value: PACKAGE_NAME } },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId
          },
        ]
      },
      out: {
        data: [
          {
            type_id: joinTypeLinkId,
            to_id: await deep.id('deep', 'users', 'packages'),
          },
          {
            type_id: joinTypeLinkId,
            to_id: await deep.id('deep', 'admin'),
          },
        ]
      },
    });

    console.log({ packageId });

    const {
      data: [{ id: logInsertTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogInsert' } },
        },
      },
    });
    console.log({ logInsertTypeLinkId });

    const {
      data: [{ id: logUpdateTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogUpdate' } },
        },
      },
    });
    console.log({ logUpdateTypeLinkId });

    const {
      data: [{ id: logDeleteTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogDelete' } },
        },
      },
    });
    console.log({ logDeleteTypeLinkId });

    const {
      data: [{ id: logTypeTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogType' } },
        },
      },
    });
    console.log({ logTypeTypeLinkId });

    const {
      data: [{ id: logLinkTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogLink' } },
        },
      },
    });
    console.log({ logLinkTypeLinkId: logLinkTypeLinkId });

    const {
      data: [{ id: logSubjectTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'LogSubject' } },
        },
      },
    });
    console.log({ logLinkTypeLinkId: logLinkTypeLinkId });


    const insertHandlerId = await insertHandler(
      {
        code: fs.readFileSync('./insert-handler.cjs', {encoding: 'utf-8'}),
        fileName: "insertHandlerFile",
        handlerName: "insertHandler",
        handleName: "insertHandle",
        handleOperationTypeLinkId: handleInsertTypeLinkId,
        supportsId: plv8SupportsJsId,
        triggerTypeLinkId: anyTypeLinkId ,
        containTypeLinkId,
        deep,
        fileTypeLinkId: syncTextFileTypeLinkId,
        handlerTypeLinkId,
        packageId
      }
    );
    console.log({ insertHandlerId });

    const updateHandlerId = await insertHandler(
      {
        code: fs.readFileSync('./logger-handler.cjs', {encoding: 'utf-8'}),
        fileName: "updateHandlerFile",
        handlerName: "updateHandler",
        handleName: "updateHandle",
        handleOperationTypeLinkId: handleUpdateTypeLinkId,
        supportsId: plv8SupportsJsId,
        triggerTypeLinkId: anyTypeLinkId,
        containTypeLinkId,
        deep,
        fileTypeLinkId: syncTextFileTypeLinkId,
        handlerTypeLinkId,
        packageId,
      }
    );
    console.log({ updateHandlerId });

    const deleteHandlerId = await insertHandler(
      {
        code: 
`
({ deep, data: { oldLink, triggeredByLinkId } }) => {

  const timestamp = Date.now();

  const { data: [{ id: logInsertId }] } = deep.select({
    type_id: deep.id("@deep-foundation/logger", "LogInsert"),
    to_id: oldLink.id
  })

  const { data: [{ id: logLinkLinkId }] } = deep.select({
    type_id: deep.id("@deep-foundation/logger", "LogLink"),
    id: logInsertId.from_id,
  });
  const { data: [{ id: logDeleteLinkId }] } = deep.insert({
    type_id: deep.id("@deep-foundation/logger", "LogDelete"),
    from_id: logLinkLinkId,
    to_id: oldLink.id,
    number: timestamp,
  });

  const { data: [{ id: logSubjectLinkId }] } = deep.insert({
    type_id: deep.id("@deep-foundation/logger", "LogSubject"),
    from_id: triggeredByLinkId,
    to_id: logDeleteLinkId,
  });
}
`.trim()
        ,
        fileName: "deleteHandlerFile",
        handlerName: "deleteHandler",
        handleName: "deleteHandle",
        handleOperationTypeLinkId: handleDeleteTypeLinkId,
        supportsId: plv8SupportsJsId,
        triggerTypeLinkId: /* TODO: anyTypeLinkId */ triggerTypeLinkId,
        containTypeLinkId,
        deep,
        fileTypeLinkId: syncTextFileTypeLinkId,
        handlerTypeLinkId,
        packageId
      }
    );
    console.log({ deleteHandlerId });

    const createdTestLinkIds = [];
    const callTests = async () => {
      // TODO: const {data: [{id: customTypeLinkId}]} = await deep.Delete({
      //   type_id: typeTypeLinkId,
      //   from_id: anyTypeLinkId,
      //   to_id: anyTypeLinkId
      // });
      // console.log({ customTypeLinkId });
      // createdTestLinkIds.push(customTypeLinkId)
      // createdLinkIds.push(customTypeLinkId)

      const { data: [{ id: linkId }] } = await deep.insert({
        type_id: /* TODO: customTypeLinkId*/ triggerTypeLinkId,
      });
      console.log({ linkId });
      createdTestLinkIds.push(linkId)
      createdLinkIds.push(linkId)

      var logInsertId;
      for (let i = 0; i < 10; i++) {
        const { data } = await deep.select({
          type_id: logInsertTypeLinkId,
          to_id: linkId
        });
        if (data.length > 0) {
          logInsertId = data[0].id;
          break;
        }
        await sleep(1000);
      }
      console.log({ logInsertId });
      expect(logInsertId).to.not.be.equal(undefined);

      var logLinkId;
      for (let i = 0; i < 10; i++) {
        const { data } = await deep.select({
          type_id: logLinkTypeLinkId,
          from_id: linkId.from_id,
          to_id: linkId.to_id
        });
        if (data.length > 0) {
          logLinkId = data[0].id;
          break;
        }
        await sleep(1000);
      }
      console.log({ logLinkId });
      expect(logLinkId).to.not.be.equal(undefined);

      var logTypeLinkId;
      for (let i = 0; i < 10; i++) {
        const { data } = await deep.select({
          type_id: logTypeTypeLinkId,
          from_id: logLinkId,
          to_id: /*customTypeLinkId*/ triggerTypeLinkId
        });
        if (data.length > 0) {
          logTypeLinkId = data[0].id;
          break;
        }
        await sleep(1000);
      }
      console.log({ logTypeLinkId });
      expect(logTypeLinkId).to.not.be.equal(undefined);

      await deep.insert({ link_id: linkId, value: "string" }, { table: "strings" });

      var logUpdateId;
      for (let i = 0; i < 10; i++) {
        const { data } = await deep.select({
          type_id: logUpdateTypeLinkId,
          from_id: deep.linkId,
          to_id: logInsertId
        });
        if (data.length > 0) {
          logUpdateId = data[0].id;
          break;
        }
        await sleep(1000);
      }
      console.log({ logUpdateId });
      expect(logUpdateId).to.not.be.equal(undefined);

      await deep.delete({
        id: linkId
      });

      var logDeleteId;
      for (let i = 0; i < 10; i++) {
        const { data } = await deep.select({
          type_id: logDeleteTypeLinkId,
          from_id: deep.linkId,
          to_id: logInsertId
        });
        if (data.length > 0) {
          logDeleteId = data[0].id;
          break;
        }
        await sleep(1000);
      }
      console.log({ logDeleteId });
      expect(logDeleteId).to.not.be.equal(undefined);

    }
    await callTests().then(() => {
      // TODO: deep.delete(createdTestLinkIds);
    }, error => {
      console.error(error)
      // TODO: deep.delete(createdLinkIds);
    });
  }

  await installPackage().catch(error => {
    console.error(error)
    // TODO: deep.delete(createdLinkIds);
  });
};

main();
