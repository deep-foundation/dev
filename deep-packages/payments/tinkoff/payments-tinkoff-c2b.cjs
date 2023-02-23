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
const { payInBrowser } = require("./payInBrowser.cjs");
const { getError } = require("./getError.cjs");
const { generateToken, generateTokenStringWithInsertedTerminalPassword } = require("./generateToken.cjs");
const { getUrl } = require("./getUrl.cjs");
const { getState } = require("./getState.cjs");
const { checkOrder } = require("./checkOrder.cjs");
const { getCardList } = require("./getCardList.cjs");
const { init } = require("./init.cjs");
const { charge } = require("./charge.cjs");
const { addCustomer } = require("./addCustomer.cjs");
const { getCustomer } = require("./getCustomer.cjs");
const { removeCustomer } = require("./removeCustomer.cjs");
const { handlersDependencies } = require("./handlersDependencies.cjs");
const { insertTinkoffPayInsertHandler } = require("./insertTinkoffPayInsertHandler.cjs");
const { insertTinkoffNotificationHandler } = require("./insertTinkoffNotificationHandler.cjs");
const { sleep } = require("../../sleep.cjs");
const { confirm } = require("./confirm.cjs");
const { testInit: callRealizationTestInit } = require('./tests/realization/testInit.cjs');
const { testConfirm: callRealizationTestConfirm } = require('./tests/realization/testConfirm.cjs');
const { testGetState: callRealizationTestGetState } = require('./tests/realization/testGetState.cjs');
const { testGetCardList: callRealizationTestGetCardList } = require('./tests/realization/testGetCardList.cjs');
const { testResend: callRealizationTestResend } = require('./tests/realization/testResend.cjs');
const { testCharge: callRealizationTestCharge } = require('./tests/realization/testCharge.cjs');
const { testAddCustomer: callRealizationTestAddCustomer } = require('./tests/realization/testAddCustomer.cjs');
const { testGetCustomer: callRealizationTestGetCustomer } = require('./tests/realization/testGetCustomer.cjs');
const { testRemoveCustomer: callRealizationTestRemoveCustomer } = require('./tests/realization/testRemoveCustomer.cjs');
const fs = require('fs');
const { errors } = require('./errors.cjs');

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
  "PAYMENTS_C2B_PHONE_NUMBER",
  "PAYMENTS_C2B_EMAIL",
];

