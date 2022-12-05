require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const { generateApolloClient } = require('@deep-foundation/hasura/client');
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const {
  minilinks,
  Link,
} = require('@deep-foundation/deeplinks/imports/minilinks');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const axios = require('axios');
const uniqid = require('uniqid');
const { expect } = require('chai');
const { get } = require('lodash');
const {
  default: links,
} = require('@deep-foundation/deeplinks/imports/router/links');
var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
const {payInBrowser} = require("./deep-packages/payments/tinkoff/payInBrowser.cjs");
const {getError} = require("./deep-packages/payments/tinkoff/getError.cjs");
const { generateToken, generateTokenStringWithInsertedTerminalPassword } = require("./deep-packages/payments/tinkoff/generateToken.cjs");
const { getUrl } = require("./deep-packages/payments/tinkoff/getUrl.cjs");
const { getState } = require("./deep-packages/payments/tinkoff/getState.cjs");
const { checkOrder } = require("./deep-packages/payments/tinkoff/checkOrder.cjs");
const { getCardList } = require("./deep-packages/payments/tinkoff/getCardList.cjs");
const { init } = require("./deep-packages/payments/tinkoff/init.cjs");
const { charge } = require("./deep-packages/payments/tinkoff/charge.cjs");
const { addCustomer } = require("./deep-packages/payments/tinkoff/addCustomer.cjs");
const { getCustomer } = require("./deep-packages/payments/tinkoff/getCustomer.cjs");
const { removeCustomer } = require("./deep-packages/payments/tinkoff/removeCustomer.cjs");
const { handlersDependencies } = require("./deep-packages/payments/tinkoff/handlersDependencies.cjs");
const { insertTinkoffPayInsertHandler } = require("./deep-packages/payments/tinkoff/insertTinkoffPayInsertHandler.cjs");
const { insertTinkoffNotificationHandler } = require("./deep-packages/payments/tinkoff/insertTinkoffNotificationHandler.cjs");
const {sleep} = require("./deep-packages/sleep.cjs");
const {confirm} = require("./deep-packages/payments/tinkoff/confirm.cjs");
const {testInit: callRealizationTestInit} = require('./deep-packages/payments/tinkoff/tests/realization/testInit.cjs');
const {testConfirm: callRealizationTestConfirm} = require('./deep-packages/payments/tinkoff/tests/realization/testConfirm.cjs');
const {testGetState: callRealizationTestGetState} = require('./deep-packages/payments/tinkoff/tests/realization/testGetState.cjs');
const {testGetCardList: callRealizationTestGetCardList} = require('./deep-packages/payments/tinkoff/tests/realization/testGetCardList.cjs');
const {testResend: callRealizationTestResend} = require('./deep-packages/payments/tinkoff/tests/realization/testResend.cjs');
const {testCharge: callRealizationTestCharge} = require('./deep-packages/payments/tinkoff/tests/realization/testCharge.cjs');
const {testAddCustomer: callRealizationTestAddCustomer} = require('./deep-packages/payments/tinkoff/tests/realization/testAddCustomer.cjs');
const {testGetCustomer: callRealizationTestGetCustomer} = require('./deep-packages/payments/tinkoff/tests/realization/testGetCustomer.cjs');
const {testRemoveCustomer: callRealizationTestRemoveCustomer} = require('./deep-packages/payments/tinkoff/tests/realization/testRemoveCustomer.cjs');

console.log('Installing payments-tinkoff-c2b package');

const requiredEnvVariableNames = [
"PAYMENTS_C2B_TERMINAL_KEY",
"PAYMENTS_C2B_TERMINAL_PASSWORD",
"PAYMENTS_C2B_URL",
"PAYMENTS_C2B_NOTIFICATION_ROUTE",
"PAYMENTS_C2B_NOTIFICATION_PORT",
"PAYMENTS_C2B_NOTIFICATION_URL",
"PAYMENTS_C2B_CARD_NUMBER_SUCCESS",
"PAYMENTS_C2B_CARD_EXPDATE",
"PAYMENTS_C2B_CARD_CVC",
"PAYMENTS_C2B_PHONE",
"PAYMENTS_C2B_EMAIL",
];

