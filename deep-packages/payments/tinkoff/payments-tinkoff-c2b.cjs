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
const { default: assert } = require('assert');

console.log('Installing payments-tinkoff-c2b package');

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
    out: {
      data: {
        type_id: valueTypeLinkId,
        to_id: stringTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: packageLinkId,
            string: { data: { value: 'TypeOfValueOfTerminalPassword' } },
          }
        }
      },
    }
  });
  const { data: [{ id: usesTerminalPasswordTypeLinkId }] } = await deep.insert({
    type_id: typeTypeLinkId,
    from_id: storageBusinessTypeLinkId,
    to_id: terminalPasswordTypeLinkId,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: packageLinkId,
        string: { data: { value: 'UsesTerminalPassword' } },
      },
    },
  });

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

  await deep.insert({
    type_id: typeTypeLinkId,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: packageLinkId,
        string: { data: { value: 'StorageClientTitle' } },
      },
    },
    out: {
      data: {
        type_id: valueTypeLinkId,
        to_id: stringTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: packageLinkId,
            string: { data: { value: 'TypeOfValueOfStorageClientTitle' } },
          }
        }
      }
    }
  });

  const {
    data: [{ id: incomeTypeLinkId }],
  } = await deep.insert({
    type_id: typeTypeLinkId,
    from_id: paymentTypeLinkId,
    to_id: userTypeLinkId,
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
    out: {
      data: {
        type_id: valueTypeLinkId,
        to_id: stringTypeLinkId,
        in: {
          data: {
            type_id: containTypeLinkId,
            from_id: packageLinkId,
            string: { data: { value: 'TypeOfValueOfTerminalKey' } },
          }
        }
      },
    }
  });
  console.log({ terminalKeyTypeLinkId });

  const {
    data: [{ id: usesTerminalKeyTypeLinkId }],
  } = await deep.insert({
    type_id: typeTypeLinkId,
    from_id: storageBusinessTypeLinkId,
    to_id: terminalKeyTypeLinkId,
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
    from_id: anyTypeLinkId,
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
          to_id: numberTypeLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: packageLinkId,
              string: { data: { value: 'TypeOfValueOfSum' } },
            }
          }
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
    type_id: baseUrlTypeLinkId,
    from_id: packageTypeLinkId,
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
          to_id: stringTypeLinkId,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: packageLinkId,
                string: { data: { value: 'TypeOfValueOfUrl' } },
              },
            ],
          },
        }
      ]
    }
  });

  const {
    data: [{ id: payedTypeLinkId }],
  } = await deep.insert({
    type_id: basePayedTypeLinkId,
    from_id: packageTypeLinkId,
    to_id: payTypeLinkId,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: packageLinkId,
        string: { data: { value: 'Payed' } },
      },
    }
  });

  console.log({ urlTypeLinkId });

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
    type_id: syncTextFileTypeLinkId,
    string: {
      data: {
        value: 'https://securepay.tinkoff.ru/v2'
      }
    },
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


  await deep.insert({
    type_id: await deep.id("@deep-foundation/core", "SyncTextFile"),
    string: {
      data: {
        value: fs.readFileSync('./deep-packages/payments/tinkoff/payInsertHandler.js', { encoding: 'utf-8' }),
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

  const code = ; 
  const route = ;
  const port = ;
  const ownerLinkId = ;
  
  const reservedIds = await deep.reserve(6);
  
  const syncTextFileLinkId = reservedIds.pop();
  const handlerLinkId = reservedIds.pop();
  
  await deep.serial({
    operations: [
      createSerialOperation({
        table: 'links',
        type: 'insert',
        objects: {
          id: syncTextFileLinkId,
          type_id: syncTextFileTypeLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: ownerLinkId
            }
          }
        }
      }),
      createSerialOperation({
        table: 'strings',
        type: 'insert',
        objects: {
          link_id: syncTextFileLinkId,
          value: fs.readFileSync('./deep-packages/payments/tinkoff/tinkoffNotificationHandler.js', { encoding: 'utf-8' })
        }
      }),
      createSerialOperation({
        table: 'links',
        type: 'insert',
        objects: {
          id: handlerLinkId,
          type_id: handlerTypeLinkId,
          from_id: supportsJsLinkId,
          to_id: syncTextFileLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: ownerLinkId
            }
          }
        }
      }),
    ]
  });


  const callTests = async () => {
    const TEST_PRICE = 5500;

    const reservedIds = await deep.reserve(10);
    const storageBusinessLinkId = reservedIds.pop();
    const terminalPasswordLinkId = reservedIds.pop();
    const productLinkId = reservedIds.pop();

    await deep.serial({
      operations: [
        {
          type: 'insert',
          table: 'links',
          objects: {
            id: storageBusinessLinkId,
            type_id: storageBusinessTypeLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              }
            }
          },
        },
        {
          type: 'insert',
          table: 'links',
          objects: {
            id: terminalPasswordLinkId,
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
          },
        },
        {
          type: 'insert',
          table: 'links',
          objects: {
            id: productLinkId,
            type_id: syncTextFileTypeLinkId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          }
        }
      ]
    })

    const paymentLinkId = reservedIds.pop();
    const sumLinkId = reservedIds.pop();
    const objectLinkId = reservedIds.pop();
    const payLinkId = reservedIds.pop();

    const paymentInsertData = {
      type: 'insert',
      table: 'links',
      objects: {
        id: paymentLinkId,
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
      }
    };

    const sumInsertData = {
      type: 'insert',
      table: 'links',
      objects: {
        id: sumLinkId,
        type_id: sumTypeLinkId,
        from_id: sumProviderLinkId,
        to_id: paymentLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: deep.linkId,
            },
          ],
        },
      }
    };

    const sumValueInsertData = {
      type: 'insert',
      table: 'numbers',
      objects: {
        link_id: sumLinkId,
        value: TEST_PRICE
      }
    };

    const objectInsertData = {
      id: objectLinkId,
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
    }

    const payInsertData = {
      id: payLinkId,
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
    };

    await deep.serial({
      operations: [
        paymentInsertData,
        sumInsertData,
        sumValueInsertData,
        objectInsertData,
        payInsertData
      ]
    })

    async function tryGetLink({ selectData, delayMs, attemptsCount }) {
      let resultLink;
      for (let i = 0; i < attemptsCount; i++) {
        const { data: [link] } = await deep.select(selectData);

        if (link) {
          resultLink = link
        }

        await sleep(delayMs);
      }
      return { link: resultLink };
    }

    const { link: urlLink } = await tryGetLink({
      delayMs: 1000, attemptsCount: 10, selectData: {
        type_id: urlTypeLinkId,
        from_id: payLinkId,
      }
    });

    assert.notEqual(urlLink, undefined)

    const url = urlLink.value.value;

    assert.notEqual(urlLink, undefined)

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await payInBrowser({
      browser,
      page,
      url,
    });

    const { link: payedLink } = await tryGetLink({
      delayMs: 1000, attemptsCount: 10, selectData: {
        type_id: payedTypeLinkId,
        to_id: payLinkId,
      }
    });
    assert.notEqual(payedLink, undefined)
  };

  await callTests();
};

installPackage();