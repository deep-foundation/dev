require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');
import dotenv from 'dotenv';
import { generateApolloClient } from '@deep-foundation/hasura/client';
import { DeepClient } from '@deep-foundation/deeplinks/imports/client';
import puppeteer from 'puppeteer';
var myEnv = dotenv.config();
import { payInBrowser } from "./payInBrowser.cjs";
import { sleep } from "../../sleep.cjs";
import fs from 'fs';
import { default as assert } from 'assert';
import { createSerialOperation } from '../../../packages/deeplinks/imports/gql';


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
  const dockerSupportsJsLinkId = await deep.id(
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

  const {
    data: [{ id: notificationUrlLinkId }],
  } = await deep.insert({
    type_id: typeTypeLinkId,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: packageLinkId,
        string: { data: { value: 'NotificationUrl' } },
      },
    },
    out: {
      data: {
        type_id: valueTypeLinkId,
        to_id: stringTypeLinkId,
        in: {
          data: [
            {
              type_id: containTypeLinkId,
              from_id: packageLinkId,
              string: { data: { value: 'TypeOfValueOfNotificationUrl' } },
            },
          ],
        },
      }
    }
  });

  const {
    data: [{ id: usesNotificationUrlLinkId }],
  } = await deep.insert({
    type_id: typeTypeLinkId,
    in: {
      data: {
        type_id: containTypeLinkId,
        from_id: packageLinkId,
        string: { data: { value: 'UsesNotificationUrl' } },
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
        value: fs.readFileSync('./deep-packages/payments/tinkoff/payInsertHandler.ts', { encoding: 'utf-8' }),
      },
    },
    in: {
      data: [
        {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: "PayInsertHandlerCode" } },
        },
        {
          from_id: await deep.id("@deep-foundation/core", "dockerSupportsJs"),
          type_id: await deep.id("@deep-foundation/core", "Handler"),
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: packageLinkId,
                string: { data: { value: "PayInsertHandler" } },
              },
              {
                type_id: await deep.id("@deep-foundation/core", "HandleInsert"),
                from_id: payTypeLinkId,
                in: {
                  data: [
                    {
                      type_id: containTypeLinkId,
                      from_id: packageLinkId,
                      string: { data: { value: "HandlePayInsert" } },
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
              from_id: packageLinkId
            }
          }
        }
      }),
      createSerialOperation({
        table: 'strings',
        type: 'insert',
        objects: {
          link_id: syncTextFileLinkId,
          value: fs.readFileSync('./deep-packages/payments/tinkoff/tinkoffNotificationHandler.ts', { encoding: 'utf-8' })
        }
      }),
      createSerialOperation({
        table: 'links',
        type: 'insert',
        objects: {
          id: handlerLinkId,
          type_id: handlerTypeLinkId,
          from_id: dockerSupportsJsLinkId,
          to_id: syncTextFileLinkId,
          in: {
            data: {
              type_id: containTypeLinkId,
              from_id: packageLinkId
            }
          }
        }
      }),
    ]
  });

};

installPackage();

async function callTests({deep}){

    const route = 'payments/tinkoff/c2b';
    const port = 5237;
    const ownerLinkId = deep.linkId;
    
    const reservedIds = await deep.reserve(16);
    
    const routeLinkId = reservedIds.pop();
    const routerStringUseLinkId = reservedIds.pop();
    const routerLinkId = reservedIds.pop();
    const portLinkId = reservedIds.pop();

    const handlerLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b")
    const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");
    const routeTypeLinkId = await deep.id("@deep-foundation/core", "Route");
    const routerTypeLinkId = await deep.id("@deep-foundation/core", "Router");
    const portTypeLinkId = await deep.id("@deep-foundation/core", "Port");
    const routerStringUseTypeLinkId = await deep.id("@deep-foundation/core", "RouterStringUse");
    const routerListeningTypeLinkId = await deep.id("@deep-foundation/core", "RouterListening");
    const syncTextFileTypeLinkId = await deep.id("@deep-foundation/core", "SyncTextFile");

    const storageBusinessTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageBusiness");
    const terminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalPassword");
    const usesTerminalPasswordTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalPassword");
    const terminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalKey");
    const usesTerminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "UsesTerminalKey");
    const paymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
    const sumTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
    const paymentObjectTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "PaymentObject");
    const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
    const payedTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed");
    const urlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
    
    await deep.serial({
      operations: [
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            id: routeLinkId,
            type_id: routeTypeLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            type_id: await deep.id("@deep-foundation/core", "HandleRoute"),
            from_id: routeLinkId,
            to_id: handlerLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            id: routerLinkId,
            type_id: routerTypeLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            id: routerStringUseLinkId,
            type_id: routerStringUseTypeLinkId,
            from: routeLinkId,
            to_id: routerLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
        createSerialOperation({
          table: 'strings',
          type: 'insert',
          objects: {
            link_id: routerStringUseLinkId,
            value: route
          }
        }),
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            id: portLinkId,
            type_id: portTypeLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
        createSerialOperation({
          table: 'numbers',
          type: 'insert',
          objects: {
            link_id: portLinkId,
            value: port
          }
        }),
        createSerialOperation({
          table: 'links',
          type: 'insert',
          objects: {
            type_id: routerListeningTypeLinkId,
            from_id: routerLinkId,
            to_id: portLinkId,
            in: {
              data: {
                type_id: containTypeLinkId,
                from_id: ownerLinkId
              }
            },
          }
        }),
      ]
    });

    const TEST_PRICE = 5500;

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
        from_id: deep.linkId,
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
  
}