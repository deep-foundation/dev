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

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const { payInBrowser } = require("./deep-packages/payments/tinkoff/payInBrowser.cjs");
const { getError } = require("./deep-packages/payments/tinkoff/getError.cjs");
const { init } = require("./deep-packages/payments/tinkoff/init.cjs");
const { cancel } = require("./deep-packages/payments/tinkoff/cancel.cjs");
const { confirm } = require("./deep-packages/payments/tinkoff/confirm.cjs");
const { handlersDependencies } = require("./deep-packages/payments/tinkoff/handlersDependencies.cjs");
const { insertTinkoffCancellingPayInsertHandler } = require("./deep-packages/payments/tinkoff/cancelling/insertTinkoffCancellingPayInsertHandler.cjs");
const { insertTinkoffCancellingNotificationHandler } = require("./deep-packages/payments/tinkoff/cancelling/insertTinkoffCancellingNotificationHandler.cjs");
const fs = require('fs')

console.log("Installing @deep-foundation/payments-tinkoff-c2b-cancelling package");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requiredEnvVariableNames = [
  "PAYMENTS_C2B_TERMINAL_KEY",
  "PAYMENTS_C2B_TERMINAL_PASSWORD",
  "PAYMENTS_C2B_URL",
  "PAYMENTS_C2B_NOTIFICATION_ROUTE",
  "PAYMENTS_C2B_NOTIFICATION_PORT",
  "PAYMENTS_C2B_NOTIFICATION_URL",
  "PAYMENTS_C2B_CANCELLING_NOTIFICATION_PORT",
  "PAYMENTS_C2B_CANCELLING_NOTIFICATION_URL",
  "PAYMENTS_C2B_CARD_NUMBER_SUCCESS",
  "PAYMENTS_C2B_CARD_EXPDATE",
  "PAYMENTS_C2B_CARD_CVC",
  "PAYMENTS_C2B_PHONE_NUMBER",
  "PAYMENTS_C2B_EMAIL",
  ];
  
  for (const requiredEnvVariableName of requiredEnvVariableNames) {
    if(!process.env[requiredEnvVariableName]) {
      throw new Error(`The environment variable ${requiredEnvVariableName} is required. All the required environment variables: \n${requiredEnvVariableNames.join("\n")}`);
    }
  }

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

    const userTypeLinkId = await deep.id('@deep-foundation/core', 'User');
    const typeTypeLinkId = await deep.id('@deep-foundation/core', 'Type');
    const anyTypeLinkId = await deep.id('@deep-foundation/core', 'Any');
    const joinTypeLinkId = await deep.id('@deep-foundation/core', 'Join');
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    const Value = await deep.id('@deep-foundation/core', 'Value');
    const String = await deep.id('@deep-foundation/core', 'String');
    const packageTypeLinkId = await deep.id('@deep-foundation/core', 'Package');

    const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');
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

    const Tree = await deep.id('@deep-foundation/core', 'Tree');
    const TreeIncludeNode = await deep.id(
      '@deep-foundation/core',
      'TreeIncludeNode'
    );
    const treeIncludeUpTypeLinkId = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
    const TreeIncludeDown = await deep.id(
      '@deep-foundation/core',
      'TreeIncludeDown'
    );

    const Rule = await deep.id('@deep-foundation/core', 'Rule');
    const RuleSubject = await deep.id('@deep-foundation/core', 'RuleSubject');
    const RuleObject = await deep.id('@deep-foundation/core', 'RuleObject');
    const RuleAction = await deep.id('@deep-foundation/core', 'RuleAction');
    const Selector = await deep.id('@deep-foundation/core', 'Selector');
    const SelectorInclude = await deep.id(
      '@deep-foundation/core',
      'SelectorInclude'
    );
    const SelectorExclude = await deep.id(
      '@deep-foundation/core',
      'SelectorExclude'
    );
    const SelectorTree = await deep.id('@deep-foundation/core', 'SelectorTree');
    const containTree = await deep.id('@deep-foundation/core', 'containTree');
    const AllowInsertType = await deep.id(
      '@deep-foundation/core',
      'AllowInsertType'
    );
    const AllowDeleteType = await deep.id(
      '@deep-foundation/core',
      'AllowDeleteType'
    );
    const SelectorFilter = await deep.id(
      '@deep-foundation/core',
      'SelectorFilter'
    );
    const Query = await deep.id('@deep-foundation/core', 'Query');
    const usersId = await deep.id('deep', 'users');

    const {
      data: [{ id: packageLinkId }],
    } = await deep.insert({
      type_id: packageTypeLinkId,
      string: { data: { value: '@deep-foundation/payments-tinkoff-c2b-cancelling' } },
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

    console.log({ packageId: packageLinkId });

    const sumProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "SumProvider");
    console.log({ sumProviderTypeLinkId });

    const tinkoffProviderTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
    console.log({ tinkoffProviderTypeLinkId });

    const paymentTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
    console.log({ paymentTypeLinkId });

    const objectTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Object");
    console.log({ objectTypeLinkId });

    const sumTypeid = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
    console.log({ sumTypeid });

    const payTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
    console.log({ payTypeLinkId });

    const {
      data: [{ id: cancellingPayTypeLinkId }],
    } = await deep.insert({
      type_id: /* Pay */ typeTypeLinkId,
      from_id: userTypeLinkId,
      to_id: sumTypeid,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'CancellingPay' } },
        },
      },
    });
    console.log({ cancellingPayTypeLinkId });

    const urlTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
    console.log({ urlTypeLinkId });

    const payedTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed");
    console.log({ payedTypeLinkId });

    const errorTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error");
    console.log({ errorTypeLinkId });

    const paymentTreeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree");
    console.log({ paymentTreeId });

    const storageBusinessTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageBusiness");
    console.log({ storageBusinessTypeLinkId });


    const terminalKeyTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TerminalKey");
    console.log({ terminalKeyTypeLinkId: terminalKeyTypeLinkId });

    const storageClientTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
    console.log({ storageClientTypeLinkId });

    const storageClientTitleTypeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClientTitle");
    console.log({ titleTypeLinkId: storageClientTitleTypeLinkId });

    const {
      data: [{ id: cancellingPaymentTypeLinkId }],
    } = await deep.insert({
      type_id: typeTypeLinkId,
      from_id: paymentTypeLinkId,
      to_id: userTypeLinkId,
      in: {
        data: {
          type_id: containTypeLinkId,
          from_id: packageLinkId,
          string: { data: { value: 'CancellingPayment' } },
        },
      },
    });
    console.log({ cancellingPaymentTypeLinkId });

    await deep.insert({
      type_id: treeIncludeUpTypeLinkId,
      from_id: paymentTreeId,
      to_id: cancellingPaymentTypeLinkId,
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });

    await deep.insert({
      type_id: treeIncludeUpTypeLinkId,
      from_id: paymentTreeId,
      to_id: cancellingPayTypeLinkId,
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log("Before insert handler")

    await deep.insert({
      type_id: await deep.id("@deep-foundation/core", "SyncTextFile"),
      string: {
        data: {
          value: fs.readFileSync('./deep-packages/payments/tinkoff/cancelling/cancellingPayInsertHandler.js', {encoding: 'utf-8'}),
        },
      },
      in: {
        data: [
          {
            type_id: containTypeLinkId,
            from_id: packageLinkId,
            string: { data: { value: "CancellingPayInsertHandlerCode" } },
          },
          {
            from_id: await deep.id("@deep-foundation/core", "dockerSupportsJs"),
            type_id: await deep.id("@deep-foundation/core", "Handler"),
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: packageLinkId, 
                  string: { data: { value: "CancellingPayInsertHandler" } },
                },
                {
                  type_id: await deep.id("@deep-foundation/core", "HandleInsert"),
                  from_id: payTypeLinkId,
                  in: {
                    data: [
                      {
                        type_id: containTypeLinkId,
                        from_id: packageLinkId, 
                        string: { data: { value: "HandleCancellingPay" } },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    })

    await deep.insert({
      type_id: await deep.id('@deep-foundation/core', 'Port'),
      number: { data: { value: process.env.PAYMENTS_C2B_CANCELLING_NOTIFICATION_PORT } },
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
              string: { data: { value: process.env.PAYMENTS_C2B_CANCELLING_NOTIFICATION_ROUTE } },
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
                        value: fs.readFileSync('./deep-packages/payments/tinkoff/cancelling/notificationHandler.js', {encoding: 'utf-8'}),
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
        const testInit = async () => {
          const initOptions = {
            TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
            OrderId: uniqid(),
            Amount: PRICE,
            Description: 'Test shopping',
            CustomerKey: deep.linkId,
            Language: 'ru',
            Recurrent: 'Y',
            DATA: {
              Email: process.env.PAYMENTS_C2B_EMAIL,
              Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
            },
            // Receipt: {
            // 	Items: [{
            // 		Name: 'Test item',
            // 		Price: PRICE,
            // 		Quantity: 1,
            // 		Amount: PRICE,
            // 		PaymentMethod: 'prepayment',
            // 		PaymentObject: 'service',
            // 		Tax: 'none',
            // 	}],
            // 	Email: process.env.PAYMENTS_C2B_EMAIL,
            // 	Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
            // 	Taxation: 'usn_income',
            // },
          };

          const initResult = await init(initOptions);

          expect(initResult.error).to.equal(undefined);

          return initResult;
        };

        const testConfirm = async () => {
          const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
          const page = await browser.newPage();

          const initOptions = {
            TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
            Amount: PRICE,
            OrderId: uniqid(),
            CustomerKey: deep.linkId,
            PayType: 'T',
            // Receipt: {
            // 	Items: [{
            // 		Name: 'Test item',
            // 		Price: PRICE,
            // 		Quantity: 1,
            // 		Amount: PRICE,
            // 		PaymentMethod: 'prepayment',
            // 		PaymentObject: 'service',
            // 		Tax: 'none',
            // 	}],
            // 	Email: process.env.PAYMENTS_C2B_EMAIL,
            // 	Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
            // 	Taxation: 'usn_income',
            // },
          };

          const initResult = await init(initOptions);

          await payInBrowser({
            browser,
            page,
            url: initResult.response.PaymentURL,
          });

          const confirmOptions = {
            TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
            PaymentId: initResult.response.PaymentId,
          };

          const confirmResult = await confirm(confirmOptions);

          expect(confirmResult.error).to.equal(undefined);
          expect(confirmResult.response.Status).to.equal('CONFIRMED');

          return confirmResult;
        };

        const testCancel = async () => {
          console.log('testCancel-start');
          const testCancelAfterPayBeforeConfirmFullPrice = async () => {
            console.log('testCanselAfterPayBeforeConfirmFullPrice-start');
            const initOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              OrderId: uniqid(),
              CustomerKey: deep.linkId,
              PayType: 'T',
              Amount: PRICE,
              Description: 'Test shopping',
              Language: 'ru',
              Recurrent: 'Y',
              DATA: {
                Email: process.env.PAYMENTS_C2B_EMAIL,
                Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
              },
              // Receipt: {
              // 	Items: [{
              // 		Name: 'Test item',
              // 		Price: sum,
              // 		Quantity: 1,
              // 		Amount: PRICE,
              // 		PaymentMethod: 'prepayment',
              // 		PaymentObject: 'service',
              // 		Tax: 'none',
              // 	}],
              // 	Email: process.env.PAYMENTS_C2B_EMAIL,
              // 	Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
              // 	Taxation: 'usn_income',
              // }
            };

            console.log({ initOptions });

            let initResult = await init(initOptions);

            console.log({ initResult });

            expect(initResult.error).to.equal(undefined);

            const url = initResult.response.PaymentURL;

            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();

            await payInBrowser({
              browser,
              page,
              url,
            });

            const bankPaymentId = initResult.response.PaymentId;

            const cancelOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              PaymentId: bankPaymentId,
              Amount: PRICE,
            };

            console.log({ cancelOptions });

            const cancelResult = await cancel(cancelOptions);

            console.log({ cancelResult });

            expect(cancelResult.error).to.equal(undefined);
            expect(cancelResult.response.Status).to.equal('REVERSED');
            console.log('testCanselAfterPayBeforeConfirmFullPrice-end');
          };

          const testCancelAfterPayBeforeConfirmCustomPriceX2 = async () => {
            console.log('testCanselAfterPayBeforeConfirmCustomPriceX2-start');
            const initOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              OrderId: uniqid(),
              CustomerKey: deep.linkId,
              PayType: 'T',
              Amount: PRICE,
              Description: 'Test shopping',
              Language: 'ru',
              Recurrent: 'Y',
              DATA: {
                Email: process.env.PAYMENTS_C2B_EMAIL,
                Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
              },
              // Receipt: {
              // 	Items: [{
              // 		Name: 'Test item',
              // 		Price: sum,
              // 		Quantity: 1,
              // 		Amount: PRICE,
              // 		PaymentMethod: 'prepayment',
              // 		PaymentObject: 'service',
              // 		Tax: 'none',
              // 	}],
              // 	Email: process.env.PAYMENTS_C2B_EMAIL,
              // 	Phone: process.env.PAYMENTS_C2B_PHONE_NUMBER,
              // 	Taxation: 'usn_income',
              // }
            };

            console.log({ initOptions });

            let initResult = await init(initOptions);

            console.log({ initResult });

            expect(initResult.error).to.equal(undefined);

            const url = initResult.response.PaymentURL;

            const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
            const page = await browser.newPage();
            await payInBrowser({
              browser,
              page,
              url,
            });

            const bankPaymentId = initResult.response.PaymentId;

            const cancelOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              PaymentId: bankPaymentId,
              Amount: Math.floor(PRICE / 3),
            };

            console.log({ cancelOptions });

            {
              const cancelResult = await cancel(cancelOptions);

              console.log({ cancelResult });

              expect(cancelResult.error).to.equal(undefined);
              expect(cancelResult.response.Status).to.equal('PARTIAL_REVERSED');
            }
            {
              const cancelResult = await cancel(cancelOptions);

              console.log({ cancelResult });

              expect(cancelResult.error).to.equal(undefined);
              expect(cancelResult.response.Status).to.equal('PARTIAL_REVERSED');
            }
            console.log('testCanselAfterPayBeforeConfirmCustomPriceX2-end');
          };

          const testCancelAfterPayAfterConfirmFullPrice = async () => {
            console.log('testCancelAfterPayAfterConfirmFullPrice-start');
            const confirmResult = await testConfirm();
            console.log({ confirmResult });

            const bankPaymentId = confirmResult.response.PaymentId;
            console.log({ bankPaymentId });

            const cancelOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              PaymentId: bankPaymentId,
              Amount: PRICE,
            };
            console.log({ cancelOptions });

            const cancelResult = await cancel(cancelOptions);

            expect(cancelResult.error).to.equal(undefined);
            expect(cancelResult.response.Status).to.equal('REFUNDED');
            console.log('testCancelAfterPayAfterConfirmFullPrice-end');
          };

          const testCancelAfterPayAfterConfirmCustomPriceX2 = async () => {
            console.log('testCancelAfterPayAfterConfirmCustomPriceX2-start');
            const confirmResult = await testConfirm();

            const bankPaymentId = confirmResult.response.PaymentId;

            const cancelOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              PaymentId: bankPaymentId,
              Amount: Math.floor(PRICE / 3),
            };

            console.log({ cancelOptions });

            {
              const cancelResult = await cancel(cancelOptions);

              expect(cancelResult.error).to.equal(undefined);
              expect(cancelResult.response.Status).to.equal('PARTIAL_REFUNDED');
            }
            {
              const cancelResult = await cancel(cancelOptions);

              expect(cancelResult.error).to.equal(undefined);
              expect(cancelResult.response.Status).to.equal('PARTIAL_REFUNDED');
            }
            console.log('testCancelAfterPayAfterConfirmCustomPriceX2-end');
          };

          const testCancelBeforePay = async () => {
            console.log('testCancelBeforePay-start');
            const initResult = await testInit();

            const bankPaymentId = initResult.response.PaymentId;;

            const cancelOptions = {
              TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
              PaymentId: bankPaymentId,
              Amount: PRICE,
            };

            console.log({ cancelOptions });

            const cancelResult = await cancel(cancelOptions);

            expect(cancelResult.error).to.equal(undefined);
            expect(cancelResult.response.Status).to.equal('CANCELED');
            console.log('testCancelBeforePay-end');
          };
          await testCancelAfterPayBeforeConfirmFullPrice();
          await testCancelAfterPayBeforeConfirmCustomPriceX2();
          await testCancelAfterPayAfterConfirmFullPrice();
          await testCancelAfterPayAfterConfirmCustomPriceX2();
          await testCancelBeforePay();

          console.log('testCancel-end');
        };

        await testInit();
        await testConfirm();
        await testCancel();
      };

      const callIntegrationTests = async () => {

        const createdLinkIds = [];

        const {
          data: [{ id: tinkoffProviderId }],
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
        console.log({ tinkoffProviderId });
        createdLinkIds.push(tinkoffProviderId);
        allCreatedLinkIds.push(tinkoffProviderId);

        const {
          data: [{ id: sumProviderId }],
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
        console.log({ sumProviderId });
        createdLinkIds.push(sumProviderId);
        allCreatedLinkIds.push(sumProviderId);

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
        console.log({ storageBusinessId: storageBusinessLinkId });
        createdLinkIds.push(storageBusinessLinkId);
        allCreatedLinkIds.push(storageBusinessLinkId);

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
          data: [{ id: tokenId }],
        } = await deep.insert({
          type_id: terminalKeyTypeLinkId,
          from_id: storageBusinessLinkId,
          to_id: storageBusinessLinkId,
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
        console.log({ tokenId });
        createdLinkIds.push(tokenId);
        allCreatedLinkIds.push(tokenId);

        const {
          data: [{ id: Product }],
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
        console.log({ Product });
        createdLinkIds.push(Product);
        allCreatedLinkIds.push(Product);

        const {
          data: [{ id: productId }],
        } = await deep.insert({
          type_id: Product,
          in: {
            data: [
              {
                type_id: containTypeLinkId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ productId });
        createdLinkIds.push(productId);
        allCreatedLinkIds.push(productId);

        const testInit = async () => {
          console.log('testInit-start');

          const createdLinkIds = [];

          const {
            data: [{ id: paymentId }],
          } = await deep.insert({
            type_id: paymentTypeLinkId,
            object: { data: { value: { orderId: uniqid() } } },
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
          console.log({ paymentId });
          createdLinkIds.push(paymentId);
          allCreatedLinkIds.push(paymentId);

          const {
            data: [{ id: sumId }],
          } = await deep.insert({
            type_id: sumTypeid,
            from_id: sumProviderId,
            to_id: paymentId,
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
          console.log({ sumId });
          createdLinkIds.push(sumId);
          allCreatedLinkIds.push(sumId);

          const {
            data: [{ id: objectId }],
          } = await deep.insert({
            type_id: objectTypeLinkId,
            from_id: paymentId,
            to_id: productId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ objectId });
          createdLinkIds.push(objectId);
          allCreatedLinkIds.push(objectId);

          const {
            data: [{ id: payId }],
          } = await deep.insert({
            type_id: payTypeLinkId,
            from_id: deep.linkId,
            to_id: sumId,
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ payId });
          createdLinkIds.push(payId);
          allCreatedLinkIds.push(payId);

          var urlLinkSelectQuery;
          for (let i = 0; i < 10; i++) {
            urlLinkSelectQuery = await deep.select({
              type_id: urlTypeLinkId,
              to_id: payId,
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
          expect(payLink).to.not.equal(undefined);

          var payedLinkSelectQuery;
          for (let i = 0; i < 30; i++) {
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

        const callCancelTests = async () => {
          console.log('testCancel-start');
          const testCancelAfterPayAfterConfirmFullPrice = async () => {
            console.log('testCancelAfterPayAfterConfirmFullPrice-start');
            const { createdLinks } = await testConfirm();

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeLinkId);
            console.log({ paymentLink });

            const cancellingPaymentLinkInsertQuery = await deep.insert({
              type_id: cancellingPaymentTypeLinkId,
              from_id: paymentLink.id,
              to_id: deep.linkId,
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPaymentLinkInsertQuery.error.message); }
            const cancellingPaymentId = cancellingPaymentLinkInsertQuery.data[0].id;
            console.log({ cancellingPaymentId });
            createdLinkIds.push(cancellingPaymentId);
            allCreatedLinkIds.push(cancellingPaymentId);

            const sumLinkOfCancellingPaymentQuery = await deep.insert({
              type_id: sumTypeid,
              from_id: sumProviderId,
              to_id: cancellingPaymentId,
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
            if (sumLinkOfCancellingPaymentQuery.error) { throw new errorTypeLinkId(sumLinkOfCancellingPaymentQuery.error.message); }
            const sumLinkIdOfCancellingPayment = sumLinkOfCancellingPaymentQuery.data[0].id;
            console.log({ sumLinkIdOfCancellingPayment });
            createdLinkIds.push(sumLinkIdOfCancellingPayment);
            allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

            const cancellingPayLinkInsertQuery = await deep.insert({
              type_id: cancellingPayTypeLinkId,
              from_id: deep.linkId,
              to_id: sumLinkIdOfCancellingPayment,
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPayLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPayLinkInsertQuery.error.message); }
            const cancellingPayId = cancellingPayLinkInsertQuery.data[0].id;
            console.log({ cancellingPayId });
            createdLinkIds.push(cancellingPayId);
            allCreatedLinkIds.push(cancellingPayId);

            var payedLinkSelectQuery;
            for (let i = 0; i < 10; i++) {
              payedLinkSelectQuery = await deep.select({
                type_id: payedTypeLinkId,
                to_id: cancellingPayId
              });

              if (payedLinkSelectQuery.data.length > 0) {
                break;
              }

              await sleep(1000);
            }
            if (payedLinkSelectQuery.error) { throw new errorTypeLinkId(payedLinkSelectQuery.error.message); }
            const payedLink = payedLinkSelectQuery.data[0];
            expect(payedLink).to.not.equal(undefined);
            createdLinks.push(payedLink);

            createdLinks.push(...(await deep.select(createdLinkIds)).data)

            console.log('testCancelAfterPayAfterConfirmFullPrice-end');

            return {
              createdLinks
            };
          };

          const testCancelAfterPayAfterConfirmCustomPriceX2 = async () => {
            console.log('testCancelAfterPayAfterConfirmCustomPriceX2-start');
            const { createdLinks } = await testConfirm({ customerKey });

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeLinkId);
            console.log({ paymentLink });

            for (let i = 0; i < 2; i++) {
              const cancellingPaymentLinkInsertQuery = await deep.insert({
                type_id: cancellingPaymentTypeLinkId,
                from_id: paymentLink.id,
                to_id: deep.linkId,
                in: {
                  data: [
                    {
                      type_id: containTypeLinkId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPaymentLinkInsertQuery.error.message); }
              const cancellingPaymentId = cancellingPaymentLinkInsertQuery.data[0].id;
              console.log({ cancellingPaymentId });
              createdLinkIds.push(cancellingPaymentId);
              allCreatedLinkIds.push(cancellingPaymentId);

              const {
                data: [{ id: sumLinkIdOfCancellingPayment }]
              } = await deep.insert({
                type_id: sumTypeid,
                from_id: sumProviderId,
                to_id: cancellingPaymentId,
                number: { data: { value: Math.floor(PRICE / 3) } },
                in: {
                  data: [
                    {
                      type_id: containTypeLinkId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              console.log({ sumLinkIdOfCancellingPayment });
              createdLinkIds.push(sumLinkIdOfCancellingPayment);
              allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

              const cancellingPayLinkInsertQuery = await deep.insert({
                type_id: cancellingPayTypeLinkId,
                from_id: deep.linkId,
                to_id: sumLinkIdOfCancellingPayment,
                in: {
                  data: [
                    {
                      type_id: containTypeLinkId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              if (cancellingPayLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPayLinkInsertQuery.error.message); }
              const cancellingPayId = cancellingPayLinkInsertQuery.data[0].id;
              console.log({ cancellingPayId });
              createdLinkIds.push(cancellingPayId);
              allCreatedLinkIds.push(cancellingPayId);

              var payedLinkSelectQuery;
              for (let i = 0; i < 10; i++) {
                payedLinkSelectQuery = await deep.select({
                  type_id: payedTypeLinkId,
                  to_id: cancellingPayId
                });

                if (payedLinkSelectQuery.data.length > 0) {
                  break;
                }

                await sleep(1000);
              }
              if (payedLinkSelectQuery.error) { throw new errorTypeLinkId(payedLinkSelectQuery.error.message); }
              const payedLink = payedLinkSelectQuery.data[0];
              expect(payedLink).to.not.equal(undefined);
              createdLinks.push(payedLink);
            }

            createdLinks.push(...(await deep.select(createdLinkIds)).data)

            console.log({ createdLinks });

            console.log('testCancelAfterPayAfterConfirmCustomPriceX2-end');

            return {
              createdLinks
            }
          };

          const testCancelBeforePay = async () => {
            console.log('testCancelBeforePay-start');
            const { createdLinks } = await testInit({ customerKey });

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeLinkId);
            console.log({ paymentLink });

            const cancellingPaymentLinkInsertQuery = await deep.insert({
              type_id: cancellingPaymentTypeLinkId,
              from_id: paymentLink.id,
              to_id: deep.linkId,
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPaymentLinkInsertQuery.error.message); }
            const cancellingPaymentId = cancellingPaymentLinkInsertQuery.data[0].id;
            console.log({ cancellingPaymentId });
            createdLinkIds.push(cancellingPaymentId);
            allCreatedLinkIds.push(cancellingPaymentId);

            const sumLinkOfCancellingPaymentSelectQuery = await deep.insert({
              type_id: sumTypeid,
              from_id: sumProviderId,
              to_id: cancellingPaymentId,
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
            if (sumLinkOfCancellingPaymentSelectQuery.error) { throw new errorTypeLinkId(sumLinkOfCancellingPaymentSelectQuery.error.message); }
            const sumLinkIdOfCancellingPayment = sumLinkOfCancellingPaymentSelectQuery.data[0].id;
            console.log({ sumLinkIdOfCancellingPayment });
            createdLinkIds.push(sumLinkIdOfCancellingPayment);
            allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

            const cancellingPayLinkInsertQuery = await deep.insert({
              type_id: cancellingPayTypeLinkId,
              from_id: deep.linkId,
              to_id: sumLinkIdOfCancellingPayment,
              in: {
                data: [
                  {
                    type_id: containTypeLinkId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPayLinkInsertQuery.error) { throw new errorTypeLinkId(cancellingPayLinkInsertQuery.error.message); }
            const cancellingPayId = cancellingPayLinkInsertQuery.data[0].id;
            console.log({ cancellingPayId });
            createdLinkIds.push(cancellingPayId);
            allCreatedLinkIds.push(cancellingPayId);

            var payedLinkSelectQuery;
            for (let i = 0; i < 10; i++) {
              payedLinkSelectQuery = await deep.select({
                type_id: payedTypeLinkId,
                to_id: cancellingPayId
              });

              if (payedLinkSelectQuery.data.length > 0) {
                break;
              }

              await sleep(1000);
            }
            if (payedLinkSelectQuery.error) { throw new errorTypeLinkId(payedLinkSelectQuery.error.message); }
            const payedLink = payedLinkSelectQuery.data[0];
            expect(payedLink).to.not.equal(undefined);
            createdLinks.push(payedLink);

            createdLinks.push(...(await deep.select(createdLinkIds)).data)

            console.log('testCancelBeforePay-end');

            return {
              createdLinks
            };
          };

          {
            const { createdLinks } = await testCancelAfterPayAfterConfirmFullPrice();
            await deep.delete(createdLinks.map(link => link.id));
          }
          {
            const { createdLinks } = await testCancelAfterPayAfterConfirmCustomPriceX2();
            await deep.delete(createdLinks.map(link => link.id));
          }
          {
            const { createdLinks } = await testCancelBeforePay();
            await deep.delete(createdLinks.map(link => link.id));
          }

          console.log('testCancel-end');
        };

        await callCancelTests();
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