for (const requiredEnvVariableName of requiredEnvVariableNames) {
  if(!process.env[requiredEnvVariableName]) {
    throw new Error(`The environment variable ${requiredEnvVariableName} is required. All the required environment variables: \n${requiredEnvVariableNames.join("\n")}`);
  }
}

// console.log(process.env.PAYMENTS_C2B_NOTIFICATION_URL);
// process.exit(1);

const allCreatedLinkIds = [];

const installPackage = async () => {
  const apolloClient = generateApolloClient({
    path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
    ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost')
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

  try {
    const typeTypeLinkId = await deep.id('@deep-foundation/core', 'Type');
    const anyTypeLinkId = await deep.id('@deep-foundation/core', 'Any');
    const joinTypeLinkId = await deep.id('@deep-foundation/core', 'Join');
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    const packageTypeLinkId = await deep.id('@deep-foundation/core', 'Package');
  

    const syncTextFileTypeLinkId = await deep.id('@deep-foundation/core', 'SyncTextFile');
    const dockerSupportsJs = await deep.id(
      '@deep-foundation/core',
      'dockerSupportsJs'
    );
    const handleInsertTypeLinkId = await deep.id('@deep-foundation/core', 'HandleInsert');
    const portTypeLinkId = await deep.id('@deep-foundation/core', 'Port');
    const routerListeningTypeLinkId = await deep.id('@deep-foundation/core', 'RouterListening');
    const routerTypeLinkId = await deep.id('@deep-foundation/core', 'Router');
    const routerStringUseTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'RouterStringUse'
    );
    const routeTypeLinkId = await deep.id('@deep-foundation/core', 'Route');
    const handleRouteTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'HandleRoute'
    );
    const handlerTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'Handler'
    );
    const dockerSupportsJsId = await deep.id(
      '@deep-foundation/core',
      'dockerSupportsJs'
    );

    const treeTypeLinkId = await deep.id('@deep-foundation/core', 'Tree');
    const treeIncludeNodeTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'TreeIncludeNode'
    );
    const treeIncludeUpTypeLinkId = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
    const treeIncludeDownTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'TreeIncludeDown'
    );

    const basePaymentTypeLinkId = await deep.id('@deep-foundation/payments', 'Payment');
    const baseObjectTypeLinkId = await deep.id('@deep-foundation/payments', 'Object');
    const baseSumTypeLinkId = await deep.id('@deep-foundation/payments', 'Sum');
    const basePayTypeLinkId = await deep.id('@deep-foundation/payments', 'Pay');
    const baseUrlTypeLinkId = await deep.id('@deep-foundation/payments', 'Url');
    const basePayedTypeLinkId = await deep.id('@deep-foundation/payments', 'Payed');
    const baseErrorTypeLinkId = await deep.id('@deep-foundation/payments', 'Error');
    const storageTypeLinkId = await deep.id('@deep-foundation/payments', 'Storage');

    const {
      data: [{ id: packageId }],
    } = await deep.insert({
      type_id: packageTypeLinkId,
      string: { data: { value: '@deep-foundation/payments-tinkoff-c2b' } },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
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
        ],
      },
    });

    console.log({ packageId });

    const {
      data: [{ id: sumProviderTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId,
          string: { data: { value: 'SumProvider' } },
        },
      },
    });

    console.log({ sumProviderTypeLinkId });

    const {
      data: [{ id: tinkoffProviderTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId,
          string: { data: { value: 'TinkoffProvider' } },
        },
      },
    });

    console.log({ tinkoffProviderTypeLinkId });

    const {
      data: [{ id: paymentTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId,
          string: { data: { value: 'Payment' } },
        },
      },
    });

    console.log({ paymentTypeLinkId });

    const {
      data: [{ id: objectTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: paymentTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId,
          string: { data: { value: 'Object' } },
        },
      },
    });

    console.log({ objectTypeLinkId });

    const {
      data: [{ id: sumTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Sum' } },
        },
      },
    });

    console.log({ sumTypeLinkId });

    // TODO Rest restrictions
    const {
      data: [{ id: payTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Pay' } },
        },
      },
    });

    console.log({ payTypeLinkId });

    const {
      data: [{ id: urlTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Url' } },
        },
      },
    });

    console.log({ urlTypeLinkId });

    const {
      data: [{ id: payedTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Payed' } },
        },
      },
    });

    console.log({ payedTypeLinkId });

    const {
      data: [{ id: errorTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Error' } },
        },
      },
    });

    console.log({ errorTypeLinkId });

    const {
      data: [{ id: paymentTreeId }],
    } = await deep.insert({
      type_id: treeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId,
          string: { data: { value: 'paymentTree' } },
        },
      },
      out: {
        data: [
          {
            type_id: treeIncludeNodeTypeLinkId,
            to_id: paymentTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeUpTypeLinkId,
            to_id: sumTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeDownTypeLinkId,
            to_id: objectTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeUpTypeLinkId,
            to_id: errorTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeUpTypeLinkId,
            to_id: payedTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeUpTypeLinkId,
            to_id: payTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeUpTypeLinkId,
            to_id: urlTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          },
        ],
      },
    });

    const {
      data: [{ id: storageBusinessTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'StorageBusiness' } },
        },
      },
    });
    console.log({storageBusinessTypeLinkId});

    const {
      data: [{ id: tokenTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Token' } },
        },
      },
    });
    console.log({tokenTypeLinkId});


    const {
      data: [{ id: storageClientTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'StorageClient' } },
        },
      },
    });
    console.log({storageClientTypeLinkId});

    const {
      data: [{ id: titleTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Title' } },
        },
      },
    });
    console.log({ titleTypeLinkId });

    const {
      data: [{ id: incomeTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageId, // before created package
          string: { data: { value: 'Income' } },
        },
      },
    });
    console.log({ incomeTypeLinkId });
    debugger;

    await insertTinkoffPayInsertHandler({packageName: "@deep-foundation/payments-tinkoff-c2b",deep, containTypeLinkId, fileTypeLinkId: syncTextFileTypeLinkId, handleInsertTypeLinkId, handlerTypeLinkId, notificationUrl: process.env.PAYMENTS_C2B_NOTIFICATION_URL, packageId, supportsId: dockerSupportsJs, userEmail: process.env.PAYMENTS_C2B_EMAIL, userPhone: process.env.PAYMENTS_C2B_PHONE, dockerSupportsJsId, payTypeLinkId});

    const tinkoffNotificationOnConfirmedCode = `

    const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
    const tinkoffProviderLinkSelectQuery = await deep.select({
      type_id: tinkoffProviderTypeLinkId
    });
    if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
    const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
    console.log({tinkoffProviderLinkId});

    const paymentLinkSelectQuery = await deep.select({
      object: {value: {_contains: {bankPaymentId: parseInt(req.body.PaymentId)}}}
    });
    if(paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
    const paymentLink = paymentLinkSelectQuery.data[0];
    console.log({paymentLink});
    if(!paymentLink) { throw new Error("The payment link associated with the bank payment id " + req.body.PaymentId + " is not found."); }

    const {data: mpUpPayment, error: mpUpPaymentSelectQueryError} = await deep.select({
      up: {
        parent_id: { _eq: paymentLink.id },
        tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
      }
    });
    console.log({mpUpPayment});
    if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }

    const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
    const payLink = mpUpPayment.find(link => link.type_id === payTypeLinkId);
    console.log({payLink});
    if(!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }

    const payedLinkInsertQuery = await deep.insert({
      type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderLinkId,
      to_id: payLink.id,
    });
    if(payedLinkInsertQuery.error) { throw new Error(payedLinkInsertQuery.error.message); }
    const payedLinkId = payedLinkInsertQuery.data[0].id;
    console.log({payedLinkId});

    const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
    const storageClientLinkSelectQuery = await deep.select({
      type_id: StorageClient,
      number: {value: req.body.CardId}
    });
    console.log({storageClientLinkSelectQuery});
    if(storageClientLinkSelectQuery.error) {throw new Error(storageClientLinkSelectQuery.error.message);}
    
    if(fromLinkOfPayment.type_id !== StorageClient) {
      var storageClientLinkId;
      if(storageClientLinkSelectQuery.data.length === 0) {
        const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
        const storageClientLinkInsertQuery = await deep.insert({
          type_id: StorageClient,
          number: {data: {value: req.body.CardId}},
        });
        console.log({storageClientLinkInsertQuery});
        if(storageClientLinkInsertQuery.error) {throw new Error(storageClientLinkInsertQuery.error.message);}
        storageClientLinkId = storageClientLinkInsertQuery.data[0].id;
    
        const Title = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
        const titleLinkInsertQuery = await deep.insert({
          type_id: Title,
          from_id: storageClientLinkId,
          to_id: storageClientLinkId,
          string: {data: {value: req.body.Pan}},
        });
        if(titleLinkInsertQuery.error) {throw new Error(titleLinkInsertQuery.error.message);}
        const titleLinkId = titleLinkInsertQuery.data[0].id;
        console.log({titleLinkId});
      } else {
        storageClientLinkId = storageClientLinkSelectQuery.data[0];
      }
      const Income = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Income");
      const incomeLinkInsertQuery = await deep.insert({
        type_id: Income,
        from_id: paymentLink.id,
        to_id: storageClientLinkId,
      });
      if(incomeLinkInsertQuery.error) {throw new Error(incomeLinkInsertQuery.error.message);}
      const incomeLinkId = incomeLinkInsertQuery.data[0].id;
      console.log({incomeLinkId});
      
    }
  `;
    await insertTinkoffNotificationHandler({packageName: "@deep-foundation/payments-tinkoff-c2b",packageId,deep, adminId: await deep.id('deep', 'admin'), containTypeLinkId, fileTypeLinkId: syncTextFileTypeLinkId, handleRouteTypeLinkId, handlerTypeLinkId, notificationPort: process.env.PAYMENTS_C2B_NOTIFICATION_PORT, notificationRoute: process.env.PAYMENTS_C2B_NOTIFICATION_ROUTE, portTypeLinkId, routerListeningTypeLinkId, routerStringUseTypeLinkId, routerTypeLinkId, routeTypeLinkId, supportsId: dockerSupportsJsId, onConfirmedCode: tinkoffNotificationOnConfirmedCode});

    const callTests = async () => {
      console.log('callTests-start');

      const PRICE = 5500;

      const callRealizationTests = async () => {
        await callRealizationTestInit();
        await callRealizationTestConfirm();
        await callRealizationTestGetState();
        await callRealizationTestGetCardList();
        await callRealizationTestResend();
        await callRealizationTestCharge();
        await callRealizationTestAddCustomer();
        await callRealizationTestGetCustomer();
        await callRealizationTestRemoveCustomer();
      };

      const callIntegrationTests = async () => {

        const createdLinkIds = [];

        const {
          data: [{ id: tinkoffProviderLinkId }],
        } = await deep.insert({
          type_id: tinkoffProviderTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ tinkoffProviderLinkId });
        createdLinkIds.push(tinkoffProviderLinkId);
        allCreatedLinkIds.push(tinkoffProviderLinkId);

        const {
          data: [{ id: sumProviderLinkId }],
        } = await deep.insert({
          type_id: sumProviderTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ sumProviderLinkId });
        createdLinkIds.push(sumProviderLinkId);
        allCreatedLinkIds.push(sumProviderLinkId);

        const {
          data: [{ id: storageBusinessLinkId }],
        } = await deep.insert({
          type_id: storageBusinessTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ storageBusinessLinkId });
        createdLinkIds.push(storageBusinessLinkId);
        allCreatedLinkIds.push(storageBusinessLinkId);

        const {
          data: [{ id: tokenLinkId }],
        } = await deep.insert({
          type_id: tokenTypeLinkId,
          from_id: storageBusinessLinkId,
          to_id: storageBusinessLinkId,
          string: { data: { value: process.env.PAYMENTS_C2B_TERMINAL_KEY } },
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ tokenLinkId });
        createdLinkIds.push(tokenLinkId);
        allCreatedLinkIds.push(tokenLinkId);

        const {
          data: [{ id: productTypeLinkId }],
        } = await deep.insert({
          type_id: typeTypeLinkId,
          from_id: anyTypeLinkId,
          to_id: anyTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ productTypeLinkId });
        createdLinkIds.push(productTypeLinkId);
        allCreatedLinkIds.push(productTypeLinkId);

        const {
          data: [{ id: productLinkId }],
        } = await deep.insert({
          type_id: productTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ productLinkId });
        createdLinkIds.push(productLinkId);
        allCreatedLinkIds.push(productLinkId);

        const testInit = async () => {
          console.log('testInit-start');

          const createdLinkIds = [];

          const {
            data: [{ id: paymentLinkId }],
          } = await deep.insert({
            type_id: paymentTypeLinkId,
            from_id: deep.linkId,
            to_id: storageBusinessLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ paymentLinkId });
          createdLinkIds.push(paymentLinkId);
          allCreatedLinkIds.push(paymentLinkId);

          const {
            data: [{ id: sumLinkId }],
          } = await deep.insert({
            type_id: sumTypeLinkId,
            from_id: sumProviderLinkId,
            to_id: paymentLinkId,
            number: { data: { value: PRICE } },
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ sumLinkId });
          createdLinkIds.push(sumLinkId);
          allCreatedLinkIds.push(sumLinkId);

          const {
            data: [{ id: objectLinkId }],
          } = await deep.insert({
            type_id: objectTypeLinkId,
            from_id: paymentLinkId,
            to_id: productLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ objectLinkId });
          createdLinkIds.push(objectLinkId);
          allCreatedLinkIds.push(objectLinkId);

          const {
            data: [{ id: payLinkId }],
          } = await deep.insert({
            type_id: payTypeLinkId,
            from_id: deep.linkId,
            to_id: sumLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ payLinkId });
          createdLinkIds.push(payLinkId);
          allCreatedLinkIds.push(payLinkId);

          var urlLinkSelectQuery;
          for (let i = 0; i < 10; i++) {
            urlLinkSelectQuery = await deep.select({
              type_id: urlTypeLinkId,
              to_id: payLinkId,
            });

            if (urlLinkSelectQuery.data.length > 0) {
              break;
            }

            await sleep(1000);
          }

          expect(urlLinkSelectQuery.data.length).to.greaterThan(0);

          createdLinkIds.push(urlLinkSelectQuery.data[0].id);
          allCreatedLinkIds.push(urlLinkSelectQuery.data[0].id);

          const createdLinks = (await deep.select(createdLinkIds)).data;
          console.log({ createdLinks });

          console.log('testInit-end');

          return {
            createdLinks
          }
        };

        const testFinishAuthorize = async () => {
          console.log('testFinishAuthorize-start');
          const { createdLinks } = await testInit();

          const urlLink = createdLinks.find(link => link.type_id === urlTypeLinkId);
          expect(urlLink).to.not.be.equal(undefined)

          const url = urlLink.value.value;
          console.log({ url });

          const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
          const page = await browser.newPage();
          await payInBrowser({
            browser,
            page,
            url,
          });

          console.log({ createdLinks });

          console.log('testFinishAuthorize-end');

          return {
            createdLinks
          }
        };

        const testConfirm = async () => {
          console.log('testConfirm-start');
          const { createdLinks } = await testFinishAuthorize();

          const createdLinkIds = [];

          const payLink = createdLinks.find(link => link.type_id === payTypeLinkId);
          expect(payLink).to.not.be.equal(undefined);

          var payedLinkSelectQuery;
          for (let i = 0; i < 10; i++) {
            payedLinkSelectQuery = await deep.select({
              type_id: payedTypeLinkId,
              to_id: payLink.id
            });

            if (payedLinkSelectQuery.data.length > 0) {
              break;
            }

            await sleep(1000);
          }

          expect(payedLinkSelectQuery.data.length).to.greaterThan(0);

          createdLinkIds.push(payedLinkSelectQuery.data[0].id);
          allCreatedLinkIds.push(payedLinkSelectQuery.data[0].id);

          createdLinks.push(...(await deep.select(createdLinkIds)).data);

          console.log({ createdLinks });

          console.log('testConfirm-end');

          return {
            createdLinks
          }
        };

      const callTest = async (testFunction) => {
        const { createdLinks } = await testFunction();
        for (const createdLink of createdLinks) {
          if(createdLink.type_id === payTypeLinkId) {
            const errorLinkSelectQuery = await deep.select({
              type_id: errorTypeLinkId,
              to_id: createdLink.id
            });
            createdLinks.push(...errorLinkSelectQuery.data);
          }
        }
        await deep.delete(createdLinks.map((link) => link.id));
      }

      await callTest(testInit);
      await callTest(testFinishAuthorize);
      await callTest(testConfirm);

      await deep.delete(createdLinkIds);
      };

      // await callRealizationTests();
      await callIntegrationTests();
    };

    await callTests();

  } catch (error) {
    await deep.delete(allCreatedLinkIds);
    console.log(error);
    process.exit(1);
  }
};

installPackage();