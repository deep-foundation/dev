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

console.log('Installing payments-tinkoff-c2b package');
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
  const generateTokenString = generateToken
    .toString()
    .replace(
      'process.env.PAYMENT_TEST_TERMINAL_PASSWORD',
      `"${process.env.PAYMENT_TEST_TERMINAL_PASSWORD}"`
    );
  console.log({ generateTokenString });

  const getUrl = (method) =>
    `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;
  getUrlString = getUrl
    .toString()
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

    console.log({ bankPaymentId });
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
  const Storage = await deep.id('@deep-foundation/payments', 'Storage');

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

  const {
    data: [{ id: SumProvider }],
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

  console.log({ SumProvider: SumProvider });

  const {
    data: [{ id: TinkoffProvider }],
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

  console.log({ TinkoffProvider });

  const {
    data: [{ id: Payment }],
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

  console.log({ Payment: Payment });

  const {
    data: [{ id: Object }],
  } = await deep.insert({
    type_id: BaseObject,
    from_id: Payment,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'Object' } },
      },
    },
  });

  console.log({ Object: Object });

  const {
    data: [{ id: Sum }],
  } = await deep.insert({
    type_id: BaseSum,
    from_id: SumProvider,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Sum' } },
      },
    },
  });

  console.log({ Sum: Sum });

  // TODO Rest restrictions
  const {
    data: [{ id: Pay }],
  } = await deep.insert({
    type_id: BasePay,
    from_id: Any,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Pay' } },
      },
    },
  });

  console.log({ Pay: Pay });

  const {
    data: [{ id: Url }],
  } = await deep.insert({
    type_id: BaseUrl,
    from_id: TinkoffProvider,
    to_id: Pay,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Url' } },
      },
    },
  });

  console.log({ Url: Url });

  const {
    data: [{ id: Payed }],
  } = await deep.insert({
    type_id: BasePayed,
    from_id: TinkoffProvider,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Payed' } },
      },
    },
  });

  console.log({ Payed: Payed });

  const {
    data: [{ id: Error }],
  } = await deep.insert({
    type_id: BaseError,
    from_id: TinkoffProvider,
    to_id: Pay,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Error' } },
      },
    },
  });

  console.log({ Error: Error });

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
          to_id: Payment,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeUp,
          to_id: Sum,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeDown,
          to_id: Object,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeUp,
          to_id: Error,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeUp,
          to_id: Payed,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeUp,
          to_id: Pay,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
        {
          type_id: TreeIncludeUp,
          to_id: Url,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        },
      ],
    },
  });

  const {
    data: [{ id: StorageBusiness }],
  } = await deep.insert({
    type_id: Storage,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'StorageBusiness' } },
      },
    },
  });

  const {
    data: [{ id: Token }],
  } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Token' } },
      },
    },
  });

  const {
    data: [{ id: StorageClient }],
  } = await deep.insert({
    type_id: Storage,
    from_id: Payment,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'StorageClient' } },
      },
    },
  });

  const {
    data: [{ id: Title }],
  } = await deep.insert({
    type_id: Type,
    from_id: StorageClient,
    to_id: SyncTextFile,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Title' } },
      },
    },
  });
  console.log({ Title });

  const {
    data: [{ id: Income }],
  } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: {
      data: {
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'Income' } },
      },
    },
  });
  console.log({ Income });

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

  const TinkoffProvider = await deep.id("@deep-foundation/payments-tinkoff-c2b", "TinkoffProvider");
  const tinkoffProviderLinkSelectQuery = await deep.select({
    type_id: TinkoffProvider
  });
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;

  const {data: mpDownPay, error: mpDownPaySelectQueryError} = await deep.select({
    down: {
      link_id: { _eq: payLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") },
    },
  });
  console.log({mpDownPay});
  if(mpDownPaySelectQueryError) { throw new Error(mpDownPaySelectQueryError.message); }

  const Payment = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payment");
  const paymentLink = mpDownPay.find(link => link.type_id === Payment);
  console.log({paymentLink});
  if(!paymentLink) throw new Error("Payment link associated with the pay link " + payLink.id + " is not found.");

  const Sum = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Sum");
  const sumLink = mpDownPay.find(link => link.type_id === Sum); 
  console.log({sumLink});
  if(!sumLink) throw new Error("Sum link associated with the pay link " + payLink.id + " is not found.");

  const Url = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Url");

  const userLinkSelectQuery = await deep.select({
    id: paymentLink.from_id
  });
  if(userLinkSelectQuery.error) { throw new Error(userLinkSelectQuery.error.message); }
  const userLink = userLinkSelectQuery.data[0];
  console.log({userLink});

  const storageBusinessLinkSelectQuery = await deep.select({
    id: paymentLink.to_id
  });
  if(storageBusinessLinkSelectQuery.error) { throw new Error(storageBusinessLinkSelectQuery.error.message); }
  const storageBusinessLinkId = storageBusinessLinkSelectQuery.data[0].id;
  console.log({storageBusinessLinkId});
  
  const init = ${init.toString()};

  const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
  const tokenLinkSelectQuery = await deep.select({
    type_id: Token,
    from_id: storageBusinessLinkId,
    to_id: storageBusinessLinkId
  });
  if(tokenLinkSelectQuery.error) {throw new Error(tokenLinkSelectQuery.error.message);}
  const tokenLink = tokenLinkSelectQuery.data[0];
  console.log({tokenLink});

  const options = {
    TerminalKey: tokenLink.value.value,
    OrderId: paymentLink?.value?.value.orderId ?? paymentLink.id,
    CustomerKey: deep.linkId,
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

  let initResult = await init(options);
  console.log({initResult});
  if (initResult.error) {
    const errorMessage = "Could not initialize the order. " + initResult.error;
    const {error: errorLinkInsertQueryError} = await deep.insert({
      type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
      from_id: tinkoffProviderLinkId,
      to_id: payLink.id,
      string: { data: { value: errorMessage } },
    });
    if(errorLinkInsertQueryError) { throw new Error(errorLinkInsertQueryError.message); }
    throw new Error(errorMessage);
  }

  const {error: urlLinkInsertQueryError} = await deep.insert({
    type_id: Url,
    from_id: tinkoffProviderLinkId,
    to_id: payLink.id,
    string: { data: { value: initResult.response.PaymentURL } },
  });
  if(urlLinkInsertQueryError) { throw new Error(urlLinkInsertQueryError.message); }

  console.log("paymentLink.value.value", paymentLink.value.value);
  console.log("paymentLink.value.value", paymentLink.value.value);
  const paymentLinkValueUpdateQuery = await deep.update({link_id: {_eq: paymentLink.id}}, {value: {...paymentLink.value.value, bankPaymentId: initResult.response.PaymentId}}, {table: "objects"});
  console.log({paymentLinkValueUpdateQuery});
  if(paymentLinkValueUpdateQuery.error) { throw new Error(paymentLinkValueUpdateQuery.error.message); }
  
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
                from_id: Pay,
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
  console.log({tinkoffProviderLinkSelectQuery});
  if(tinkoffProviderLinkSelectQuery.error) {throw new Error(tinkoffProviderLinkSelectQuery.error.message);}
  const tinkoffProviderLinkId = tinkoffProviderLinkSelectQuery.data[0].id;
  console.log({tinkoffProviderLinkId});

  const paymentLinkSelectQuery = await deep.select({
    object: {value: {_contains: {orderId: req.body.OrderId}}}
  });
  console.log({paymentLinkSelectQuery});
  if(paymentLinkSelectQuery.error) { throw new Error(paymentLinkSelectQuery.error.message); }
  const paymentLink = paymentLinkSelectQuery.data[0];
  console.log({paymentLink});
  if(!paymentLink) { throw new Error("The payment link associated with the order id " + req.body.OrderId + " is not found."); }

  const {data: mpUpPayment, error: mpUpPaymentSelectQueryError} = await deep.select({
    up: {
      parent_id: { _eq: paymentLink.id },
      tree_id: { _eq: await deep.id("@deep-foundation/payments-tinkoff-c2b", "paymentTree") }
    }
  });
  console.log({mpUpPayment});
  if(mpUpPaymentSelectQueryError) { throw new Error(mpUpPaymentSelectQueryError.message); }

  const Pay = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Pay");
  const payLink = mpUpPayment.find(link => link.type_id === Pay);
  console.log({payLink});
  if(!payLink) { throw new Error("The pay link associated with payment link " + paymentLink + " is not found.") }


  if (req.body.Status === 'AUTHORIZED') {
  const confirm = ${confirm.toString()};

  const storageBusinessLinkSelectQuery = await deep.select({
    id: paymentLink.to_id
  });
  console.log({storageBusinessLinkSelectQuery});
  if(storageBusinessLinkSelectQuery.error) {throw new Error(storageBusinessLinkSelectQuery.error.message);}
  const storageBusinessLinkId = storageBusinessLinkSelectQuery.data[0].id;
  console.log({storageBusinessLinkId});

  const Token = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Token");
  const tokenLinkSelectQuery = await deep.select({
    type_id: Token,
    from_id: storageBusinessLinkId,
    to_id: storageBusinessLinkId
  });
  console.log({tokenLinkSelectQuery});
  if(tokenLinkSelectQuery.error) {throw new Error(tokenLinkSelectQuery.error.message);}
  const tokenLink = tokenLinkSelectQuery.data[0];
  console.log({tokenLink});

    const confirmOptions = {
      TerminalKey: tokenLink.value.value,
      PaymentId: req.body.PaymentId,
      Amount: req.body.Amount,
      // Receipt: req.body.Receipt,
    };
    console.log({confirmOptions});

    const confirmResult = await confirm(confirmOptions);
    console.log({confirmResult});

    if (confirmResult.error) {
      const errorMessage = "Could not confirm the pay. " + confirmResult.error;
      const {error: errorLinkInsertError} = await deep.insert({
        type_id: (await deep.id("@deep-foundation/payments-tinkoff-c2b", "Error")),
        from_id: tinkoffProviderLinkId,
        to_id: payLink.id,
        string: { data: { value: errorMessage } },
      });
      if(errorLinkInsertError) { throw new Error(errorLinkInsertError); }
      throw new Error(errorMessage);
    }

    return confirmResult;
  } else if (req.body.Status === 'CONFIRMED') {
    const payedLinkInsertQuery = await deep.insert({
      type_id: await deep.id("@deep-foundation/payments-tinkoff-c2b", "Payed"),
    from_id: tinkoffProviderLinkId,
      to_id: payLink.id,
    });
  if(payedLinkInsertQuery.error) { throw new Error(payedLinkInsertQuery.error.message); }
  const payedLinkId = payedLinkInsertQuery.data[0].id;
  console.log({payedLinkId});

  const StorageClient = await deep.id("@deep-foundation/payments-tinkoff-c2b", "StorageClient");
  const storageClientLinkInsertQuery = await deep.insert({
    type_id: StorageClient,
    number: {data: {value: req.body.CardId}},
  });
  console.log({storageClientLinkInsertQuery});
  if(storageClientLinkInsertQuery.error) {throw new Error(storageClientLinkInsertQuery.error.message);}
  const storageClientLinkId = storageClientLinkInsertQuery.data[0].id;

  const Title = await deep.id("@deep-foundation/payments-tinkoff-c2b", "Title");
  const titleLinkInsertQuery = await deep.insert({
    type_id: Title,
    string: {data: {value: req.body.Pan}},
  });
  if(titleLinkInsertQuery.error) {throw new Error(titleLinkInsertQuery.error.message);}
  const titleLinkId = titleLinkInsertQuery.data[0].id;
  console.log({titleLinkId});

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

      const testGetState = async () => {
        const initResult = await init({
          TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
          OrderId: uniqid(),
          CustomerKey: deep.linkId,
          Amount: PRICE,
        });

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
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
        const initResult = await init({
          TerminalKey: process.env.PAYMENT_TEST_TERMINAL_KEY,
          CustomerKey: deep.linkId,
          OrderId: uniqid(),
          Amount: PRICE,
          Recurrent: 'Y',
        });

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
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
        console.log({ addCustomerOptions });

        const addCustomerResult = await addCustomer(addCustomerOptions);
        console.log({ addCustomerResult });

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
      await testGetState();
      await testGetCardList();
      await testResend();
      await testCharge();
      await testAddCustomer();
      await testGetCustomer();
      await testRemoveCustomer();
    };

    const callIntegrationTests = async () => {

      const createdLinkIds = [];

      const {
        data: [{ id: tinkoffProviderLinkId }],
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
      console.log({ tinkoffProviderLinkId });
      createdLinkIds.push(tinkoffProviderLinkId);

      const {
        data: [{ id: sumProviderLinkId }],
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
      console.log({ sumProviderLinkId });
      createdLinkIds.push(sumProviderLinkId);

      const {
        data: [{ id: storageBusinessLinkId }],
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
      console.log({ storageBusinessLinkId });
      createdLinkIds.push(storageBusinessLinkId);

      const {
        data: [{ id: tokenLinkId }],
      } = await deep.insert({
        type_id: Token,
        from_id: storageBusinessLinkId,
        to_id: storageBusinessLinkId,
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
      console.log({ tokenLinkId });
      createdLinkIds.push(tokenLinkId);

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
      createdLinkIds.push(Product);

      const {
        data: [{ id: productLinkId }],
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
      console.log({ productLinkId });
      createdLinkIds.push(productLinkId);

      const testInit = async ({ customerKey } = { customerKey: uniqid() }) => {
        console.log('testInit-start');

        const createdLinkIds = [];

        const {
          data: [{ id: paymentLinkId }],
        } = await deep.insert({
          type_id: Payment,
          object: { data: { value: { orderId: uniqid() } } },
          from_id: deep.linkId,
          to_id: storageBusinessLinkId,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ paymentLinkId });
        createdLinkIds.push(paymentLinkId);

        const {
          data: [{ id: sumLinkId }],
        } = await deep.insert({
          type_id: Sum,
          from_id: sumProviderLinkId,
          to_id: paymentLinkId,
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
        console.log({ sumLinkId });
        createdLinkIds.push(sumLinkId);

        const {
          data: [{ id: objectLinkId }],
        } = await deep.insert({
          type_id: Object,
          from_id: paymentLinkId,
          to_id: productLinkId,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ objectLinkId });
        createdLinkIds.push(objectLinkId);

        const {
          data: [{ id: payLinkId }],
        } = await deep.insert({
          type_id: Pay,
          from_id: deep.linkId,
          to_id: sumLinkId,
          in: {
            data: [
              {
                type_id: Contain,
                from_id: deep.linkId,
              },
            ],
          },
        });
        console.log({ payLinkId });
        createdLinkIds.push(payLinkId);

        var urlLinkSelectQuery;
        for (let i = 0; i < 10; i++) {
          urlLinkSelectQuery = await deep.select({
            type_id: Url,
            to_id: payLinkId,
          });

          if (urlLinkSelectQuery.data.length > 0) {
            break;
          }

          await sleep(1000);
        }

        expect(urlLinkSelectQuery.data.length).to.greaterThan(0);

        createdLinkIds.push(urlLinkSelectQuery.data[0].id);

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

        const urlLink = createdLinks.find(link => link.type_id === Url);
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

        const payLink = createdLinks.find(link => link.type_id === Pay);
        expect(payLink).to.not.be.equal(undefined);

        var payedLinkSelectQuery;
        for (let i = 0; i < 10; i++) {
          payedLinkSelectQuery = await deep.select({
            type_id: Payed,
            to_id: payLink.id
          });

          if (payedLinkSelectQuery.data.length > 0) {
            break;
          }

          await sleep(1000);
        }

        expect(payedLinkSelectQuery.data.length).to.greaterThan(0);

        createdLinkIds.push(payedLinkSelectQuery.data[0].id);

        createdLinks.push(...(await deep.select(createdLinkIds)).data);

        console.log({ createdLinks });

        console.log('testConfirm-end');

        return {
          createdLinks
        }
      };

      /*
    const testGetState = async () => {
    console.log('testGetState-start');
    await testFinishAuthorize();

    const {
      data: [payLink],
    } = await deep.select({ type_id: Pay });

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
    */
      {
        const { createdLinks } = await testInit();
        await deep.delete(createdLinks.map((link) => link.id));
      }
      {
        const { createdLinks } = await testFinishAuthorize();
        await deep.delete(createdLinks.map((link) => link.id));
      }
      {
        const { createdLinks } = await testConfirm();
        await deep.delete(createdLinks.map((link) => link.id));
      }

      await deep.delete(createdLinkIds);

      /*await testGetState();
    await testGetCardList();*/
    };

    // await callRealizationTests();
    await callIntegrationTests();
  };

  await callTests();
};

f();
