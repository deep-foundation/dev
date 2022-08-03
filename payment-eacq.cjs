import { tests } from "./payment-eacq-tests";

require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');
require('dotenv').config();

// import {getError} from 'tinkoff-split/init'
const {init} = require('./tinkoff-split/init');
const {getUrl, getError, _generateToken, generateToken, errorsConverter,generateTestToken, sleep} = require ('./tinkoff-split/_utils');

const { generateApolloClient } = require("@deep-foundation/hasura/client");
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const { minilinks, Link } = require('@deep-foundation/deeplinks/imports/minilinks');

const packageName = "@deep-foundation/payments-eacq";

const payInBrowser = async ({ page, browser, url }) => {
	await page.goto(url, { waitUntil: 'networkidle2' });
	await sleep(3000);
	const oldForm = await page.evaluate(() => {
		return !!document.querySelector(
			'input[automation-id="tui-input-card-grouped__card"]'
		);
	});
	if (oldForm) {
		console.log('OLD FORM!!!!!!!');
		// Старая форма используется на тестовом сервере
		const cvc1 = await page.evaluate(() => {
			return !!document.querySelector(
				'button[automation-id="pay-card__submit"]'
			);
		});
		if (cvc1) {
			await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__card"]',
				process.env.PAYMENT_TEST_CARD_NUMBER_SUCCESS
			); // card number
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__expire"]',
				process.env.PAYMENT_TEST_CARD_EXPDATE
			); // expired date
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__cvc"]',
				process.env.PAYMENT_TEST_CARD_CVC
			); // CVC code
			await sleep(300);
			await page.click('button[automation-id="pay-card__submit"]'); // submit button
		} else {
			await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__card"]',
				process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS
			); // card number
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__expire"]',
				process.env.PAYMENT_E2C_CARD_EXPDATE
			); // expired date
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__cvc"]',
				process.env.PAYMENT_E2C_CARD_CVC
			); // CVC code
			await sleep(300);
			await page.click('button[automation-id="pay-wallet__submit"]'); // submit button
			await sleep(300);
			await page.waitFor('input[name="password"]');
			const code = prompt('enter code ');
			console.log('code', code);
			await page.type('input[name="password"]', code);
			await sleep(1000);
		}
		// TODO: пока старая форма вызывалась только на тестовой карте, где ввод смс кода не нужен
		await sleep(1000);
	} else {
		console.log('NEW FORM!!!!!!!');
		await page.type('#pan', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
		await page.type('#expDate', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
		await page.type('#card_cvc', process.env.PAYMENT_E2C_CARD_CVC); // CVC code
		await page.click('button[type=submit]'); // submit button
		await page.waitFor('input[name="password"]');
		const code = prompt('enter code ');
		console.log('code', code);
		await page.type('input[name="password"]', code);
		await sleep(3000);
	}
	await browser.close();
};

const f = async () => {
    const apolloClient = generateApolloClient({
        path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
        ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost') ? false : true,
        // admin token in prealpha deep secret key
        // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
    });
    
    const unloginedDeep = new DeepClient({ apolloClient });
    
    const sendInit = async (noTokenData) => {
        const options = {
            ...noTokenData,
            Token: generateToken(noTokenData),
        };
    
        return init(options);
    };
    
    const guest = await unloginedDeep.guest();
    const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
    const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
    const deep = new DeepClient({ deep: guestDeep, ...admin });


    const User = await deep.id('@deep-foundation/core', 'User');
    const Type = await deep.id('@deep-foundation/core', 'Type');
    const Any = await deep.id('@deep-foundation/core', 'Any');
    const Join = await deep.id('@deep-foundation/core', 'Join');
    const Contain = await deep.id('@deep-foundation/core', 'Contain');
    const Value = await deep.id('@deep-foundation/core', 'Value');
    const String = await deep.id('@deep-foundation/core', 'String');
    const Package = await deep.id('@deep-foundation/core', 'Package');

    const SyncTextFile = await deep.id('@deep-foundation/core', 'SyncTextFile');
    const dockerSupportsJs = await deep.id('@deep-foundation/core', 'dockerSupportsJs');
    const Handler = await deep.id('@deep-foundation/core', 'Handler');
    const HandleInsert = await deep.id('@deep-foundation/core', 'HandleInsert');
    const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');

    const Tree = await deep.id('@deep-foundation/core', 'Tree');
    const TreeIncludeNode = await deep.id('@deep-foundation/core', 'TreeIncludeNode');
    const TreeIncludeUp = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
    const TreeIncludeDown = await deep.id('@deep-foundation/core', 'TreeIncludeDown');

    const Rule = await deep.id('@deep-foundation/core', 'Rule');
    const RuleSubject = await deep.id('@deep-foundation/core', 'RuleSubject');
    const RuleObject = await deep.id('@deep-foundation/core', 'RuleObject');
    const RuleAction = await deep.id('@deep-foundation/core', 'RuleAction');
    const Selector = await deep.id('@deep-foundation/core', 'Selector');
    const SelectorInclude = await deep.id('@deep-foundation/core', 'SelectorInclude');
    const SelectorExclude = await deep.id('@deep-foundation/core', 'SelectorExclude');
    const SelectorTree = await deep.id('@deep-foundation/core', 'SelectorTree');
    const containTree = await deep.id('@deep-foundation/core', 'containTree');
    const AllowInsertType = await deep.id('@deep-foundation/core', 'AllowInsertType');
    const AllowDeleteType = await deep.id('@deep-foundation/core', 'AllowDeleteType');
    const SelectorFilter = await deep.id('@deep-foundation/core', 'SelectorFilter');
    const BoolExp = await deep.id('@deep-foundation/core', 'BoolExp');
    const usersId = await deep.id('deep', 'users');

    const BasePayment = await deep.id('@deep-foundation/payment', 'Payment');
    const BaseObject = await deep.id('@deep-foundation/payment', 'Object');
    const BaseSum = await deep.id('@deep-foundation/payment', 'Sum');
    const BasePay = await deep.id('@deep-foundation/payment', 'Pay');
    const BaseUrl = await deep.id('@deep-foundation/payment', 'Url');
    const BasePayed = await deep.id('@deep-foundation/payment', 'Payed');
    const BaseError = await deep.id('@deep-foundation/payment', 'Error');



    const { data: [{ id: packageId }] } = await deep.insert({
        type_id: Package,
        string: { data: { value: packageName } },
        in: { data: [
                {
                    type_id: Contain,
                    from_id: deep.linkId
                },
            ] },
        out: { data: [
                {
                    type_id: Join,
                    to_id: await deep.id('deep', 'users', 'packages'),
                },
                {
                    type_id: Join,
                    to_id: await deep.id('deep', 'admin'),
                },
            ] },
    });

    console.log({ packageId });

    const { data: [{ id: PPayment }] } = await deep.insert({
        type_id: BasePayment,
        from_id: Any,
        to_id: Any,
        in: { data: {
                type_id: Contain,
                from_id: packageId,
                string: { data: { value: 'Payment' } },
            } },
    });

    console.log({ PPayment: PPayment });

    const { data: [{ id: PObject }] } = await deep.insert({
        type_id: BaseObject,
        from_id: PPayment,
        to_id: Any,
        in: { data: {
                type_id: Contain,
                from_id: packageId,
                string: { data: { value: 'Object' } },
            } },
    });

    console.log({ PObject: PObject });

    const { data: [{ id: PSum }] } = await deep.insert({
        type_id: BaseSum,
        from_id: Any,
        to_id: PPayment,
        in: { data: {
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'Sum' } },
            } },
    });

    console.log({ PSum: PSum });

    const { data: [{ id: PPay }] } = await deep.insert({
        type_id: BasePay,
        from_id: Any,
        to_id: PSum,
        in: { data: {
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'Pay' } },
            } },
    });

    console.log({ PPay: PPay });

    const { data: [{ id: PUrl }] } = await deep.insert({
        type_id: BaseUrl,
        from_id: Any,
        to_id: PPay,
        in: { data: {
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'Url' } },
            } },
    });

    console.log({ PUrl: PUrl });

    const { data: [{ id: PPayed }] } = await deep.insert({
        type_id: BasePayed,
        from_id: Any,
        to_id: PUrl,
        in: { data: {
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'Payed' } },
            } },
    });

    console.log({ PPayed: PPayed });

    const { data: [{ id: PError }] } = await deep.insert({
        type_id: BaseError,
        from_id: Any,
        to_id: PPay,
        in: { data: {
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'Error' } },
            } },
    });

    console.log({ PError: PError });

    const { data: [{ id: paymentTreeId }] } = await deep.insert({
        type_id: Tree,
        in: { data: {
                type_id: Contain,
                from_id: packageId,
                string: { data: { value: 'paymentTree' } },
            } },
        out: { data: [
                {
                    type_id: TreeIncludeNode,
                    to_id: PPayment,
                },
                {
                    type_id: TreeIncludeUp,
                    to_id: PSum,
                },
                {
                    type_id: TreeIncludeDown,
                    to_id: PObject,
                },
                {
                    type_id: TreeIncludeUp,
                    to_id: PError,
                },
                {
                    type_id: TreeIncludeUp,
                    to_id: PPayed,
                },
                {
                    type_id: TreeIncludeUp,
                    to_id: PPay,
                },
                {
                    type_id: TreeIncludeUp,
                    to_id: PUrl,
                },
            ] },
    });

    const { data: [{ id: PSumProvider }] } = await deep.insert({
      type_id: Type,
      from_id: Any,
      to_id: Any,
      in: { data: {
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'SumProvider' } },
      } },
    });
  
    console.log({ PSumProvider: PSumProvider });
  
    const { data: [{ id: PTinkoffProvider }] } = await deep.insert({
      type_id: Type,
      from_id: Any,
      to_id: Any,
      in: { data: {
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'TinkoffProvider' } },
      } },
    });

    console.log({ PTinkoffProvider: PTinkoffProvider });

    // Handlers

    const insertHandlerDependencies = `
        const crypto = require('crypto');
        const axios = require('axios');
        const errorsConverter = ${errorsConverter};
        const getError = ${getError};
        const getUrl = ${getUrl};
        const _generateToken = ${_generateToken};
        const generateTestToken = ${generateTestToken}; 
        const init = ${init};
        const sendInit = ${sendInit};
        `

    const payInsertHandler = async ({ _, data: { newLink: payLink } }) => {
      const { data: [{id: paymentId}, {value: {value: sum}}] }  = await deep.select({
        _by_path_item: { item_id: { _eq: payLink.id }, group_id: { _eq: paymentTreeId } },
      });
      console.log('paymentId', paymentId);
      console.log('sum', sum);
        const options = {
            TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
            Amount: 5500,
            Receipt: {
            Items: [{
                Name: 'Test item',
                Price: sum,
                Quantity: 1,
                Amount: 5500,
                PaymentMethod: 'prepayment',
                PaymentObject: 'service',
                Tax: 'none',
            }],
            Email: process.env.PAYMENT_TEST_EMAIL,
            Phone: process.env.PAYMENT_TEST_PHONE,
            Taxation: 'usn_income',
            },
        };

        const initResult = await await sendInit({
            ...options,
            OrderId: paymentId,
            CustomerKey: deep.linkId,
            PayType: 'T',
        });

        if(initResult.error != undefined) { 
            console.log('initResult.error:', initResult.error);
            const { data: [{ id: error }] } = await deep.insert({
                type_id: PError,
                to_id: payLink.id,
                string: { data: { value: initResult.error } },
              });
              
            console.log({error});
        } else {
            console.log('Payment URL:', initResult.response.PaymentURL);
            const { data: [{ id: url }] } = await deep.insert({
              type_id: PUrl,
              to_id: payLink.id,
              string: { data: { value: initResult.response.PaymentURL } },
            });
            console.log({url})
        }
        
        return initResult;
      };



    const { data: [{ id: payInsertHandlerId }] } = await deep.insert({
        type_id: SyncTextFile,
        in: { data: [{
                type_id: Contain,
                from_id: packageId, // before created package
                string: { data: { value: 'joinInsertHandlerFile' } },
            }, {
                from_id: dockerSupportsJs,
                type_id: Handler,
                in: { data: [{
                        type_id: Contain,
                        from_id: packageId, // before created package
                        string: { data: { value: 'joinInsertHandler' } },
                    }, {
                        type_id: HandleInsert,
                        from_id: PPay,
                        in: { data: [{
                                type_id: Contain,
                                from_id: packageId, // before created package
                                string: { data: { value: 'joinInsertHandle' } },
                            }] },
                    }] },
            }] },
        string: { data: { value: insertHandlerDependencies+payInsertHandler.toString()
            .replace('process.env.PAYMENT_TEST_TERMINAL_KEY', process.env.PAYMENT_TEST_TERMINAL_KEY)
            .replace('process.env.PAYMENT_TEST_EMAIL', process.env.PAYMENT_TEST_EMAIL)
            .replace('process.env.PAYMENT_TEST_PHONE', process.env.PAYMENT_TEST_PHONE) } },
    });

    console.log({ payInsertHandlerId });

    {
        	// Tests

	// Setup

	const Type = await deep.id('@deep-foundation/core', 'Type');
	const Any = await deep.id('@deep-foundation/core', 'Any');

	const {
		data: [{ id: Product }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
	});

	console.log({ Product });

	// Types

	const PPayment = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Payment'
	);
	const PObject = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Object'
	);
	const PSum = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Sum'
	);
	const PPay = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Pay'
	);
	const PUrl = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Url'
	);
	const PPayed = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Payed'
	);
	const PError = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Error'
	);

  
  const paymentTreeId =  await deep.id(packageName, 'paymentTreeId');

	// Init

	const testInit = async () => {
		const {
			data: [{ id: paymentId }],
		} = await deep.insert({
			type_id: PPayment,
		});

		const {
			data: [{ id: sumId }],
		} = await deep.insert({
			type_id: PSum,
			from_id: deep.linkId,
			to_id: paymentId,
		});

		console.log({ sum: sumId });

		const {
			data: [{ id: productId }],
		} = await deep.insert({
			type_id: Product,
		});

		console.log({ product: productId });

		const {
			data: [{ id: objectId }],
		} = await deep.insert({
			type_id: PObject,
			from_id: paymentId,
			to_id: productId,
		});

		console.log({ object: objectId });


		const {
			data: [{ id: payId }],
		} = await deep.insert({
			type_id: PPay,
			from_id: deep.linkId,
			to_id: sumId,
		});

		console.log({ pay: payId });

		sleep(5000);

    const payIdChildrenMp = await deep.select({
      _by_path_item: { item_id: { _eq: payId }, group_id: { _eq: paymentTreeId } },
    })

    if(payIdChildrenMp.error) {
        console.log('payIdChildrenMp.error:', payIdChildrenMp.error);
    } else {
        console.log('payIdChildrenMp.data', payIdChildrenMp.data)
    }
	};

	await testInit();

	// Confirm

	// const testConfirm = async () => {
	// 	const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
	// 	const page = await browser.newPage();

	// 	await payInBrowser({
	// 		browser,
	// 		page,
	// 		url: initResult.response.PaymentURL,
	// 	});

	// await testConfirm();
    }
};

f();

