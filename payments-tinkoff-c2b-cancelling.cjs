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

console.log("Installing @deep-foundation/payments-tinkoff-c2b-cancelling package");

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
  const generateTokenString = generateToken.toString()
    .replace(
      'process.env.PAYMENT_TEST_TERMINAL_PASSWORD',
      `"${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}"`
    );
  console.log({ generateTokenString });

  const getUrl = (method) =>
    `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;
  getUrlString = getUrl.toString()
    .replace(
      '${process.env.PAYMENT_EACQ_AND_TEST_URL}',
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

  const {
    data: [{ id: packageId }],
  } = await deep.insert({
    type_id: Package,
    string: { data: { value: '@deep-foundation/payments-tinkoff-c2b' } },
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

  const SumProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "SumProvider");
  console.log({ SumProvider: SumProvider });

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  console.log({ TinkoffProvider });

  const Payment = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
  console.log({ Payment: Payment });

  const Object = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Object");
  console.log({ Object: Object });

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  console.log({ Sum: Sum });

  const Pay = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
  console.log({ Pay });

  const {
    data: [{ id: CancellingPay }],
  } = await deep.insert({
    type_id: /* Pay */ Type,
    from_id: User,
    to_id: Sum,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'CancellingPay' } },
      },
    },
  });
  console.log({ CancellingPay });

  const Url = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");
  console.log({ Url: Url });

  const Payed = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed");
  console.log({ Payed: Payed });

  const Error = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error");
  console.log({ Error: Error });

  const paymentTreeId = await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree");
  console.log({ paymentTreeId });

  const StorageBusiness = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageBusiness");
  console.log({ StorageBusiness });


  const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
  console.log({ Token });

  const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
  console.log({ StorageClient });

  const Title = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
  console.log({ Title });

  const {
    data: [{ id: CancellingPayment }],
  } = await deep.insert({
    type_id: Type,
    from_id: Payment,
    to_id: User,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'CancellingPayment' } },
      },
    },
  });
  console.log({ CancellingPayment });

  await deep.insert({
    type_id: TreeIncludeUp,
    from_id: paymentTreeId,
    to_id: CancellingPayment,
    in: {
      data: [
        {
          type_id: Contain,
          from_id: deep.linkId,
        },
      ],
    },
  });

  await deep.insert({
    type_id: TreeIncludeUp,
    from_id: paymentTreeId,
    to_id: CancellingPay,
    in: {
      data: [
        {
          type_id: Contain,
          from_id: deep.linkId,
        },
      ],
    },
  });

  const handlersDependencies = `
  const crypto = require('crypto');
  const axios = require('axios');
  const errorsConverter = ${JSON.stringify(errorsConverter)};
  const getError = ${getError.toString()};
  const getUrl = ${getUrlString};
  const _generateToken = ${_generateToken.toString()};
  const generateToken = ${generateTokenString};
  `;
  console.log({ handlersDependencies });
  const payInsertHandler = `
