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

	const getError = (errorCode) =>
		errorCode === '0' ? undefined : errorsConverter[errorCode] || 'broken';

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

	const generateToken = (data) => {
		const { Receipt, DATA, Shops, ...restData } = data;
		const dataWithPassword = {
			...restData,
			Password: process.env.PAYMENT_TEST_TERMINAL_PASSWORD,
		};
		console.log({ dataWithPassword });
		return _generateToken(dataWithPassword);
	};

	const getUrl = (method) =>
		`${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;
	const getMarketUrl = (method) =>
		`${process.env.PAYMENT_TINKOFF_MARKET_URL}/${method}`;

	const getState = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('GetState'),
				data: options,
			});

			const error = getError(response.data.ErrorCode);

			const d = {
				error,
				request: options,
				response: response.data,
			};
			options?.log && options.log(d);

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
				data: options,
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
				data: options,
			});

			const error = getError(response.data.ErrorCode || '0');

			const d = {
				error,
				request: options,
				response: response.data,
			};
			options?.log && options.log(d);

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
				data: options,
			});

			const error = getError(response.data.ErrorCode);

			const d = {
				error,
				request: options,
				response: response.data,
			};

			options?.log && options.log(d);

			return d;
		} catch (error) {
			return {
				error,
				request: options,
				response: null,
			};
		}
	};

	const sendInit = async (noTokenData) => {
		const options = {
			...noTokenData,
			Token: generateToken(noTokenData),
		};

		return init(options);
	};

	const confirm = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Confirm'),
				data: options,
			});

			const error = getError(response.data.ErrorCode);

			const d = {
				error,
				request: options,
				response: response.data,
			};
			options?.log && options.log(d);

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
				data: options,
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
				data: options,
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
				data: options,
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
				data: options,
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
				data: options,
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
		const noTokenCheckOrderOptions = {
			TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
			OrderId: orderId,
		};

		const checkOrderOptions = {
			...noTokenCheckOrderOptions,
			Token: generateToken(noTokenCheckOrderOptions),
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

	const User = await deep.id('@deep-foundation/core', 'User');
	const Type = await deep.id('@deep-foundation/core', 'Type');
	const Any = await deep.id('@deep-foundation/core', 'Any');
	const Join = await deep.id('@deep-foundation/core', 'Join');
	const Contain = await deep.id('@deep-foundation/core', 'Contain');
	const Value = await deep.id('@deep-foundation/core', 'Value');
	const String = await deep.id('@deep-foundation/core', 'String');
	const Package = await deep.id('@deep-foundation/core', 'Package');

	const SyncTextFile = await deep.id('@deep-foundation/core', 'SyncTextFile');
	const dockerSupportsJs = await deep.id(
		'@deep-foundation/core',
		'dockerSupportsJs'
	);
	const Handler = await deep.id('@deep-foundation/core', 'Handler');
	const HandleInsert = await deep.id('@deep-foundation/core', 'HandleInsert');
	const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');

	const Tree = await deep.id('@deep-foundation/core', 'Tree');
	const TreeIncludeNode = await deep.id(
		'@deep-foundation/core',
		'TreeIncludeNode'
	);
	const TreeIncludeUp = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
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

	const BasePayment = await deep.id('@deep-foundation/payments', 'Payment');
	const BaseObject = await deep.id('@deep-foundation/payments', 'Object');
	const BaseSum = await deep.id('@deep-foundation/payments', 'Sum');
	const BasePay = await deep.id('@deep-foundation/payments', 'Pay');
	const BaseUrl = await deep.id('@deep-foundation/payments', 'Url');
	const BasePayed = await deep.id('@deep-foundation/payments', 'Payed');
	const BaseError = await deep.id('@deep-foundation/payments', 'Error');

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
		type_id: Type,
		from_id: PTinkoffProvider,
		to_id: PPay,
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

	const payInsertHandler = /*javascript*/ `
