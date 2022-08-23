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

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const corePackageName = '@deep-foundation/core';
const basePackageName = '@deep-foundation/payments';
const packageName = '@deep-foundation/payments-eacq';

const PRICE = 5500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const payInBrowser = async ({ page, browser, url }) => {
	await page.goto(url, { waitUntil: 'networkidle2' });
	await sleep(5000);
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
			await page.waitForSelector(
				'input[automation-id="tui-input-card-grouped__card"]'
			);
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
			await page.waitForSelector(
				'input[automation-id="tui-input-card-grouped__card"]'
			);
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
			await page.waitForSelector('input[name="password"]');
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
		await page.waitForSelector('input[name="password"]');
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
		ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost')
			? false
			: true,
		// admin token in prealpha deep secret key
		// token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
	});

	const unloginedDeep = new DeepClient({ apolloClient });

	const errorsConverter = {
		7: 'Покупатель не найден',
		53: 'Обратитесь к продавцу',
		99: 'Платеж отклонен',
		100: 'Повторите попытку позже',
		101: 'Не пройдена идентификация 3DS',
		102: 'Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой',
		103: 'Повторите попытку позже',
		119: 'Превышено кол-во запросов на авторизацию',
		191: 'Некорректный статус договора, обратитесь к вашему менеджеру',
		1001: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
		1003: 'Неверный merchant ID',
		1004: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
		1005: 'Платеж отклонен банком, выпустившим карту',
		1006: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
		1007: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
		1008: 'Платеж отклонен, необходима идентификация',
		1012: 'Такие операции запрещены для этой карты',
		1013: 'Повторите попытку позже',
		1014: 'Карта недействительна. Свяжитесь с банком, выпустившим карту',
		1015: 'Попробуйте снова или свяжитесь с банком, выпустившим карту',
		1019: 'Платеж отклонен — попробуйте снова',
		1030: 'Повторите попытку позже',
		1033: 'Истек срок действия карты. Свяжитесь с банком, выпустившим карту',
		1034: 'Попробуйте повторить попытку позже',
		1038: 'Превышено количество попыток ввода ПИН-кода',
		1039: 'Платеж отклонен — счет не найден',
		1041: 'Карта утеряна. Свяжитесь с банком, выпустившим карту',
		1043: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
		1051: 'Недостаточно средств на карте',
		1053: 'Платеж отклонен — счет не найден',
		1054: 'Истек срок действия карты',
		1055: 'Неверный ПИН',
		1057: 'Такие операции запрещены для этой карты',
		1058: 'Такие операции запрещены для этой карты',
		1059: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
		1061: 'Превышен дневной лимит платежей по карте',
		1062: 'Платежи по карте ограничены',
		1063: 'Операции по карте ограничены',
		1064: 'Проверьте сумму',
		1065: 'Превышен дневной лимит транзакций',
		1075: 'Превышено число попыток ввода ПИН-кода',
		1076: 'Платеж отклонен — попробуйте снова',
		1077: 'Коды не совпадают — попробуйте снова',
		1080: 'Неверный срок действия',
		1082: 'Неверный CVV',
		1086: 'Платеж отклонен — не получилось подтвердить ПИН-код',
		1088: 'Ошибка шифрования. Попробуйте снова',
		1089: 'Попробуйте повторить попытку позже',
		1091: 'Банк, выпустивший карту недоступен для проведения авторизации',
		1092: 'Платеж отклонен — попробуйте снова',
		1093: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
		1094: 'Системная ошибка',
		1096: 'Повторите попытку позже',
		9999: 'Внутренняя ошибка системы',
	};
	const errorsConverterString = JSON.stringify(errorsConverter);
	console.log({errorsConverterString});

	const getError = (errorCode) =>
		errorCode === '0' ? undefined : errorsConverter[errorCode] || 'broken';
	const getErrorString = getError.toString();
	console.log({getErrorString});

	const _generateToken = (dataWithPassword) => {
		const dataString = Object.keys(dataWithPassword)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => dataWithPassword[key])
			.reduce((acc, item) => `${acc}${item}`, '');
		console.log({ dataString });
		const hash = crypto.createHash('sha256').update(dataString).digest('hex');
		console.log({ hash });
		return hash;
	};
	const _generateTokenString = _generateToken.toString();
	console.log({_generateTokenString});

	const generateToken = (data) => {
		const { Receipt, DATA, Shops, ...restData } = data;
		const dataWithPassword = {
			...restData,
			Password: `${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}`,
		};
		console.log({ dataWithPassword });
		return _generateToken(dataWithPassword);
	};
	const generateTokenString = generateToken.toString()
		.replace(
		"${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}",
		process.env.PAYMENT_TEST_TERMINAL_PASSWORD
	);
	console.log({ generateTokenString });

	const getUrl = (method) =>
		`${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;
	const getUrlString = getUrl.toString()
		.replace(
		"${process.env.PAYMENT_EACQ_AND_TEST_URL}",
		process.env.PAYMENT_EACQ_AND_TEST_URL
	);
	console.log({ getUrlString });

	const getMarketUrl = (method) =>
		`${process.env.PAYMENT_TINKOFF_MARKET_URL}/${method}`;

	const getState = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('GetState'),
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const checkOrder = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('CheckOrder'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const getCardList = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('GetCardList'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode || '0');

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const init = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Init'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return d;
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const confirm = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Confirm'),
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const resend = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Resend'),
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const charge = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Charge'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const addCustomer = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('AddCustomer'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const getCustomer = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('GetCustomer'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const removeCustomer = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('RemoveCustomer'),
				headers: {
					'Content-Type': 'application/json',
				},
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const getBankPaymentId = async (orderId) => {
		const checkOrderOptions = {
			TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
			OrderId: orderId,
		};

		const checkOrderResult = await checkOrder(checkOrderOptions);
		expect(checkOrderResult.error).to.equal(undefined);

		console.log({ checkOrderResponse: checkOrderResult });

		const { PaymentId: bankPaymentId } = checkOrderResult.response.Payments[0];

		console.log({ paymentId: bankPaymentId });
		return bankPaymentId;
	};

	const guest = await unloginedDeep.guest();
	const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
	const admin = await guestDeep.login({
		linkId: await guestDeep.id('deep', 'admin'),
	});
	const deep = new DeepClient({ deep: guestDeep, ...admin });

	const User = await deep.id(corePackageName, 'User');
	const Type = await deep.id(corePackageName, 'Type');
	const Any = await deep.id(corePackageName, 'Any');
	const Join = await deep.id(corePackageName, 'Join');
	const Contain = await deep.id(corePackageName, 'Contain');
	const Value = await deep.id(corePackageName, 'Value');
	const String = await deep.id(corePackageName, 'String');
	const Package = await deep.id(corePackageName, 'Package');

	const SyncTextFile = await deep.id(corePackageName, 'SyncTextFile');
	const dockerSupportsJs = await deep.id(
		corePackageName,
		'dockerSupportsJs'
	);
	const Handler = await deep.id(corePackageName, 'Handler');
	const HandleInsert = await deep.id(corePackageName, 'HandleInsert');
	const HandleDelete = await deep.id(corePackageName, 'HandleDelete');

	const Tree = await deep.id(corePackageName, 'Tree');
	const TreeIncludeNode = await deep.id(
		corePackageName,
		'TreeIncludeNode'
	);
	const TreeIncludeUp = await deep.id(corePackageName, 'TreeIncludeUp');
	const TreeIncludeDown = await deep.id(
		corePackageName,
		'TreeIncludeDown'
	);

	const Rule = await deep.id(corePackageName, 'Rule');
	const RuleSubject = await deep.id(corePackageName, 'RuleSubject');
	const RuleObject = await deep.id(corePackageName, 'RuleObject');
	const RuleAction = await deep.id(corePackageName, 'RuleAction');
	const Selector = await deep.id(corePackageName, 'Selector');
	const SelectorInclude = await deep.id(
		corePackageName,
		'SelectorInclude'
	);
	const SelectorExclude = await deep.id(
		corePackageName,
		'SelectorExclude'
	);
	const SelectorTree = await deep.id(corePackageName, 'SelectorTree');
	const containTree = await deep.id(corePackageName, 'containTree');
	const AllowInsertType = await deep.id(
		corePackageName,
		'AllowInsertType'
	);
	const AllowDeleteType = await deep.id(
		corePackageName,
		'AllowDeleteType'
	);
	const SelectorFilter = await deep.id(
		corePackageName,
		'SelectorFilter'
	);
	const Query = await deep.id(corePackageName, 'Query');
	const usersId = await deep.id('deep', 'users');

	const BasePayment = await deep.id(basePackageName, 'Payment');
	const BaseObject = await deep.id(basePackageName, 'Object');
	const BaseSum = await deep.id(basePackageName, 'Sum');
	const BasePay = await deep.id(basePackageName, 'Pay');
	const BaseUrl = await deep.id(basePackageName, 'Url');
	const BasePayed = await deep.id(basePackageName, 'Payed');
	const BaseCancelled = await deep.id(basePackageName, 'Cancelled');
	const BaseError = await deep.id(basePackageName, 'Error');

	const {
		data: [{ id: packageId }],
	} = await deep.insert({
		type_id: Package,
		string: { data: { value: packageName } },
		in: {
			data: [
				{
					type_id: Contain,
					from_id: deep.linkId,
				},
			],
		},
		out: {
			data: [
				{
					type_id: Join,
					to_id: await deep.id('deep', 'users', 'packages'),
				},
				{
					type_id: Join,
					to_id: await deep.id('deep', 'admin'),
				},
			],
		},
	});

	console.log({ packageId });

	const {
		data: [{ id: PSumProvider }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId,
				string: { data: { value: 'SumProvider' } },
			},
		},
	});

	console.log({ PSumProvider: PSumProvider });

	const {
		data: [{ id: PTinkoffProvider }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId,
				string: { data: { value: 'TinkoffProvider' } },
			},
		},
	});

	console.log({ PTinkoffProvider });

	const {
		data: [{ id: tinkoffProviderId }],
	} = await deep.insert({
		type_id: PTinkoffProvider,
		in: {
			data: [
				{
					type_id: Contain,
					from_id: deep.linkId,
				},
			],
		},
	});

	const {
		data: [{ id: PPayment }],
	} = await deep.insert({
		type_id: BasePayment,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId,
				string: { data: { value: 'Payment' } },
			},
		},
	});

	console.log({ PPayment: PPayment });

	const {
		data: [{ id: PObject }],
	} = await deep.insert({
		type_id: BaseObject,
		from_id: PPayment,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId,
				string: { data: { value: 'Object' } },
			},
		},
	});

	console.log({ PObject: PObject });

	const {
		data: [{ id: PSum }],
	} = await deep.insert({
		type_id: BaseSum,
		from_id: Any,
		to_id: PPayment,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Sum' } },
			},
		},
	});

	console.log({ PSum: PSum });

	const {
		data: [{ id: PPay }],
	} = await deep.insert({
		type_id: BasePay,
		from_id: User,
		to_id: PSum,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Pay' } },
			},
		},
	});

	console.log({ PPay: PPay });

	const {
		data: [{ id: PUrl }],
	} = await deep.insert({
		type_id: BaseUrl,
		from_id: PTinkoffProvider,
		to_id: PPay,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Url' } },
			},
		},
	});

	console.log({ PUrl: PUrl });

	const {
		data: [{ id: PPayed }],
	} = await deep.insert({
		type_id: BasePayed,
		from_id: PTinkoffProvider,
		to_id: PPay,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Payed' } },
			},
		},
	});

	console.log({ PPayed: PPayed });

	const {
		data: [{ id: PError }],
	} = await deep.insert({
		type_id: BaseError,
		from_id: PTinkoffProvider,
		to_id: PPay,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Error' } },
			},
		},
	});

	console.log({ PError: PError });

	// TODO: Use BaseCancelled
	const {
		data: [{ id: PCancelled }],
	} = await deep.insert({
		type_id: BaseCancelled,
		from_id: PTinkoffProvider,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'Cancelled' } },
			},
		},
	});

	console.log({ PCancelled });

	const {
		data: [{ id: paymentTreeId }],
	} = await deep.insert({
		type_id: Tree,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId,
				string: { data: { value: 'paymentTree' } },
			},
		},
		out: {
			data: [
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
					to_id: PCancelled,
				},
				{
					type_id: TreeIncludeUp,
					to_id: PPay,
				},
				{
					type_id: TreeIncludeUp,
					to_id: PUrl,
				},
			],
		},
	});

	console.log({ tinkoffProviderId });

	const {
		data: [{ id: sumProviderId }],
	} = await deep.insert({
		type_id: PSumProvider,
		in: {
			data: [
				{
					type_id: Contain,
					from_id: deep.linkId,
				},
			],
		},
	});

	console.log({ sumProviderId });

	const handlersDependencies = `
	const crypto = require('crypto');
  const axios = require('axios');
  const errorsConverter = ${errorsConverterString};
  const getError = ${getErrorString};
  const getUrl = ${getUrlString};
  const _generateToken = ${_generateTokenString};
  const generateToken = ${generateTokenString}
	`;
	console.log({ handlersDependencies });

	const payInsertHandler = 
async ({ deep, require, data: { newLink: payLink } }) => {
	'PLACEHOLDER_handlersDependencies';
  const init = 'PLACEHOLDER_init';

  const mpDownPay = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("'PLACEHOLDER_packageName'", "paymentTree") },
    },
  });
  console.log({mpDownPay});
	
	const PSUm = await deep.id("'PLACEHOLDER_packageName'", "Sum");
  const sum = mpDownPay.data.find(link => link.type_id == PSUm).value.value; 
  console.log({sum});

  const options = {
    TerminalKey: "'PLACEHOLDER_process.env.PAYMENT_TEST_TERMINAL_KEY'",
    OrderId: payLink?.value?.value ?? payLink.id,
    CustomerKey: "'PLACEHOLDER_deep.linkId'",
    NotificationURL: "'PLACEHOLDER_process.env.PAYMENT_EACQ_AND_TEST_NOTIFICATION_URL'",
    PayType: 'T',
    Amount: "'PLACEHOLDER_PRICE'",
    Description: 'Test shopping',
    Language: 'ru',
    Recurrent: 'Y',
    DATA: {
      Email: "'PLACEHOLDER_process.env.PAYMENT_TEST_EMAIL'",
      Phone: "'PLACEHOLDER_process.env.PAYMENT_TEST_PHONE'",
    },
    // Receipt: {
    //   Items: [{
    //     Name: 'Test item',
    //     Price: sum,
    //     Quantity: 1,
    //     Amount: "'PLACEHOLDER_PRICE'",
    //     PaymentMethod: 'prepayment',
    //     PaymentObject: 'service',
    //     Tax: 'none',
    //   }],
    //   Email: "'PLACEHOLDER_process.env.PAYMENT_TEST_EMAIL'",
    //   Phone: "'PLACEHOLDER_process.env.PAYMENT_TEST_PHONE'",
    //   Taxation: 'usn_income',
    // }
  };

  console.log({options});

  let initResult = await init(options);

  console.log({initResult});

  if (initResult.error != undefined) {
    console.log('initResult.error:', initResult.error);
    const {
      data: [{ id: error }],
    } = await deep.insert({
      type_id: (await deep.id("'PLACEHOLDER_packageName'", "Error")),
      from_id: "'PLACEHOLDER_tinkoffProviderId'",
      to_id: payLink.id,
      string: { data: { value: initResult.error } },
      in: {
        data: [
          {
            type_id: await deep.id("'PLACEHOLDER_corePackageName'", 'Contain'),
            from_id: "'PLACEHOLDER_deep.linkId'",
          },
        ],
      },
    });
    console.log({ error });
  } 

	console.log('Payment URL:', initResult.response.PaymentURL);
	const {
		data: [{ id: urlId }],
	} = await deep.insert({
		type_id: (await deep.id("'PLACEHOLDER_packageName'", "Url")),
		from_id: "'PLACEHOLDER_tinkoffProviderId'",
		to_id: payLink.id,
		string: { data: { value: initResult.response.PaymentURL } },
		in: {
			data: [
				{
					type_id: await deep.id("'PLACEHOLDER_corePackageName'", 'Contain'),
					from_id: PLACEHOLDER_deep.linkId,
				},
			],
		},
	});
	console.log({ urlId });

	await deep.update(payLink.id, {value: {...payLink.value.value, bankPaymentId: initResult.response.PaymentId}})
  
	return initResult;
};
	const payInsertHandlerString = payInsertHandler.toString()
			.replace(/PLACEHOLDER_.+?/g, (matched) => {
			const placeholderName = matched.substring("PLACEHOLDER_".length);
			return global[placeholderName]
		});
	console.log({payInsertHandlerString});

	const {
		data: [{ id: payInsertHandlerId }],
	} = await deep.insert({
		type_id: SyncTextFile,
		in: {
			data: [
				{
					type_id: Contain,
					from_id: packageId, // before created package
					string: { data: { value: 'payInsertHandlerFile' } },
				},
				{
					from_id: dockerSupportsJs,
					type_id: Handler,
					in: {
						data: [
							{
								type_id: Contain,
								from_id: packageId, // before created package
								string: { data: { value: 'payInsertHandler' } },
							},
							{
								type_id: HandleInsert,
								from_id: PPay,
								in: {
									data: [
										{
											type_id: Contain,
											from_id: packageId, // before created package
											string: { data: { value: 'payInsertHandle' } },
										},
									],
								},
							},
						],
					},
				},
			],
		},
		string: {
			data: {
				value: payInsertHandlerString,
			},
		},
	});

	console.log({ payInsertHandlerId });

	const cancelledInsertHandler =  
async ({ deep, require, data: { newLink: cancelledLink } }) => {
  'PLACEHOLDER_handlersDependencies';
	const cancel = 'PLACEHOLDER_cancel';

	const getPayLink = async (cancelledLink) => {
		const toLink = await deep.select({
			id: cancelledLink.to_id
		});
		if(toLink.type_id === (await deep.id("'PLACEHOLDER_packageName'", "Pay"))) {
			return toLink;
		} 
		if (toLink.type_id === (await deep.id("'PLACEHOLDER_packageName'", "Payed"))) {
			return await deep.select({
				id: toLink.to_id
			});
		} 
	}

	const toLink = await deep.select({
		id: cancelledLink.to_id
	});

	const bankPaymentId = (await getPayLink(cancelledLink)).value.value.bankPaymentId;

	const cancelOptions = {
		TerminalKey: "'PLACEHOLDER_process.env.PAYMENT_TEST_TERMINAL_KEY'",
		PaymentId: bankPaymentId,
		Amount: cancelledLink.value.value
	}

	const cancelResult = await cancel(cancelOptions);

	if(cancelResult.error) {
		await deep.insert({
			type_id: (await deep.id("'PLACEHOLDER_packageName'", "Error")),
			from_id: "'PLACEHOLDER_tinkoffProviderId'",
			to_id: cancelledLink.id,
			string: { data: {value: cancelResult.error } }
		});
	}

	return cancelResult;
};
	const cancelledInsertHandlerString = cancelledInsertHandler.toString()
		.replace(/PLACEHOLDER_.+?/g, (matched) => {
		const placeholderName = matched.substring("PLACEHOLDER_".length);
		return global[placeholderName]
	});
	console.log({cancelledInsertHandlerString});

	const {
		data: [{ id: cancelledInsertHandlerId }],
	} = await deep.insert({
		type_id: SyncTextFile,
		in: {
			data: [
				{
					type_id: Contain,
					from_id: packageId, // before created package
					string: { data: { value: 'cancelledInsertHandlerFile' } },
				},
				{
					from_id: dockerSupportsJs,
					type_id: Handler,
					in: {
						data: [
							{
								type_id: Contain,
								from_id: packageId, // before created package
								string: { data: { value: 'cancelledInsertHandler' } },
							},
							{
								type_id: HandleInsert,
								from_id: PPay,
								in: {
									data: [
										{
											type_id: Contain,
											from_id: packageId, // before created package
											string: { data: { value: 'cancelledInsertHandle' } },
										},
									],
								},
							},
						],
					},
				},
			],
		},
		string: {
			data: {
				value: cancelledInsertHandlerString,
			},
		},
	});

	console.log({ cancelledInsertHandlerId });

	const tinkoffNotificationHandler =  
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  'PLACEHOLDER_handlersDependencies';
	const reqBody = req.body;
	console.log({reqBody});
  const status = req.body.Status;
  console.log({status});
  if (status == 'AUTHORIZED') {
		const confirm = 'PLACEHOLDER_confirm';
    const confirmOptions = {
      TerminalKey: "'PLACEHOLDER_process.env.PAYMENT_TEST_TERMINAL_KEY'",
      PaymentId: req.body.PaymentId,
      Amount: req.body.Amount,
      // Receipt: req.body.Receipt,
    };
    const confirmResult = await confirm(confirmOptions);
    console.log({confirmResult});
  } else if (status == 'CONFIRMED') {
		console.log({payQueryData});
		const {data: [{id: payId}]} = await deep.select({value: req.body.OrderId, type_id: await deep.id("'PLACEHOLDER_packageName'", "Pay"), from_id: req.body.CustomerKey});
    const payedInsertData = await deep.insert({
      type_id: (await deep.id("'PLACEHOLDER_packageName'", "Payed")),
			from_id: "'PLACEHOLDER_tinkoffProviderId'",
      to_id: payId,
      in: {
        data: [
          {
            type_id: await deep.id("'PLACEHOLDER_corePackageName'", 'Contain'),
            from_id: "'PLACEHOLDER_deep.linkId'",
          },
        ],
      },
    });
    console.log({payedInsertData});
  } 
  res.send('ok');
};
	const tinkoffNotificationHandlerString = tinkoffNotificationHandler.toString()
		.replace(/PLACEHOLDER_.+?/g, (matched) => {
		const placeholderName = matched.substring("PLACEHOLDER_".length);
		return global[placeholderName]
	});
	console.log({tinkoffNotificationHandlerString});

	await deep.insert(
		{
			type_id: await deep.id(corePackageName, 'Port'),
			number: {
				data: { value: process.env.PAYMENT_EACQ_AND_TEST_NOTIFICATION_PORT },
			},
			in: {
				data: {
					type_id: await deep.id(corePackageName, 'RouterListening'),
					from: {
						data: {
							type_id: await deep.id(corePackageName, 'Router'),
							in: {
								data: {
									type_id: await deep.id(
										corePackageName,
										'RouterStringUse'
									),
									string: {
										data: {
											value:
												process.env.PAYMENT_EACQ_AND_TEST_NOTIFICATION_ROUTE,
										},
									},
									from: {
										data: {
											type_id: await deep.id(corePackageName, 'Route'),
											out: {
												data: {
													type_id: await deep.id(
														corePackageName,
														'HandleRoute'
													),
													to: {
														data: {
															type_id: await deep.id(
																corePackageName,
																'Handler'
															),
															from_id: await deep.id(
																corePackageName,
																'dockerSupportsJs'
															),
															in: {
																data: {
																	type_id: Contain,
																	// from_id: deep.linkId,
																	from_id: await deep.id('deep', 'admin'),
																	string: {
																		data: {
																			value: 'tinkoffNotificationHandler',
																		},
																	},
																},
															},
															to: {
																data: {
																	type_id: SyncTextFile,
																	string: {
																		data: {
																			value: tinkoffNotificationHandlerString,
																		},
																	},
																},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
		{
			name: 'INSERT_HANDLE_ROUTE_HIERARCHICAL',
		}
	);

	const cancel = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Cancel'),
				data: { ...options, Token: generateToken(options) },
			});

			const error = getError(response.data.ErrorCode);

			return {
				error,
				request: options,
				response: response.data,
			};
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const callTests = async () => {
		console.log('callTests-start');
		const PPayment = await deep.id(packageName, 'Payment');
		const PObject = await deep.id(packageName, 'Object');
		const PSum = await deep.id(packageName, 'Sum');
		const PPay = await deep.id(packageName, 'Pay');
		const PUrl = await deep.id(packageName, 'Url');
		const PPayed = await deep.id(packageName, 'Payed');
		const PError = await deep.id(packageName, 'Error');
		const PCancelled = await deep.id(packageName, 'Cancelled');
		const paymentTreeId = await deep.id(packageName, 'paymentTree');
		const Type = await deep.id(corePackageName, 'Type');
		const Any = await deep.id(corePackageName, 'Any');

		const {
			data: [{ id: Product }],
		} = await deep.insert({
			type_id: Type,
			from_id: Any,
			to_id: Any,
			in: {
				data: [
					{
						type_id: Contain,
						from_id: deep.linkId,
					},
				],
			},
		});

		console.log({ Product });

		const {
			data: [{ id: productId }],
		} = await deep.insert({
			type_id: Product,
			in: {
				data: [
					{
						type_id: Contain,
						from_id: deep.linkId,
					},
				],
			},
		});

		console.log({ product: productId });

		const deleteTestLinks = async () => {
			console.log('deleteTestLinks-start');
			const { data: testLinks } = await deep.select({
				type_id: {
					_in: { PObject, PSum, PPay, PUrl, PPayed, PError, PCancelled },
				},
			});
			for (let i = 0; i < testLinks.length; i++) {
				const { id } = testLinks[i];
				await deep.delete({ id: id });
			}
			console.log('deleteTestLinks-start');
		};

		const callRealizationTests = async () => {
			const testInit = async () => {
				const initOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					OrderId: uniqid(),
					Amount: PRICE,
					Description: 'Test shopping',
					CustomerKey: uniqid(),
					Language: 'ru',
					Recurrent: 'Y',
					DATA: {
						Email: process.env.PAYMENT_TEST_EMAIL,
						Phone: process.env.PAYMENT_TEST_PHONE,
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
					// 	Email: process.env.PAYMENT_TEST_EMAIL,
					// 	Phone: process.env.PAYMENT_TEST_PHONE,
					// 	Taxation: 'usn_income',
					// },
				};

				const initResult = await init(initOptions);

				expect(initResult.error).to.equal(undefined);
			};

			const testConfirm = async () => {
				const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
				const page = await browser.newPage();

				const initOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					Amount: PRICE,
					OrderId: uniqid(),
					CustomerKey: uniqid(),
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
					// 	Email: process.env.PAYMENT_TEST_EMAIL,
					// 	Phone: process.env.PAYMENT_TEST_PHONE,
					// 	Taxation: 'usn_income',
					// },
				};

				const initResult = await init(initOptions);

				confirmDebug('initResult', initResult?.response?.Success);

				await payInBrowser({
					browser,
					page,
					url: initResult.response.PaymentURL,
				});

				const confirmOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: initResult.response.PaymentId,
				};

				const confirmResult = await confirm(confirmOptions);
				confirmDebug('confirm', confirmResult);

				expect(confirmResult.error).to.equal(undefined);
				expect(confirmResult.response.Status).to.equal('CONFIRMED');
			};

			const testCancel = async () => {
				console.log('testCancel-start');
				const testCancelAfterPayBeforeConfirmFullPrice = async () => {
					console.log('testCanselAfterPayBeforeConfirmFullPrice-start');
					const initOptions = {
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
						OrderId: uniqid(),
						CustomerKey: deep.linkId,
						PayType: 'T',
						Amount: PRICE,
						Description: 'Test shopping',
						Language: 'ru',
						Recurrent: 'Y',
						DATA: {
							Email: process.env.PAYMENT_TEST_EMAIL,
							Phone: process.env.PAYMENT_TEST_PHONE,
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
						// 	Email: process.env.PAYMENT_TEST_EMAIL,
						// 	Phone: process.env.PAYMENT_TEST_PHONE,
						// 	Taxation: 'usn_income',
						// }
					};

					console.log({ options: initOptions });

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
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
						PaymentId: bankPaymentId,
						Amount: PRICE,
					};

					console.log({ cancelOptions });

					const cancelResult = await cancel(cancelOptions);

					console.log({ cancelResponse: cancelResult });

					expect(cancelResult.error).to.equal(undefined);
					expect(cancelResult.response.Status).to.equal('REVERSED');
					console.log('testCanselAfterPayBeforeConfirmFullPrice-end');
				};

				const testCancelAfterPayBeforeConfirmCustomPriceX2 = async () => {
					console.log('testCanselAfterPayBeforeConfirmCustomPriceX2-start');
					const initOptions = {
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
						OrderId: uniqid(),
						CustomerKey: deep.linkId,
						PayType: 'T',
						Amount: PRICE,
						Description: 'Test shopping',
						Language: 'ru',
						Recurrent: 'Y',
						DATA: {
							Email: process.env.PAYMENT_TEST_EMAIL,
							Phone: process.env.PAYMENT_TEST_PHONE,
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
						// 	Email: process.env.PAYMENT_TEST_EMAIL,
						// 	Phone: process.env.PAYMENT_TEST_PHONE,
						// 	Taxation: 'usn_income',
						// }
					};

					console.log({ options: initOptions });

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
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
						PaymentId: bankPaymentId,
						Amount: Math.floor(PRICE / 3),
					};

					console.log({ cancelOptions });

					{
						const cancelResult = await cancel(cancelOptions);

						console.log({ cancelResponse: cancelResult });

						expect(cancelResult.error).to.equal(undefined);
						expect(cancelResult.response.Status).to.equal('PARTIAL_REVERSED');
					}
					{
						const cancelResult = await cancel(cancelOptions);

						console.log({ cancelResponse: cancelResult });

						expect(cancelResult.error).to.equal(undefined);
						expect(cancelResult.response.Status).to.equal('PARTIAL_REVERSED');
					}
					console.log('testCanselAfterPayBeforeConfirmCustomPriceX2-end');
				};

				const testCancelAfterPayAfterConfirmFullPrice = async () => {
					console.log('testCancelAfterPayAfterConfirmFullPrice-start');
					await testConfirm();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const bankPaymentId = await getBankPaymentId(
						payLink?.value?.value ?? payLink.id
					);

					const cancelOptions = {
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
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
					await testConfirm();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const bankPaymentId = await getBankPaymentId(
						payLink?.value?.value ?? payLink.id
					);

					const cancelOptions = {
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
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
					await testInit();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const bankPaymentId = await getBankPaymentId(
						payLink?.value?.value ?? payLink.id
					);

					const cancelOptions = {
						TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
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
				await deleteTestLinks();
				await testCancelAfterPayBeforeConfirmCustomPriceX2();
				await deleteTestLinks();
				await testCancelAfterPayAfterConfirmFullPrice();
				await deleteTestLinks();
				await testCancelAfterPayAfterConfirmCustomPriceX2();
				await deleteTestLinks();
				await testCancelBeforePay();
				await deleteTestLinks();

				console.log('testCancel-end');
			};

			const testGetState = async () => {
				const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
				const page = await browser.newPage();

				const initResult = await init({
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					OrderId: uniqid(),
					CustomerKey: uniqid(),
					Amount: PRICE,
				});

				await payInBrowser({
					browser,
					page,
					url: initResult.response.PaymentURL,
				});

				const getStateOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: initResult.response.PaymentId,
				};

				const getStateResult = await getState(getStateOptions);

				expect(getStateResult.error).to.equal(undefined);
			};

			const testGetCardList = async () => {
				const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
				const page = await browser.newPage();

				const initResult = await sendInit({
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: uniqid(),
					OrderId: uniqid(),
					Amount: PRICE,
					Recurrent: 'Y',
				});

				await payInBrowser({
					browser,
					page,
					url: initResult.response.PaymentURL,
				});

				const getCardListOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: uniqid(),
				};

				const getCardListResult = await getCardList(getCardListOptions);

				expect(getCardListResult.error).to.equal(undefined);
			};

			const testResend = async () => {
				console.log('testResend-start');
				const resendOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				};
				console.log({ resendOptions });

				const resendResult = await resend(resendOptions);
				console.log({ resendResult });

				expect(resendResult.error).to.equal(undefined);
				console.log('testResend-end');
			};

			const testCharge = async () => {
				console.log('testCharge-start');
				const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
				const page = await browser.newPage();

				const initResult = await init({
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					Amount: PRICE,
					OrderId: uniqid(),
					CustomerKey: deep.linkId,
					Recurrent: 'Y',
				});

				await payInBrowser({
					browser,
					page,
					url: initResult.response.PaymentURL,
				});

				const getCardListOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: deep.linkId,
				};

				const getCardListResult = await getCardList(getCardListOptions);

				expect(getCardListResult.response[0].RebillId).to.have.length.above(0);

				const getStateOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: initResult.response.PaymentId,
				};

				const getStateResult = await getState(getStateOptions);

				expect(getStateResult.response.Status).to.equal('AUTHORIZED');

				const newInitResult = await init({
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					Amount: PRICE,
					OrderId: uniqid(),
					CustomerKey: deep.linkId,
				});

				const newChargeOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: newInitResult.response.PaymentId,
					RebillId: Number(getCardListResult.response[0].RebillId),
				};

				const chargeResult = await charge(newChargeOptions);

				expect(chargeResult.error).to.equal(undefined);
				console.log('testCharge-end');
			};

			const testAddCustomer = async () => {
				console.log('testAddCustomer-start');

				const addCustomerOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: uniqid(),
				};

				const addCustomerResult = await addCustomer(addCustomerOptions);

				expect(addCustomerResult.error).to.equal(undefined);
				console.log('testAddCustomer-end');
			};

			const testGetCustomer = async () => {
				console.log('testGetCustomer-start');

				const customerOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: uniqid(),
				};

				const addCustomerDataOptions = {
					...customerOptions,
					Phone: process.env.PAYMENT_TEST_PHONE,
				};

				const addResult = await addCustomer(addCustomerDataOptions);

				expect(addResult.error).to.equal(undefined);

				const getResult = await getCustomer(customerOptions);

				expect(getResult.error).to.equal(undefined);
				expect(getResult.response.Phone).to.equal(
					process.env.PAYMENT_TEST_PHONE
				);

				console.log('testGetCustomer-end');
			};

			const testRemoveCustomer = async () => {
				console.log('testRemoveCustomer-start');

				const removeCustomerData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: uniqid(),
				};

				const newAddCustomerData = {
					...removeCustomerData,
					Phone: process.env.PAYMENT_TEST_PHONE,
				};

				const addResult = await addCustomer(newAddCustomerData);

				expect(addResult.error).to.equal(undefined);

				const removeResult = await removeCustomer(removeCustomerData);

				expect(removeResult.error).to.equal(undefined);

				console.log('testRemoveCustomer-end');
			};

			await testInit();
			await testConfirm();
			await testCancel();
			await testGetState();
			await testGetCardList();
			await testResend();
			await testCharge();
			await testAddCustomer();
			await testGetCustomer();
			await testRemoveCustomer();
		};

		const callIntegrationTests = async () => {
			const testInit = async () => {
				console.log('testInit-start');
				const {
					data: [{ id: paymentId }],
				} = await deep.insert({
					type_id: PPayment,
					in: {
						data: [
							{
								type_id: Contain,
								from_id: deep.linkId,
							},
						],
					},
				});
				console.log({ paymentId });

				const {
					data: [{ id: sumId }],
				} = await deep.insert({
					type_id: PSum,
					from_id: sumProviderId,
					to_id: paymentId,
					number: { data: { value: 150 } },
					in: {
						data: [
							{
								type_id: Contain,
								from_id: deep.linkId,
							},
						],
					},
				});

				console.log({ sum: sumId });

				const {
					data: [{ id: objectId }],
				} = await deep.insert({
					type_id: PObject,
					from_id: paymentId,
					to_id: productId,
					in: {
						data: [
							{
								type_id: Contain,
								from_id: deep.linkId,
							},
						],
					},
				});

				console.log({ object: objectId });

				const {
					data: [{ id: payId }],
				} = await deep.insert({
					type_id: PPay,
					from_id: deep.linkId,
					to_id: sumId,
					string: { data: { value: uniqid() } },
					in: {
						data: [
							{
								type_id: Contain,
								from_id: deep.linkId,
							},
						],
					},
				});

				console.log({ pay: payId });

				await sleep(9000);

				const {
					data: { length },
				} = await deep.select({
					type_id: PUrl,
					to_id: payId,
				});

				expect(length).to.greaterThan(0);
				console.log('testInit-end');
			};

			const testFinishAuthorize = async () => {
				console.log('testFinishAuthorize-start');
				await testInit();
				const {
					data: [
						{
							value: { value: url },
						},
					],
				} = await deep.select({
					type_id: PUrl,
				});

				const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
				const page = await browser.newPage();
				await payInBrowser({
					browser,
					page,
					url,
				});
				console.log('testFinishAuthorize-end');
			};

			const testConfirm = async () => {
				console.log('testConfirm-start');
				await testFinishAuthorize();
				await sleep(17000);
				let { data } = await deep.select({
					type_id: PPayed,
				});
				expect(data.length).to.greaterThan(0);
				console.log('testConfirm-end');
			};

			const testCancelIntegration = async () => {
				console.log('testCancelIntegration-start');
				const testCancelAfterPayAfterConfirmFullPrice = async () => {
					console.log('testCancelAfterPayAfterConfirmFullPrice-start');
					await testConfirm();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const {
						data: [payedLink],
					} = await deep.select({
						type_id: PPayed,
						to_id: payLink.id,
					});

					const {
						data: [cancelledLink],
					} = await deep.insert({
						type_id: PCancelled,
						from_id: tinkoffProviderId,
						to_id: payedLink.id,
						number: { data: { value: PRICE } },
					});

					await sleep(5000);

					const { data: cancelledErrors } = await deep.select({
						type_id: PError,
						to_id: cancelledLink.id,
					});

					expect(cancelledErrors.length).to.equal(0);
					console.log('testCancelAfterPayAfterConfirmFullPrice-end');
				};

				const testCancelAfterPayAfterConfirmCustomPriceX2 = async () => {
					console.log('testCancelAfterPayAfterConfirmCustomPriceX2-start');
					await testConfirm();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const {
						data: [payedLink],
					} = await deep.select({
						type_id: PPayed,
						to_id: payLink.id,
					});

					for (let i = 0; i < 2; i++) {
						const {
							data: [cancelledLink],
						} = await deep.insert({
							type_id: PCancelled,
							from_id: tinkoffProviderId,
							to_id: payedLink.id,
							number: { data: { value: Math.floor(PRICE / 3) } },
						});

						await sleep(5000);

						const { data: cancelledErrors } = await deep.select({
							type_id: PError,
							to_id: cancelledLink.id,
						});

						expect(cancelledErrors.length).to.equal(0);
					}

					console.log('testCancelAfterPayAfterConfirmCustomPriceX2-end');
				};

				const testCancelBeforePay = async () => {
					console.log('testCancelBeforePay-start');
					await testInit();

					const {
						data: [payLink],
					} = await deep.select({
						type_id: PPay,
					});

					const {
						data: [cancelledLink],
					} = await deep.insert({
						type_id: PCancelled,
						from_id: tinkoffProviderId,
						to_id: payLink.id,
						number: { data: { value: PRICE } },
					});

					await sleep(5000);

					const { data: cancelledErrors } = await deep.select({
						type_id: PError,
						to_id: cancelledLink.id,
					});

					expect(cancelledErrors.length).to.equal(0);
					console.log('testCancelBeforePay-end');
				};
				await testCancelAfterPayAfterConfirmFullPrice();
				await deleteTestLinks();
				await testCancelAfterPayAfterConfirmCustomPriceX2();
				await deleteTestLinks();
				await testCancelBeforePay();
				await deleteTestLinks();

				console.log('testCancelIntegration-end');
			};

			const testGetState = async () => {
				console.log('testGetState-start');
				await testFinishAuthorize();

				const {
					data: [payLink],
				} = await deep.select({ type_id: PPay });

				const bankPaymentId = await getBankPaymentId(
					payLink?.value?.value ?? payLink.id
				);

				const getStateOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
				};

				const getStateResult = await getState(getStateOptions);

				expect(getStateResult.error).to.equal(undefined);
				console.log('testGetState-end');
			};

			const testGetCardList = async () => {
				console.log('testGetCardList-end');
				await testFinishAuthorize();

				const getCardListOptions = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					CustomerKey: deep.linkId,
				};

				const getCardListResult = await getCardList(getCardListOptions);

				expect(getCardListResult.error).to.equal(undefined);
				console.log('testGetCardList-end');
			};

			await testInit();
			await testFinishAuthorize();
			await testConfirm();
			await testCancelIntegration();
			await testGetState();
			await testGetCardList();
		};

		await callRealizationTests();
		await callIntegrationTests();
	};

	await callTests();
};

f();