async ({ deep, require, data: { newLink: payLink } }) => {
  ${handlersDependencies}

  const Contain = await deep.id("@deep-foundation/core", 'Contain');

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const CancellingPayment = await deep.id("@deep-foundation/payments-tinkoff-c2b", "CancellingPayment");
  const cancellingPaymentLink = mpDownPay.find(link => link.type_id === CancellingPayment);
  console.log({cancellingPaymentLink});
  if(!cancellingPaymentLink) {
    return;
  }

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLink = tinkoffProviderLinkSelectQuery.data[0];

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === Sum); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + payLink.id + " is not found.");

  const Url = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");

  const cancelledPaymentLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.from_id
  });
  if(cancelledPaymentLinkSelectQuery.error) { throw new Error(cancelledPaymentLinkSelectQuery.error.message); }
  const cancelledPaymentLink = fromLinkOfPaymentQuery.data[0];
  console.log({cancelledPaymentLink}); 

  const userLinkSelectQuery = await deep.select({
    id: cancellingPaymentLink.to_id
  });
  if(userLinkSelectQuery.error) { throw new Error(userLinkSelectQuery.error.message); }
  const userLink = userLinkSelectQuery.data[0];
  console.log({userLink});
  
  const cancel = ${cancel.toString()};

  await deep.insert({link_id: cancellingPaymentLink.id, value: cancelledPaymentLink.value.value}, {table: "objects"});

  const cancelOptions = {
    TerminalKey: "${process.env.PAYMENT_TEST_TERMINAL_KEY}",
    PaymentId: cancelledPaymentLink.value.value.bankPaymentId,
    Amount: sumLink.value.value,
  };
  console.log({ cancelOptions });

  const cancelResult = await cancel(cancelOptions);
  console.log({cancelResult});
  if (cancelResult.error) {
    const errorMessage = "Could not cancel the order. " + JSON.stringify(cancelResult.error);

    const {error: errorLinkInsertQueryError} = await deep.insert({
      type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
      from_id: tinkoffProviderLink.id,
      to_id: payLink.id,
      string: { data: { value: errorMessage } },
      in: {
        data: [
          {
            type_id: Contain,
            from_id: deep.linkId,
          },
        ],
      },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  } 

  const {error: payedLinkInsertQueryError} = await deep.insert({
    type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderLink.id,
    to_id: payLink.id,
    in: {
      data: [
        {
          type_id: Contain,
          from_id: deep.linkId,
        },
      ],
    },
  });
  if(payedLinkInsertQueryError) {throw new Error(payedLinkInsertQueryError.message); }
  
};
`;
  console.log({ payInsertHandler });

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
                from_id: CancellingPay,
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

  const tinkoffNotificationHandler = `
async (
  req,
  res,
  next,
  { deep, require, gql }
) => {
  ${handlersDependencies}
  const reqBody = req.body;
  console.log({reqBody});

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLink = tinkoffProviderLinkSelectQuery.data[0];

  const cancellingPaymentLinkelectQuery = await deep.select({
    object: {value: {_contains: {orderId: req.body.OrderId}}}
  });
  console.log({cancellingPaymentLink});
  if(cancellingPaymentLinkelectQuery.error) { throw new Error(cancellingPaymentLinkelectQuery.error.message); }
  const cancellingPaymentLink = cancellingPaymentLinkelectQuery.data[0];
  if(!cancellingPaymentLink) { throw new Error("The cancelling payment link associated with the order id " + req.body.OrderId + " is not found."); }

  const {data: mpUpcancellingPaymentLink, error: mpUpcancellingPaymentLinkSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: cancellingPaymentLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
    }
  });
  console.log({mpUpcancellingPaymentLink});
  if(mpUpcancellingPaymentLinkSelectQueryError) { throw new Error(mpUpcancellingPaymentLinkSelectQueryError.message); }

  const Pay = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
  const payLink = mpUpcancellingPaymentLink.find(link => link.type_id === Pay);
  console.log({payLink});
  if(!payLink) { throw new Error("The pay link associated with cancelling payment link " + cancellingPaymentLink + " is not found.") }


  if (req.body.Status === 'CANCELLED') {
  const bankPaymentId = req.body.PaymentId;

  const {data: mpUpPayment, error: mpUpPaymentLinkSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: cancellingPaymentLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
    }
  });

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum")
  const sumLink = mpUpPayment.find(link => link.type_id === Sum);
  if(!sumLink) {throw new Error("Could not find sum link associated with the cancelling payment " + cancellingPaymentLink);}
  
  const Payed = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed")
  const payedInsertLinkInsertQuery = await deep.insert({
    type_id: Payed,
    from_id: tinkoffProviderLink.id,
    to_id: sumLink.id,
    in: {
      data: [
        {
          type_id: Contain,
          from_id: deep.linkId,
        },
      ],
    },
  });
  if(payedInsertLinkInsertQuery.error) {throw new Error(payedInsertLinkInsertQuery.error.message);}
  }

  res.send('ok');
};
`;
  console.log({ tinkoffNotificationHandler });

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
                                  in: {
                                    data: {
                                      type_id: Contain,
                                      from_id: packageId,
                                      string: {
                                        data: {
                                          value: 'tinkoffNotificationHandler',
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
      },
    },
    {
      name: 'INSERT_HANDLE_ROUTE_HIERARCHICAL',
    }
  );

  const callTests = async () => {
    console.log('callTests-start');

    const callRealizationTests = async () => {
      const testInit = async () => {
        const initOptions = {
          TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
          OrderId: uniqid(),
          Amount: PRICE,
          Description: 'Test shopping',
          CustomerKey: deep.linkId,
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

        return initResult;
      };

      const testConfirm = async () => {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();

        const initOptions = {
          TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
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
          // 	Email: process.env.PAYMENT_TEST_EMAIL,
          // 	Phone: process.env.PAYMENT_TEST_PHONE,
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
          TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
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
          const confirmResult = await testConfirm();
          console.log({ confirmResult });

          const bankPaymentId = confirmResult.response.PaymentId;
          console.log({ bankPaymentId });

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
          const confirmResult = await testConfirm();

          const bankPaymentId = confirmResult.response.PaymentId;

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
          const initResult = await testInit();

          const bankPaymentId = initResult.response.PaymentId;;

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

      const setup = async () => {
        const createdLinks = [];

    const {
      data: [tinkoffProviderLink],
    } = await deep.insert({
      type_id: TinkoffProvider,
      in: {
        data: [
          {
            type_id: Contain,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ tinkoffProviderLink });
    createdLinks.push(tinkoffProviderLink);

    const {
      data: [sumProviderLink],
    } = await deep.insert({
      type_id: SumProvider,
      in: {
        data: [
          {
            type_id: Contain,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ sumProviderLink });
    createdLinks.push(sumProviderLink);

    const {
      data: [storageBusinessLink],
    } = await deep.insert({
      type_id: StorageBusiness,
      in: {
        data: [
          {
            type_id: Contain,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ storageBusinessLink });
    createdLinks.push(storageBusinessLink);

    const {
      data: [tokenLink],
    } = await deep.insert({
      type_id: Token,
      from_id: storageBusinessLink.id,
      to_id: storageBusinessLink.id,
      string: { data: { value: process.env.PAYMENT_TEST_TERMINAL_KEY } },
      in: {
        data: [
          {
            type_id: Contain,
            from_id: deep.linkId,
          },
        ],
      },
    });
    console.log({ tokenLink });
    createdLinks.push(tokenLink);

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
    createdLinks.push(Product);

    const {
      data: [productLink],
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
    console.log({ productId });
    createdLinks.push(productId);

    return {createdLinks}
      }

      const testInit = async ({ customerKey } = { customerKey: uniqid() }) => {
        console.log('testInit-start');

        const createdLinks = [];

        const {
          data: [paymentLink],
        } = await deep.insert({
          type_id: Payment,
          object: { data: { value: { orderId: uniqid() } } },
          from_id: deep.linkId,
          to_id: storageBusinessLink.id,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ paymentLink });
        createdLinks.push(paymentLink);

        const {
          data: [sumLink],
        } = await deep.insert({
          type_id: Sum,
          from_id: sumProviderLink.id,
          to_id: paymentLink.id,
          number: { data: { value: PRICE } },
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ sumLink });
        createdLinks.push(sumLink);

        const {
          data: [objectLink],
        } = await deep.insert({
          type_id: Object,
          from_id: paymentLink.id,
          to_id: productLink.id,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ objectLink });
        createdLinks.push(objectLink);

        const {
          data: [payLink],
        } = await deep.insert({
          type_id: Pay,
          from_id: deep.linkId,
          to_id: sumLink.id,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ payLink });
        createdLinks.push(payLink);

        await sleep(9000);

        const {
          data,
        } = await deep.select({
          type_id: Url,
          to_id: payLink.id,
        }); 

        expect(data.length).to.greaterThan(0);

        createdLinks.push(data[0]);

        console.log('testInit-end');

        return {
          createdLinks
        }
      };

      const testFinishAuthorize = async ({ customerKey } = { customerKey: uniqid() }) => {
        console.log('testFinishAuthorize-start');
        const {createdLinks} = await testInit({ customerKey });

        const urlLink = createdLinks.find(link => link.type_id === Url);
        expect(urlLink).to.not.be.undefined()

        const url = urlLink.value.value;
        console.log({url});

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await payInBrowser({
          browser,
          page,
          url,
        });
        console.log('testFinishAuthorize-end');

        return {
          createdLinks
        }
      };

      const testConfirm = async ({ customerKey } = { customerKey: uniqid() }) => {
        console.log('testConfirm-start');
        const {createdLinks} = await testFinishAuthorize({ customerKey });
        await sleep(7000);

        const payLink = createdLinks.find(link => link.type_id === Pay);
        expect(payLink).to.be.not.undefined();

        const {data} = await deep.select({
          type_id: Payed,
          to_id: payLink.id
        });

        expect(data.length).to.greaterThan(0);

        createdLinks.push(data[0]);

        console.log('testConfirm-end');

        return {
          createdLinks
        }
      };

      const callCancelTests = async () => {
        console.log('testCancel-start');
        const testCancelAfterPayAfterConfirmFullPrice = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testCancelAfterPayAfterConfirmFullPrice-start');
          const {createdLinks} = await testConfirm({ customerKey });

          const paymentLink = createdLinks.find(link => link.type_id === Payment);
          console.log({ paymentLink });

          const cancellingPaymentLinkInsertQuery = await deep.insert({
            type_id: CancellingPayment,
            from_id: paymentLink.id,
            to_id: deep.linkId,
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ cancellingPaymentLinkInsertQuery });
          if (cancellingPaymentLinkInsertQuery.error) { throw new Error(cancellingPaymentLinkInsertQuery.error.message); }
          const cancellingPaymentLink = cancellingPaymentLinkInsertQuery.data[0];
          console.log({ cancellingPaymentLink });
          createdLinks.push(cancellingPaymentLink);

          await sleep(3000);

          const {
            data: [sumLinkOfCancellingPayment]
          } = await deep.insert({
            type_id: Sum,
            from_id: sumProviderLink.id,
            to_id: cancellingPaymentLink.id,
            number: { data: { value: PRICE } },
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ sumLinkOfCancellingPayment });
          createdLinks.push(sumLinkOfCancellingPayment);

          await sleep(5000);

          const payLinkInsertQuery = await deep.insert({
            type_id: CancellingPay,
            from_id: deep.linkId,
            to_id: sumLinkOfCancellingPayment.id,
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ payLinkInsertQuery });
          if (payLinkInsertQuery.error) { throw new Error(payLinkInsertQuery.error.message); }
          createdLinks.push(payLinkInsertQuery.data[0]);

          await sleep(3000);

          const { data: mpUpCancellingPayment, error: mpUpCancellingPaymentSelectQueryError } = await deep.select({
            up: {
              parent_id: { _eq: cancellingPaymentLink.id },
              tree_id: { _eq: paymentTreeId }
            }
          });
          if (mpUpCancellingPaymentSelectQueryError) { throw new Error(mpUpCancellingPaymentSelectQueryError); }
          const Payed = await deep.id('@deep-foundation/payments-tinkoff-c2b', "Payed");
          const payedLink = mpUpCancellingPayment.find(link => link.type_id === Payed);
          expect(payedLink).to.not.equal(undefined);
          createdLinks.push(payedLink);

          console.log('testCancelAfterPayAfterConfirmFullPrice-end');

          return {createdLinks};
        };

        const testCancelAfterPayAfterConfirmCustomPriceX2 = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testCancelAfterPayAfterConfirmCustomPriceX2-start');
          const {createdLinks} = await testConfirm({ customerKey });

          const paymentLink = createdLinks.find(link => link.type_id === Payment);
          console.log({ paymentLink });

          for (let i = 0; i < 2; i++) {
            const cancellingPaymentLinkInsertQuery = await deep.insert({
              type_id: CancellingPayment,
              from_id: paymentLink.id,
              to_id: deep.linkId,
              in: {
                data: [
                  {
                    type_id: Contain,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            console.log({ cancellingPaymentLinkInsertQuery });
            if (cancellingPaymentLinkInsertQuery.error) { throw new Error(cancellingPaymentLinkInsertQuery.error.message); }
            const cancellingPaymentLink = cancellingPaymentLinkInsertQuery.data[0];
            console.log({ cancellingPaymentLink });
            createdLinks.push(cancellingPaymentLink);

            await sleep(3000);

            const {
              data: [sumLinkOfCancellingPayment]
            } = await deep.insert({
              type_id: Sum,
              from_id: sumProviderLink.id,
              to_id: cancellingPaymentLink.id,
              number: { data: { value: Math.floor(PRICE / 3) } },
              in: {
                data: [
                  {
                    type_id: Contain,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            console.log({ sumLinkOfCancellingPayment });
            createdLinks.push(sumLinkOfCancellingPayment);

            const cancellingPayLinkInsertQuery = await deep.insert({
              type_id: CancellingPay,
              from_id: deep.linkId,
              to_id: sumLinkOfCancellingPayment.id,
              in: {
                data: [
                  {
                    type_id: Contain,
                    from_id: deep.linkId,
                  },
                ],
              },
            });
            console.log({ cancellingPayLinkInsertQuery });
            if (cancellingPayLinkInsertQuery.error) { throw new Error(cancellingPayLinkInsertQuery.error.message); }
            createdLinks.push(cancellingPayLinkInsertQuery.data[0]);

            await sleep(3000);

            const { data: mpUpCancellingPayment, error: mpUpCancellingPaymentSelectQueryError } = await deep.select({
              up: {
                parent_id: { _eq: cancellingPaymentLink.id },
                tree_id: { _eq: paymentTreeId }
              }
            });
            console.log({ mpUpCancellingPayment });
            if (mpUpCancellingPaymentSelectQueryError) { throw new Error(mpUpCancellingPaymentSelectQueryError); }
            const Payed = await deep.id('@deep-foundation/payments-tinkoff-c2b', "Payed");
            const payedLink = mpUpCancellingPayment.find(link => link.type_id === Payed);
            expect(payedLink).to.not.equal(undefined);
            createdLinks.push(payedLink);
          }

          console.log('testCancelAfterPayAfterConfirmCustomPriceX2-end');

          return {createdLinks}
        };

        const testCancelBeforePay = async ({ customerKey } = { customerKey: uniqid() }) => {
          console.log('testCancelBeforePay-start');
          const {createdLinks} = await testInit({ customerKey });

          const paymentLink = createdLinks.find(link => link.type_id === Payment);
          console.log({ paymentLink });

          const cancellingPaymentLinkInsertQuery = await deep.insert({
            type_id: CancellingPayment,
            from_id: paymentLink.id,
            to_id: deep.linkId,
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ cancellingPaymentLinkInsertQuery });
          if (cancellingPaymentLinkInsertQuery.error) { throw new Error(cancellingPaymentLinkInsertQuery.error.message); }
          const cancellingPaymentLink = cancellingPaymentLinkInsertQuery.data[0];
          console.log({ cancellingPaymentLink });
          createdLinks.push(cancellingPaymentLink);

          await sleep(3000);

          const {
            data: [sumLinkOfCancellingPayment]
          } = await deep.insert({
            type_id: Sum,
            from_id: sumProviderLink.id,
            to_id: cancellingPaymentLink.id,
            number: { data: { value: PRICE } },
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ sumLinkOfCancellingPayment });
          createdLinks.push(sumLinkOfCancellingPayment);

          await sleep(5000);

          const cancellingPayLinkInsertQuery = await deep.insert({
            type_id: CancellingPay,
            from_id: deep.linkId,
            to_id: sumLinkOfCancellingPayment.id,
            in: {
              data: [
                {
                  type_id: Contain,
                  from_id: deep.linkId,
                },
              ],
            },
          });
          console.log({ cancellingPayLinkInsertQuery });
          if (cancellingPayLinkInsertQuery.error) { throw new Error(cancellingPayLinkInsertQuery.error.message); }
          createdLinks.push(cancellingPayLinkInsertQuery.data[0]);

          await sleep(3000);

          const { data: mpUpCancellingPayment, error: mpUpCancellingPaymentSelectQueryError } = await deep.select({
            up: {
              parent_id: { _eq: cancellingPaymentLink.id },
              tree_id: { _eq: paymentTreeId }
            }
          });
          if (mpUpCancellingPaymentSelectQueryError) { throw new Error(mpUpCancellingPaymentSelectQueryError); }
          const Payed = await deep.id('@deep-foundation/payments-tinkoff-c2b', "Payed");
          const payedLink = mpUpCancellingPayment.find(link => link.type_id === Payed);
          expect(payedLink).to.not.equal(undefined);
          createdLinks.push(payedLink);

          console.log('testCancelBeforePay-end');

          return {createdLinks}
        };

        var createdLinks;
        const {createdLinks} = await testCancelAfterPayAfterConfirmFullPrice();
        await deep.delete(createdLinks);
        const {createdLinks} = await testCancelAfterPayAfterConfirmCustomPriceX2();
        await deep.delete(createdLinks);
        const {createdLinks} = await testCancelBeforePay();
        await deep.delete(createdLinks);

        console.log('testCancel-end');

        return {createdLinks}
      };

      const {createdLinks} = await setup();
      await callCancelTests();
      await deep.delete(createdLinks.map(link => link.id));
    };

    // await callRealizationTests();
    await callIntegrationTests();

    await deep.delete(linkIdsToDelete);
  };

  await callTests();
};

f();