async ({ deep, require, data: { newLink: payLink } }) => {
  const crypto = require('crypto');
  const axios = require('axios');
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
  const getError = (errorCode) =>
  errorCode === '0' ? undefined : errorsConverter[errorCode] || 'broken';
  const getUrl = (method) =>
  "${process.env.PAYMENT_EACQ_AND_TEST_URL}" + "/" + method;
  const _generateToken = (dataWithPassword) => {
    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => dataWithPassword[key])
      .reduce((acc, item) => acc.toString() + item.toString(), '');
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    return hash;
  };
  const generateToken = (data) => {
    const { Receipt, DATA, Shops, ...restData } = data;
    const dataWithPassword = {
      ...restData,
      Password: "${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}",
    };
    return _generateToken(dataWithPassword);
  }; 
  const init = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Init'),
        headers: {
          'Content-Type': 'application/json',
        },
        data: options,
      });

      const error = getError(response.data.ErrorCode);

      const d = {
        error,
        request: options,
        response: response.data,
      };

      options?.log && options.log(d);

      return d;
    } catch (error) {
      return {
        error,
        request: options,
        response: null,
      };
    }
  };

  const sendInit = async (noTokenData) => {
    const options = {
      ...noTokenData,
      Token: generateToken(noTokenData),
    };

    return init(options);
  };

  const mpDownPay = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: ${paymentTreeId} },
    },
  });

  console.log({mpDownPay});

  // const paymentLink = mpDownPay.data.find(link => link.type_id == ${PPayment});
  const sum = mpDownPay.data.find(link => link.type_id == ${PSum}).value.value; 

  // console.log({paymentLink});
  console.log({sum});

  const options = {
    TerminalKey: "${process.env.PAYMENT_TEST_TERMINAL_KEY}",
    OrderId: payLink?.value?.value ?? payLink.id,
    CustomerKey: ${deep.linkId},
    NotificationURL: "${process.env.PAYMENT_EACQ_AND_TEST_NOTIFICATION_URL}",
    PayType: 'T',
    Amount: ${PRICE},
    Description: 'Test shopping',
    Language: 'ru',
    Recurrent: 'Y',
    DATA: {
      Email: "${process.env.PAYMENT_TEST_EMAIL}",
      Phone: "${process.env.PAYMENT_TEST_PHONE}",
    },
    // Receipt: {
    //   Items: [{
    //     Name: 'Test item',
    //     Price: sum,
    //     Quantity: 1,
    //     Amount: ${PRICE},
    //     PaymentMethod: 'prepayment',
    //     PaymentObject: 'service',
    //     Tax: 'none',
    //   }],
    //   Email: "${process.env.PAYMENT_TEST_EMAIL}",
    //   Phone: "${process.env.PAYMENT_TEST_PHONE}",
    //   Taxation: 'usn_income',
    // }
  };

  console.log({options});

  let initResult = await sendInit({
    ...options
  });

  console.log({initResult});

  if (initResult.error != undefined) {
    console.log('initResult.error:', initResult.error);
    const {
      data: [{ id: error }],
    } = await deep.insert({
      type_id: ${PError},
      from_id: ${tinkoffProviderId},
      to_id: payLink.id,
      string: { data: { value: initResult.error } },
      in: {
        data: [
          {
            type_id: ${Contain},
            from_id: ${deep.linkId},
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
		type_id: ${PUrl},
		from_id: ${tinkoffProviderId},
		to_id: payLink.id,
		string: { data: { value: initResult.response.PaymentURL } },
		in: {
			data: [
				{
					type_id: ${Contain},
					from_id: ${deep.linkId},
				},
			],
		},
	});
	console.log({ urlId });

	await deep.update(payLink.id, {value: {...payLink.value.value, bankPaymentId: initResult.response.PaymentId}})
  
	return initResult;
};
`;

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
				value: payInsertHandler,
			},
		},
	});

	console.log({ payInsertHandlerId });

	const cancelledInsertHandler = /*javascript*/ `
async ({ deep, require, data: { newLink: cancelledLink } }) => {
  const crypto = require('crypto');
  const axios = require('axios');
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
  const getError = (errorCode) =>
  errorCode === '0' ? undefined : errorsConverter[errorCode] || 'broken';
  const getUrl = (method) =>
  "${process.env.PAYMENT_EACQ_AND_TEST_URL}" + "/" + method;
  const _generateToken = (dataWithPassword) => {
    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => dataWithPassword[key])
      .reduce((acc, item) => acc.toString() + item.toString(), '');
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    return hash;
  };
  const generateToken = (data) => {
    const { Receipt, DATA, Shops, ...restData } = data;
    const dataWithPassword = {
      ...restData,
      Password: "${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}",
    };
    return _generateToken(dataWithPassword);
  }; 
	const cancel = async (options) => {
		try {
			const response = await axios({
				method: 'post',
				url: getUrl('Cancel'),
				data: options,
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

	const getPayLink = async (cancelledLink) => {
		const toLink = await deep.select({
			id: cancelledLink.to_id
		});
		if(toLink.type_id === ${PPay}) {
			return toLink;
		} 
		if (toLink.type_id === ${PPayed}) {
			return await deep.select({
				id: toLink.to_id
			});
		} 
	}

	const toLink = await deep.select({
		id: cancelledLink.to_id
	});

	const bankPaymentId = (await getPayLink(cancelledLink)).value.value.bankPaymentId;

	const noTokenCancelOptions = {
		TerminalKey: "${process.env.PAYMENT_TEST_TERMINAL_KEY}",
		PaymentId: bankPaymentId,
		Amount: cancelledLink.value.value
	}

	const cancelOptions = {
		...noTokenCancelOptions,
		Token: generateToken(noTokenCancelOptions)
	}

	const cancelResult = await cancel(cancelOptions);

	if(cancelResult.error) {
		await deep.insert({
			type_id: ${PError},
			from_id: ${tinkoffProviderId},
			to_id: cancelledLink.id,
			string: { data: {value: cancelResult.error } }
		});
	}

	return cancelResult;
};
`;

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
				value: cancelledInsertHandler,
			},
		},
	});

	console.log({ cancelledInsertHandlerId });

	const tinkoffNotificationHandler = /*javascript*/ `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  const crypto = require('crypto');
  const axios = require('axios');
  console.log('helloSomeText');
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
  const getError = (errorCode) =>
  errorCode === '0' ? undefined : errorsConverter[errorCode] || 'broken';
  const getUrl = (method) =>
  "${process.env.PAYMENT_EACQ_AND_TEST_URL}" + "/" + method;
  const _generateToken = (dataWithPassword) => {
    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => dataWithPassword[key])
      .reduce((acc, item) => acc.toString() + item.toString(), '');
		console.log({dataWithPassword});
		console.log({dataString});
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
		console.log({hash});
    return hash;
  };
  const generateToken = (data) => {
		console.log({data});
    const { Receipt, DATA, Shops, ...restData } = data;
		console.log({restData});
    const dataWithPassword = {
      ...restData,
      Password: "${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}",
    };
		console.log({dataWithPassword});
    return _generateToken(dataWithPassword);
  }; 
  const confirm = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Confirm'),
        data: options,
      });

      const error = getError(response.data.ErrorCode);

      const d = {
        error,
        request: options,
        response: response.data,
      };

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
	const reqBody = req.body;
	console.log({reqBody});
  const status = req.body.Status;
  console.log({status});
  if (status == 'AUTHORIZED') {
    const noTokenConfirmOptions = {
      TerminalKey: "${process.env.PAYMENT_TEST_TERMINAL_KEY}",
      PaymentId: req.body.PaymentId,
      Amount: req.body.Amount,
      // Receipt: req.body.Receipt,
    };

    const confirmOptions = {
      ...noTokenConfirmOptions,
      Token: generateToken(noTokenConfirmOptions)
    }
    const confirmResult = await confirm(confirmOptions);
    console.log({confirmResult});
  } else if (status == 'CONFIRMED') {
		const {data: payWithSpecificValueAndFromIdQueryData} = await deep.select({value: req.body.OrderId, type_id: ${PPay}, from_id: req.body.CustomerKey});
		console.log({payWithSpecificValueAndFromIdQueryData});
		const {data: payQueryData} = await deep.select({value: req.body.OrderId, type_id: ${PPay}, from_id: req.body.CustomerKey});
		console.log({payQueryData});
		const {data: [{id: payId}]} = await deep.select({value: req.body.OrderId, type_id: ${PPay}, from_id: req.body.CustomerKey});
    const payedInsertData = await deep.insert({
      type_id: ${PPayed},
			from_id: ${tinkoffProviderId},
      to_id: payId,
      in: {
        data: [
          {
            type_id: ${Contain},
            from_id: ${deep.linkId},
          },
        ],
      },
    });
    console.log({payedInsertData});
  } 
  res.send('ok');
};
`;

	await deep.insert(
		{
			type_id: await deep.id('@deep-foundation/core', 'Port'),
			number: {
				data: { value: process.env.PAYMENT_EACQ_AND_TEST_NOTIFICATION_PORT },
			},
			in: {
				data: {
					type_id: await deep.id('@deep-foundation/core', 'RouterListening'),
					from: {
						data: {
							type_id: await deep.id('@deep-foundation/core', 'Router'),
							in: {
								data: {
									type_id: await deep.id(
										'@deep-foundation/core',
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
											type_id: await deep.id('@deep-foundation/core', 'Route'),
											out: {
												data: {
													type_id: await deep.id(
														'@deep-foundation/core',
														'HandleRoute'
													),
													to: {
														data: {
															type_id: await deep.id(
																'@deep-foundation/core',
																'Handler'
															),
															from_id: await deep.id(
																'@deep-foundation/core',
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
																			value: tinkoffNotificationHandler,
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
				data: options,
			});

			const error = getError(response.data.ErrorCode);

			const d = {
				error,
				request: options,
				response: response.data,
			};
			options?.log && options.log(d);

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

		const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

		const PPayment = await deep.id(packageName, 'Payment');
		const PObject = await deep.id(packageName, 'Object');
		const PSum = await deep.id(packageName, 'Sum');
		const PPay = await deep.id(packageName, 'Pay');
		const PUrl = await deep.id(packageName, 'Url');
		const PPayed = await deep.id(packageName, 'Payed');
		const PError = await deep.id(packageName, 'Error');
		const PCancelled = await deep.id(packageName, 'Cancelled');

		const paymentTreeId = await deep.id(packageName, 'paymentTree');

		console.log({ paymentTreeId });

		const Type = await deep.id('@deep-foundation/core', 'Type');
		const Any = await deep.id('@deep-foundation/core', 'Any');

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
			const { data: objectLinks } = await deep.select({
				type_id: PObject,
			});

			const { data: sumLinks } = await deep.select({
				type_id: PSum,
			});

			const { data: payLinks } = await deep.select({
				type_id: PPay,
			});

			const { data: urlLinks } = await deep.select({
				type_id: PUrl,
			});

			const { data: payedLinks } = await deep.select({
				type_id: PPayed,
			});

			const { data: errorLinks } = await deep.select({
				type_id: PError,
			});

			
			const { data: cancelledLinks } = await deep.select({
				type_id: PCancelled,
			});

			const allLinks = [
				...objectLinks,
				...sumLinks,
				...payLinks,
				...urlLinks,
				...payedLinks,
				...errorLinks,
				...cancelledLinks
			];
			for (let i = 0; i < allLinks.length; i++) {
				const { id } = allLinks[i];
				await deep.delete({ id: id });
			}
			console.log('Deleted test links');
		};

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

		const testCancelRealization = async () => {
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

				let initResult = await sendInit(initOptions);

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

				const noTokenCancelData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
					Amount: PRICE,
				};

				const cancelOptions = {
					...noTokenCancelData,
					Token: generateToken(noTokenCancelData),
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

				let initResult = await sendInit({
					...initOptions,
				});

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

				const noTokenCancelData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
					Amount: Math.floor(PRICE / 3),
				};

				const cancelOptions = {
					...noTokenCancelData,
					Token: generateToken(noTokenCancelData),
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

				const noTokenCancelData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
					Amount: PRICE,
				};

				const options = {
					...noTokenCancelData,
					Token: generateToken(noTokenCancelData),
				};

				console.log({ options });

				const cancelResult = await cancel(options);

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

				const noTokenCancelData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
					Amount: Math.floor(PRICE / 3),
				};

				const options = {
					...noTokenCancelData,
					Token: generateToken(noTokenCancelData),
				};

				console.log({ options });

				{
					const cancelResult = await cancel(options);

					expect(cancelResult.error).to.equal(undefined);
					expect(cancelResult.response.Status).to.equal('PARTIAL_REFUNDED');
				}
				{
					const cancelResult = await cancel(options);

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

				const noTokenCancelData = {
					TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
					PaymentId: bankPaymentId,
					Amount: PRICE,
				};

				const options = {
					...noTokenCancelData,
					Token: generateToken(noTokenCancelData),
				};

				console.log({ options });

				const cancelResult = await cancel(options);

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

				const {data: [payedLink]} = await deep.select({
					type_id: PPayed,
					to_id: payLink.id
				});

				const {data: [cancelledLink]} = await deep.insert({
					type_id: PCancelled,
					from_id: tinkoffProviderId,
					to_id: payedLink.id,
					number: {data: {value: PRICE}}
				});

				await sleep(5000);

				const {data: cancelledErrors} = await deep.select({
					type_id: PError,
					to_id: cancelledLink.id
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

				const {data: [payedLink]} = await deep.select({
					type_id: PPayed,
					to_id: payLink.id
				});

				for (let i = 0; i < 2; i++) {
					const {data: [cancelledLink]} = await deep.insert({
						type_id: PCancelled,
						from_id: tinkoffProviderId,
						to_id: payedLink.id,
						number: {data: {value: PRICE / 3}}
					});
	
					await sleep(5000);
	
					const {data: cancelledErrors} = await deep.select({
						type_id: PError,
						to_id: cancelledLink.id
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

				const {data: [cancelledLink]} = await deep.insert({
					type_id: PCancelled,
					from_id: tinkoffProviderId,
					to_id: payLink.id,
					number: {data: {value: PRICE}}
				});

				await sleep(5000);

				const {data: cancelledErrors} = await deep.select({
					type_id: PError,
					to_id: cancelledLink.id
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

			const noTokenGetStateData = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
			};

			const newGetStateData = {
				...noTokenGetStateData,
				PaymentId: bankPaymentId,
			};

			const options = {
				...newGetStateData,
				Token: generateToken(newGetStateData),
			};

			const getStateResult = await getState(options);

			expect(getStateResult.error).to.equal(undefined);
			console.log('testGetState-end');
		};

		const testGetCardList = async () => {
			console.log('testGetCardList-end');
			await testFinishAuthorize();

			const noTokenGetCardListData = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				CustomerKey: deep.linkId,
			};

			const options = {
				...noTokenGetCardListData,
				Token: generateToken(noTokenGetCardListData),
			};

			const getCardListResult = await getCardList(options);

			expect(getCardListResult.error).to.equal(undefined);
			console.log('testGetCardList-end');
		};

		const testResend = async () => {
			console.log('testResend-start');
			const noTokenResendOptions = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
			};

			const resendOptions = {
				...noTokenResendOptions,
				Token: generateToken(noTokenResendOptions),
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

			const initResult = await sendInit({
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				Amount: 5500,
				OrderId: uniqid(),
				CustomerKey: deep.linkId,
				Recurrent: 'Y',
			});

			await payInBrowser({
				browser,
				page,
				url: initResult.response.PaymentURL,
			});

			const noTokenGetCardListOptions = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				CustomerKey: deep.linkId,
			};

			const getCardListOptions = {
				...noTokenGetCardListOptions,
				Token: generateToken(noTokenGetCardListOptions),
			};

			const getCardListResult = await getCardList(getCardListOptions);

			expect(getCardListResult.response[0].RebillId).to.have.length.above(0);

			const noTokenGetStateOptions = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				PaymentId: initResult.response.PaymentId,
			};

			const getStateOptions = {
				...noTokenGetStateOptions,
				Token: generateToken(noTokenGetStateOptions),
			};

			const getStateResult = await getState(getStateOptions);

			expect(getStateResult.response.Status).to.equal('AUTHORIZED');

			const newInitResult = await sendInit({
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				Amount: 5500,
				OrderId: uniqid(),
				CustomerKey: deep.linkId,
			});

			const newChargeData = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				PaymentId: newInitResult.response.PaymentId,
				RebillId: Number(getCardListResult.response[0].RebillId),
			};

			const options = {
				...newChargeData,
				Token: generateToken(newChargeData),
			};

			const chargeResult = await charge(options);

			expect(chargeResult.error).to.equal(undefined);
			console.log('testCharge-end');
		};

		const testAddCustomer = async () => {
			console.log('testAddCustomer-start');

			const customerKey = uniqid();

			const noTokenAddCustomerOptions = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				CustomerKey: customerKey,
			};

			const addCustomerOptions = {
				...noTokenAddCustomerOptions,
				Token: generateToken(noTokenAddCustomerOptions),
			};

			const addCustomerResult = await addCustomer(addCustomerOptions);

			expect(addCustomerResult.error).to.equal(undefined);
			console.log('testAddCustomer-end');
		};

		const testGetCustomer = async () => {
			console.log('testGetCustomer-start');

			const customerKey = uniqid();

			const noTokenAddCustomerData = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				CustomerKey: customerKey,
			};

			const newAddCustomerData = {
				...noTokenAddCustomerData,
				Phone: process.env.PAYMENT_TEST_PHONE,
			};

			const addCustomerDataOptions = {
				...newAddCustomerData,
				Token: generateToken(newAddCustomerData),
			};

			const addResult = await addCustomer(addCustomerDataOptions);

			expect(addResult.error).to.equal(undefined);

			const getCustomerDataOptions = {
				...noTokenAddCustomerData,
				Token: generateToken(noTokenAddCustomerData),
			};

			const getResult = await getCustomer(getCustomerDataOptions);

			expect(getResult.error).to.equal(undefined);
			expect(getResult.response.Phone).to.equal(process.env.PAYMENT_TEST_PHONE);

			console.log('testGetCustomer-end');
		};

		const testRemoveCustomer = async () => {
			console.log('testRemoveCustomer-start');

			const customerKey = uniqid();

			const noTokenRemoveCustomerData = {
				TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
				CustomerKey: customerKey,
			};

			const newAddCustomerData = {
				...noTokenRemoveCustomerData,
				Phone: process.env.PAYMENT_TEST_PHONE,
			};

			const addCustomerDataOptions = {
				...newAddCustomerData,
				Token: generateToken(newAddCustomerData),
			};

			const addResult = await addCustomer(addCustomerDataOptions);

			expect(addResult.error).to.equal(undefined);

			const removeCustomerDataOptions = {
				...noTokenRemoveCustomerData,
				Token: generateToken(noTokenRemoveCustomerData),
			};

			const removeResult = await removeCustomer(removeCustomerDataOptions);

			expect(removeResult.error).to.equal(undefined);

			console.log('testRemoveCustomer-end');
		};

		await testInit();
		await deleteTestLinks();
		await testConfirm();
		await deleteTestLinks();
		await testCancelRealization();
		await deleteTestLinks();
		await testCancelIntegration();
		await deleteTestLinks();
		await testGetState();
		await deleteTestLinks();
		await testGetCardList();
		await deleteTestLinks();
		await testResend();
		await deleteTestLinks();
		await testCharge();
		await deleteTestLinks();
		await testAddCustomer();
		await deleteTestLinks();
		await testGetCustomer();
		await deleteTestLinks();
		await testRemoveCustomer();
		await deleteTestLinks();
	};

	await callTests();
};

f();