for (const requiredEnvVariableName of requiredEnvVariableNames) {
  if (!process.env[requiredEnvVariableName]) {
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
    const valueTypeLinkId = await deep.id("@deep-foundation/core", "Value");
    const stringTypeLinkId = await deep.id("@deep-foundation/core", "String");
    const numberTypeLinkId = await deep.id("@deep-foundation/core", "Number");
    const objectTypeLinkId = await deep.id("@deep-foundation/core", "Object");
    const userTypeLinkId = await deep.id("@deep-foundation/core", "User");

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
      data: [{ id: packageLinkId }],
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

    console.log({ packageLinkId });

    const {
      data: [{ id: sumProviderTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'SumProvider' } },
        },
      },
    });

    console.log({ sumProviderTypeLinkId });

    const {
      data: [{ id: tinkoffProviderTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'TinkoffProvider' } },
        },
      },
    });

    console.log({ tinkoffProviderTypeLinkId });

    const {
      data: [{ id: storageBusinessTypeLinkId }],
    } = await deep.insert({
      type_id: storageTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'StorageBusiness' } },
        },
      },
    });
    console.log({ storageBusinessTypeLinkId });

    const {
      data: [{ id: terminalPasswordTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'TerminalPassword' } },
        },
      },
    });
    console.log({ terminalPasswordTypeLinkId });

    const {
      data: [{ id: storageClientTypeLinkId }],
    } = await deep.insert({
      type_id: storageTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'StorageClient' } },
        },
      },
    });
    console.log({ storageClientTypeLinkId });

    const {
      data: [{ id: storageClientTitleTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: storageClientTypeLinkId,
      to_id: storageClientTypeLinkId, // TODO
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'StorageClientTitle' } },
        },
      },
    });
    console.log({ titleTypeLinkId: storageClientTitleTypeLinkId });

    const {
      data: [{ id: incomeTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Income' } },
        },
      },
    });
    console.log({ incomeTypeLinkId });

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

    const {
      data: [{ id: terminalKeyTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'TerminalKey' } },
        },
      },
    });
    console.log({ terminalKeyTypeLinkId });

    const {
      data: [{ id: usesTerminalKeyTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'UsesTerminalKey' } },
        },
      },
    });
    console.log({ usesTerminalKeyTypeLinkId });

    const {
      data: [{ id: terminalKeyLinkId }],
    } = await deep.insert({
      type_id: terminalKeyTypeLinkId,
      string: { data: { value: process.env.PAYMENTS_C2B_TERMINAL_KEY } },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
          {
            type_id: usesTerminalKeyTypeLinkId,
            from_id: storageBusinessLinkId
          },
        ],
      },
    });
    console.log({ terminalKeyLinkId });

    const {
      data: [{ id: usesTerminalPasswordTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: anyTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'UsesTerminalPassword' } },
        },
      },
    });
    console.log({ usesTerminalPasswordTypeLinkId });

    const {
      data: [{ id: terminalPasswordLinkId }],
    } = await deep.insert({
      type_id: terminalPasswordTypeLinkId,
      string: { data: { value: process.env.PAYMENTS_C2B_TERMINAL_PASSWORD } },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
          {
            type_id: usesTerminalPasswordTypeLinkId,
            from_id: storageBusinessLinkId
          },
        ],
      },
    });
    console.log({ terminalPasswordLinkId });

    const {
      data: [{ id: paymentTypeLinkId }],
    } = await deep.insert({
      type_id: basePaymentTypeLinkId,
      from_id: userTypeLinkId, 
      to_id: storageBusinessTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'Payment' } },
        },
      },
      out: {
        data: [
          {
            type_id: valueTypeLinkId,
            to_id: objectTypeLinkId
          }
        ]
      }
    });
    console.log({ paymentTypeLinkId });

    const {
      data: [{ id: paymentObjectTypeLinkId }],
    } = await deep.insert({
      type_id: baseObjectTypeLinkId,
      from_id: paymentTypeLinkId,
      to_id: anyTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'Object' } },
        },
      },
    });

    console.log({ objectTypeLinkId: paymentObjectTypeLinkId });

    const {
      data: [{ id: sumTypeLinkId }],
    } = await deep.insert({
      type_id: baseSumTypeLinkId,
      from_id: sumProviderTypeLinkId,
      to_id: paymentTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Sum' } },
        },
      },
      out: {
        data: [
          {
            type_id: valueTypeLinkId,
            to_id: numberTypeLinkId
          }
        ]
      }
    });

    console.log({ sumTypeLinkId });

    const {
      data: [{ id: payTypeLinkId }],
    } = await deep.insert({
      type_id: basePayTypeLinkId,
      from_id: userTypeLinkId,
      to_id: sumTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Pay' } },
        },
      },
    });

    console.log({ payTypeLinkId });

    const {
      data: [{ id: urlTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: tinkoffProviderTypeLinkId,
      to_id: payTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Url' } },
        },
      },
      out: {
        data: [
          {
            type_id: valueTypeLinkId,
            to_id: stringTypeLinkId
          }
        ]
      }
    });

    console.log({ urlTypeLinkId });

    const {
      data: [{ id: payedTypeLinkId }],
    } = await deep.insert({
      type_id: basePayedTypeLinkId,
      from_id: tinkoffProviderTypeLinkId,
      to_id: payTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Payed' } },
        },
      },
    });

    console.log({ payedTypeLinkId });

    const {
      data: [{ id: errorTypeLinkId }],
    } = await deep.insert({
      type_id: baseErrorTypeLinkId,
      from_id: tinkoffProviderTypeLinkId,
      to_id: payTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Error' } },
        },
      },
      out: {
        data: [
          {
            type_id: valueTypeLinkId,
            to_id: stringTypeLinkId
          }
        ]
      }
    });

    console.log({ errorTypeLinkId });

    const {
      data: [{ id: paymentTreeId }],
    } = await deep.insert({
      type_id: treeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
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
                  from_id: packageLinkId,
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
                  from_id: packageLinkId,
                },
              ],
            },
          },
          {
            type_id: treeIncludeDownTypeLinkId,
            to_id: paymentObjectTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: packageLinkId,
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
                  from_id: packageLinkId,
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
                  from_id: packageLinkId,
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
                  from_id: packageLinkId,
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
                  from_id: packageLinkId,
                },
              ],
            },
          },
        ],
      },
    });

    const {
      data: [{ id: tinkoffApiUrlTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'TinkoffApiUrl' } },
        },
      },
    });
    console.log({ tinkoffApiUrlTypeLinkId });

    const {
      data: [{ id: tinkoffApiUrlLinkId }],
    } = await deep.insert({
      type_id: tinkoffApiUrlTypeLinkId,
      string: {
        data: {
          value: process.env.PAYMENTS_C2B_URL
        }
      },
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: deep.linkId, 
        },
      },
    });
    console.log({ tinkoffApiUrlLinkId });

    const {
      data: [{ id: notificationUrlTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'NotificationUrl' } },
        },
      },
    });
    console.log({ notificationUrlTypeLinkId });

    const {
      data: [{ id: notificationUrlLinkId }],
    } = await deep.insert({
      type_id: notificationUrlTypeLinkId,
      string: {
        data: {
          value: process.env.PAYMENTS_C2B_NOTIFICATION_URL
        }
      },
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: deep.linkId, 
        },
      },
    });
    console.log({ notificationUrlLinkId });

    const {
      data: [{ id: emailTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'Email' } },
        },
      },
    });
    console.log({ emailTypeLinkId });

    const {
      data: [{ id: emailLinkId }],
    } = await deep.insert({
      type_id: emailTypeLinkId,
      string: {
        data: {
          value: process.env.PAYMENTS_C2B_EMAIL
        }
      },
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: deep.linkId, 
        },
      },
    });
    console.log({ emailLinkId });

    const {
      data: [{ id: phoneNumberTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId, 
          string: { data: { value: 'PhoneNumber' } },
        },
      },
    });
    console.log({ phoneNumberTypeLinkId });

    const {
      data: [{ id: phoneNumberLinkId }],
    } = await deep.insert({
      type_id: phoneNumberTypeLinkId,
      string: {
        data: {
          value: process.env.PAYMENTS_C2B_PHONE_NUMBER
        }
      },
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: deep.linkId, 
        },
      },
    });
    console.log({ phoneNumberLinkId });


  
      await deep.insert({
        type_id: await deep.id("@deep-foundation/core", "SyncTextFile"),
        string: {
          data: {
            value: fs.readFileSync('./deep-packages/payments/tinkoff/payInsertHandler.js', {encoding: 'utf-8'}),
          },
        },
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: packageLinkId,
              string: { data: { value: "TokenizerHandlerCode" } },
            },
            {
              from_id: await deep.id("@deep-foundation/core", "dockerSupportsJs"),
              type_id: await deep.id("@deep-foundation/core", "Handler"),
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: packageLinkId, 
                    string: { data: { value: "TokenizerHandler" } },
                  },
                  {
                    type_id: await deep.id("@deep-foundation/core", "HandleInsert"),
                    from_id: payTypeLinkId,
                    in: {
                      data: [
                        {
                          type_id: containTypeLinkId,
                          from_id: packageLinkId, 
                          string: { data: { value: "TokenizerHandle" } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
    
      });

    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Port'),
      number: { data: { value: process.env.PAYMENTS_C2B_NOTIFICATION_PORT } },
      in: { data: [
        {
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          from_id: deep.linkId,
        },
        {
          type_id: await deep.id('@deep-foundation/core', 'RouterListening'),
          in: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            from_id: packageLinkId,
          } },
          from: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Router'),
            in: { data: {
              type_id: await deep.id('@deep-foundation/core', 'Contain'),
              from_id: packageLinkId,
            } },
            in: { data: {
              type_id: await deep.id('@deep-foundation/core', 'RouterStringUse'),
              string: { data: { value: process.env.PAYMENTS_C2B_NOTIFICATION_ROUTE } },
              in: { data: {
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                from_id: deep.linkId,
              } },
              from: { data: {
                type_id: await deep.id('@deep-foundation/core', 'Route'),
                in: { data: {
                  type_id: await deep.id('@deep-foundation/core', 'Contain'),
                  from_id: packageLinkId,
                } },
                out: { data: {
                  type_id: await deep.id('@deep-foundation/core', 'HandleRoute'),
                  in: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'Contain'),
                    from_id: packageLinkId,
                  } },
                  to: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'Handler'),
                    from_id: await deep.id('@deep-foundation/core', 'dockerSupportsJs'),
                    in: { data: {
                      type_id: await deep.id('@deep-foundation/core', 'Contain'),
                      from_id: packageLinkId,
                    } },
                    to: { data: {
                      type_id: await deep.id('@deep-foundation/core', 'SyncTextFile'),
                      string: { data: {
                        value: fs.readFileSync('./deep-packages/payments/tinkoff/tinkoffNotificationHandler.js', {encoding: 'utf-8'}),
                      } },
                      in: { data: {
                        type_id: await deep.id('@deep-foundation/core', 'Contain'),
                        from_id: packageLinkId,
                      } },
                    } },
                  } },
                } },
              } },
            } },
          } },
        }
      ] },
    })


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


        createdLinkIds.push(storageBusinessLinkId);
        allCreatedLinkIds.push(storageBusinessLinkId);

        const {
          data: [{ id: terminalPasswordLinkId }],
        } = await deep.insert({
          type_id: terminalPasswordTypeLinkId,
          string: { data: { value: process.env.PAYMENTS_C2B_TERMINAL_KEY } },
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
              {
                type_id: usesTerminalPasswordTypeLinkId,
                from_id: storageBusinessLinkId
              },
            ],
          },
        });
        console.log({ terminalPasswordLinkId });
        createdLinkIds.push(terminalPasswordLinkId);
        allCreatedLinkIds.push(terminalPasswordLinkId);

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
            type_id: paymentObjectTypeLinkId,
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
            if (createdLink.type_id === payTypeLinkId) {
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

        // await deep.delete(createdLinkIds);
      };

      // await callRealizationTests();
      await callIntegrationTests();
    };

    await callTests();

  } catch (error) {
    // await deep.delete(allCreatedLinkIds);
    console.log(error);
    // process.exit(1);
  }
};

installPackage();