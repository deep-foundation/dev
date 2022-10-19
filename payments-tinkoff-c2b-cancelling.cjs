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
const { payInBrowser } = require("./deep-packges/payments/tinkoff/payInBrowser.cjs");
const { getError } = require("./deep-packges/payments/tinkoff/getError.cjs");
const { init } = require("./deep-packges/payments/tinkoff/init.cjs");
const { cancel } = require("./deep-packges/payments/tinkoff/cancel.cjs");
const { handlersDependencies } = require("./deep-packges/payments/tinkoff/handlersDependencies.cjs");
const { insertPayInsertHandler } = require("./deep-packges/payments/tinkoff/cancelling/insertPayInsertHandler.cjs");
const { insertNotificationHandler } = require("./deep-packges/payments/tinkoff/cancelling/insertNotificationHandler.cjs");

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

console.log("Installing @deep-foundation/payments-tinkoff-c2b-cancelling package");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const userTypeId = await deep.id('@deep-foundation/core', 'User');
    const typeTypeId = await deep.id('@deep-foundation/core', 'Type');
    const anyTypeId = await deep.id('@deep-foundation/core', 'Any');
    const joinTypeId = await deep.id('@deep-foundation/core', 'Join');
    const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
    const Value = await deep.id('@deep-foundation/core', 'Value');
    const String = await deep.id('@deep-foundation/core', 'String');
    const packageTypeId = await deep.id('@deep-foundation/core', 'Package');

    const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');
    const syncTextFileTypeId = await deep.id('@deep-foundation/core', 'SyncTextFile');
    const dockerSupportsJs = await deep.id(
      '@deep-foundation/core',
      'dockerSupportsJs'
    );
    const handleInsertTypeId = await deep.id('@deep-foundation/core', 'HandleInsert');
    const portTypeId = await deep.id('@deep-foundation/core', 'Port');
    const routerListeningTypeId = await deep.id('@deep-foundation/core', 'RouterListening');
    const routerTypeId = await deep.id('@deep-foundation/core', 'Router');
    const routerStringUseTypeId = await deep.id(
      '@deep-foundation/core',
      'RouterStringUse'
    );
    const routeTypeId = await deep.id('@deep-foundation/core', 'Route');
    const handleRouteTypeId = await deep.id(
      '@deep-foundation/core',
      'HandleRoute'
    );
    const handlerTypeId = await deep.id(
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
    const treeIncludeUpTypeId = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
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
    const usersLinkId = await deep.id('deep', 'users');

    const {
      data: [{ id: packageLinkId }],
    } = await deep.insert({
      type_id: packageTypeId,
      string: { data: { value: '@deep-foundation/payments-tinkoff-c2b' } },
      in: {
        data: [
          {
            type_id: containTypeId,
            from_id: deep.linkId,
          },
        ],
      },
      out: {
        data: [
          {
            type_id: joinTypeId,
            to_id: await deep.id('deep', 'users', 'packages'),
          },
          {
            type_id: joinTypeId,
            to_id: await deep.id('deep', 'admin'),
          },
        ],
      },
    });

    console.log({ packageLinkId });

    const sumProviderTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "SumProvider");
    console.log({ sumProviderTypeId });

    const tinkoffProviderTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
    console.log({ tinkoffProviderTypeId });

    const paymentTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
    console.log({ paymentTypeId });

    const objectTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Object");
    console.log({ objectTypeId });

    const sumTypeid = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
    console.log({ sumTypeid });

    const payTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
    console.log({ payTypeId });

    const {
      data: [{ id: cancellingPayTypeId }],
    } = await deep.insert({
      type_id: /* Pay */ typeTypeId,
      from_id: userTypeId,
      to_id: sumTypeid,
      in: {
        data: {
          type_id: containTypeId,
          from_id: packageLinkId,
          string: { data: { value: 'CancellingPay' } },
        },
      },
    });
    console.log({ cancellingPayTypeId });

    const urlTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
    console.log({ urlTypeId });

    const payedTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed");
    console.log({ payedTypeId });

    const errorTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error");
    console.log({ errorTypeId });

    const paymentTreeLinkId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree");
    console.log({ paymentTreeLinkId });

    const storageBusinessTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageBusiness");
    console.log({ storageBusinessTypeId });


    const tokenTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
    console.log({ tokenTypeId });

    const storageClientTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
    console.log({ storageClientTypeId });

    const titleTypeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
    console.log({ titleTypeId });

    const {
      data: [{ id: cancellingPaymentTypeId }],
    } = await deep.insert({
      type_id: typeTypeId,
      from_id: paymentTypeId,
      to_id: userTypeId,
      in: {
        data: {
          type_id: containTypeId,
          from_id: packageLinkId,
          string: { data: { value: 'CancellingPayment' } },
        },
      },
    });
    console.log({ cancellingPaymentTypeId });

    await deep.insert({
      type_id: treeIncludeUpTypeId,
      from_id: paymentTreeLinkId,
      to_id: cancellingPaymentTypeId,
      in: {
        data: [
          {
            type_id: containTypeId,
            from_id: deep.linkId,
          },
        ],
      },
    });

    await deep.insert({
      type_id: treeIncludeUpTypeId,
      from_id: paymentTreeLinkId,
      to_id: cancellingPayTypeId,
      in: {
        data: [
          {
            type_id: containTypeId,
            from_id: deep.linkId,
          },
        ],
      },
    });



    await insertPayInsertHandler({ containTypeId, deep, dockerSupportsJsId, handleInsertTypeId, handlerTypeId, packageId, syncTextFileTypeId, terminayKey: process.env.PAYMENTS_C2B_TERMINAL_KEY });
    await insertNotificationHandler({ deep, adminId: await deep.id('deep', 'admin'), containTypeId, fileTypeId: syncTextFileTypeId, handleRouteTypeId, handlerTypeId, notificationPort: process.env.PAYMENTS_C2B_NOTIFICATION_PORT, notificationRoute: process.env.PAYMENTS_C2B_NOTIFICATION_ROUTE, portTypeId, routerListeningTypeId, routerStringUseTypeId, routerTypeId, routeTypeId, supportsId });

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
              Phone: process.env.PAYMENTS_C2B_PHONE,
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
            // 	Phone: process.env.PAYMENTS_C2B_PHONE,
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
            // 	Phone: process.env.PAYMENTS_C2B_PHONE,
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
                Phone: process.env.PAYMENTS_C2B_PHONE,
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
              // 	Phone: process.env.PAYMENTS_C2B_PHONE,
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
                Phone: process.env.PAYMENTS_C2B_PHONE,
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
              // 	Phone: process.env.PAYMENTS_C2B_PHONE,
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
          data: [{ id: tinkoffProviderLinkId }],
        } = await deep.insert({
          type_id: tinkoffProviderTypeId,
          in: {
            data: [
              {
                type_id: containTypeId,
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
          type_id: sumProviderTypeId,
          in: {
            data: [
              {
                type_id: containTypeId,
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
          type_id: storageBusinessTypeId,
          in: {
            data: [
              {
                type_id: containTypeId,
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
          type_id: tokenTypeId,
          from_id: storageBusinessLinkId,
          to_id: storageBusinessLinkId,
          string: { data: { value: process.env.PAYMENTS_C2B_TERMINAL_KEY } },
          in: {
            data: [
              {
                type_id: containTypeId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ tokenLinkId });
        createdLinkIds.push(tokenLinkId);
        allCreatedLinkIds.push(tokenLinkId);

        const {
          data: [{ id: Product }],
        } = await deep.insert({
          type_id: typeTypeId,
          from_id: anyTypeId,
          to_id: anyTypeId,
          in: {
            data: [
              {
                type_id: containTypeId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ Product });
        createdLinkIds.push(Product);
        allCreatedLinkIds.push(Product);

        const {
          data: [{ id: productLinkId }],
        } = await deep.insert({
          type_id: Product,
          in: {
            data: [
              {
                type_id: containTypeId,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ productLinkId });
        createdLinkIds.push(productLinkId);
        allCreatedLinkIds.push(productLinkId);

        const testInit = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testInit-start');

          const createdLinkIds = [];

          const {
            data: [{ id: paymentLinkId }],
          } = await deep.insert({
            type_id: paymentTypeId,
            object: { data: { value: { orderId: uniqid() } } },
            from_id: deep.linkId,
            to_id: storageBusinessLinkId,
            in: {
              data: [
                {
                  type_id: containTypeId,
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
            type_id: sumTypeid,
            from_id: sumProviderLinkId,
            to_id: paymentLinkId,
            number: { data: { value: PRICE } },
            in: {
              data: [
                {
                  type_id: containTypeId,
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
            type_id: objectTypeId,
            from_id: paymentLinkId,
            to_id: productLinkId,
            in: {
              data: [
                {
                  type_id: containTypeId,
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
            type_id: payTypeId,
            from_id: deep.linkId,
            to_id: sumLinkId,
            in: {
              data: [
                {
                  type_id: containTypeId,
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
              type_id: urlTypeId,
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

        const testFinishAuthorize = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testFinishAuthorize-start');
          const { createdLinks } = await testInit({ customerKey });

          const urlLink = createdLinks.find(link => link.type_id === urlTypeId);
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

        const testConfirm = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testConfirm-start');
          const { createdLinks } = await testFinishAuthorize({ customerKey });

          const createdLinkIds = [];

          const payLink = createdLinks.find(link => link.type_id === payTypeId);
          expect(payLink).to.not.equal(undefined);

          var payedLinkSelectQuery;
          for (let i = 0; i < 30; i++) {
            payedLinkSelectQuery = await deep.select({
              type_id: payedTypeId,
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
          const testCancelAfterPayAfterConfirmFullPrice = async ({ customerKey } = { customerKey: uniqid() }) => {
            console.log('testCancelAfterPayAfterConfirmFullPrice-start');
            const { createdLinks } = await testConfirm({ customerKey });

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeId);
            console.log({ paymentLink });

            const cancellingPaymentLinkInsertQuery = await deep.insert({
              type_id: cancellingPaymentTypeId,
              from_id: paymentLink.id,
              to_id: deep.linkId,
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeId(cancellingPaymentLinkInsertQuery.error.message); }
            const cancellingPaymentLinkId = cancellingPaymentLinkInsertQuery.data[0].id;
            console.log({ cancellingPaymentLinkId });
            createdLinkIds.push(cancellingPaymentLinkId);
            allCreatedLinkIds.push(cancellingPaymentLinkId);

            const sumLinkOfCancellingPaymentQuery = await deep.insert({
              type_id: sumTypeid,
              from_id: sumProviderLinkId,
              to_id: cancellingPaymentLinkId,
              number: { data: { value: PRICE } },
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (sumLinkOfCancellingPaymentQuery.error) { throw new errorTypeId(sumLinkOfCancellingPaymentQuery.error.message); }
            const sumLinkIdOfCancellingPayment = sumLinkOfCancellingPaymentQuery.data[0].id;
            console.log({ sumLinkIdOfCancellingPayment });
            createdLinkIds.push(sumLinkIdOfCancellingPayment);
            allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

            const cancellingPayLinkInsertQuery = await deep.insert({
              type_id: cancellingPayTypeId,
              from_id: deep.linkId,
              to_id: sumLinkIdOfCancellingPayment,
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPayLinkInsertQuery.error) { throw new errorTypeId(cancellingPayLinkInsertQuery.error.message); }
            const cancellingPayLinkId = cancellingPayLinkInsertQuery.data[0].id;
            console.log({ cancellingPayLinkId });
            createdLinkIds.push(cancellingPayLinkId);
            allCreatedLinkIds.push(cancellingPayLinkId);

            var payedLinkSelectQuery;
            for (let i = 0; i < 10; i++) {
              payedLinkSelectQuery = await deep.select({
                type_id: payedTypeId,
                to_id: cancellingPayLinkId
              });

              if (payedLinkSelectQuery.data.length > 0) {
                break;
              }

              await sleep(1000);
            }
            if (payedLinkSelectQuery.error) { throw new errorTypeId(payedLinkSelectQuery.error.message); }
            const payedLink = payedLinkSelectQuery.data[0];
            expect(payedLink).to.not.equal(undefined);
            createdLinks.push(payedLink);

            createdLinks.push(...(await deep.select(createdLinkIds)).data)

            console.log('testCancelAfterPayAfterConfirmFullPrice-end');

            return {
              createdLinks
            };
          };

          const testCancelAfterPayAfterConfirmCustomPriceX2 = async ({ customerKey } = { customerKey: uniqid() }) => {
            console.log('testCancelAfterPayAfterConfirmCustomPriceX2-start');
            const { createdLinks } = await testConfirm({ customerKey });

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeId);
            console.log({ paymentLink });

            for (let i = 0; i < 2; i++) {
              const cancellingPaymentLinkInsertQuery = await deep.insert({
                type_id: cancellingPaymentTypeId,
                from_id: paymentLink.id,
                to_id: deep.linkId,
                in: {
                  data: [
                    {
                      type_id: containTypeId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeId(cancellingPaymentLinkInsertQuery.error.message); }
              const cancellingPaymentLinkId = cancellingPaymentLinkInsertQuery.data[0].id;
              console.log({ cancellingPaymentLinkId });
              createdLinkIds.push(cancellingPaymentLinkId);
              allCreatedLinkIds.push(cancellingPaymentLinkId);

              const {
                data: [{ id: sumLinkIdOfCancellingPayment }]
              } = await deep.insert({
                type_id: sumTypeid,
                from_id: sumProviderLinkId,
                to_id: cancellingPaymentLinkId,
                number: { data: { value: Math.floor(PRICE / 3) } },
                in: {
                  data: [
                    {
                      type_id: containTypeId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              console.log({ sumLinkIdOfCancellingPayment });
              createdLinkIds.push(sumLinkIdOfCancellingPayment);
              allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

              const cancellingPayLinkInsertQuery = await deep.insert({
                type_id: cancellingPayTypeId,
                from_id: deep.linkId,
                to_id: sumLinkIdOfCancellingPayment,
                in: {
                  data: [
                    {
                      type_id: containTypeId,
                      from_id: deep.linkId,
                    },
                  ],
                },
              });
              if (cancellingPayLinkInsertQuery.error) { throw new errorTypeId(cancellingPayLinkInsertQuery.error.message); }
              const cancellingPayLinkId = cancellingPayLinkInsertQuery.data[0].id;
              console.log({ cancellingPayLinkId });
              createdLinkIds.push(cancellingPayLinkId);
              allCreatedLinkIds.push(cancellingPayLinkId);

              var payedLinkSelectQuery;
              for (let i = 0; i < 10; i++) {
                payedLinkSelectQuery = await deep.select({
                  type_id: payedTypeId,
                  to_id: cancellingPayLinkId
                });

                if (payedLinkSelectQuery.data.length > 0) {
                  break;
                }

                await sleep(1000);
              }
              if (payedLinkSelectQuery.error) { throw new errorTypeId(payedLinkSelectQuery.error.message); }
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

          const testCancelBeforePay = async ({ customerKey } = { customerKey: uniqid() }) => {
            console.log('testCancelBeforePay-start');
            const { createdLinks } = await testInit({ customerKey });

            const createdLinkIds = [];

            const paymentLink = createdLinks.find(link => link.type_id === paymentTypeId);
            console.log({ paymentLink });

            const cancellingPaymentLinkInsertQuery = await deep.insert({
              type_id: cancellingPaymentTypeId,
              from_id: paymentLink.id,
              to_id: deep.linkId,
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPaymentLinkInsertQuery.error) { throw new errorTypeId(cancellingPaymentLinkInsertQuery.error.message); }
            const cancellingPaymentLinkId = cancellingPaymentLinkInsertQuery.data[0].id;
            console.log({ cancellingPaymentLinkId });
            createdLinkIds.push(cancellingPaymentLinkId);
            allCreatedLinkIds.push(cancellingPaymentLinkId);

            const sumLinkOfCancellingPaymentSelectQuery = await deep.insert({
              type_id: sumTypeid,
              from_id: sumProviderLinkId,
              to_id: cancellingPaymentLinkId,
              number: { data: { value: PRICE } },
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (sumLinkOfCancellingPaymentSelectQuery.error) { throw new errorTypeId(sumLinkOfCancellingPaymentSelectQuery.error.message); }
            const sumLinkIdOfCancellingPayment = sumLinkOfCancellingPaymentSelectQuery.data[0].id;
            console.log({ sumLinkIdOfCancellingPayment });
            createdLinkIds.push(sumLinkIdOfCancellingPayment);
            allCreatedLinkIds.push(sumLinkIdOfCancellingPayment);

            const cancellingPayLinkInsertQuery = await deep.insert({
              type_id: cancellingPayTypeId,
              from_id: deep.linkId,
              to_id: sumLinkIdOfCancellingPayment,
              in: {
                data: [
                  {
                    type_id: containTypeId,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            if (cancellingPayLinkInsertQuery.error) { throw new errorTypeId(cancellingPayLinkInsertQuery.error.message); }
            const cancellingPayLinkId = cancellingPayLinkInsertQuery.data[0].id;
            console.log({ cancellingPayLinkId });
            createdLinkIds.push(cancellingPayLinkId);
            allCreatedLinkIds.push(cancellingPayLinkId);

            var payedLinkSelectQuery;
            for (let i = 0; i < 10; i++) {
              payedLinkSelectQuery = await deep.select({
                type_id: payedTypeId,
                to_id: cancellingPayLinkId
              });

              if (payedLinkSelectQuery.data.length > 0) {
                break;
              }

              await sleep(1000);
            }
            if (payedLinkSelectQuery.error) { throw new errorTypeId(payedLinkSelectQuery.error.message); }
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