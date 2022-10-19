const crypto = require('crypto');
const axios = require('axios');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const uniqid = require('uniqid');
const {payInBrowser} = require("./deep-packges/payments/tinkoff/payInBrowser.cjs");
const puppeteer = require('puppeteer');



var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const CUSTOMER_KEY = "4xf3366al8af85a4";

const f = async () => {
    console.log("process.env.PAYMENTS_C2B_TERMINAL_PASSWORD", process.env.PAYMENTS_C2B_TERMINAL_PASSWORD)

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
    `${process.env.PAYMENTS_C2B_URL}/${method}`;

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
      Password: process.env.PAYMENTS_C2B_TERMINAL_PASSWORD,
    };
    console.log({ dataWithPassword });
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

  const options = {
    TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
    OrderId: uniqid(),
    CustomerKey: CUSTOMER_KEY,
    PayType: 'T',
    Amount: 5500,
    Description: 'Test shopping',
    Language: 'ru',
    Recurrent: 'Y',
    DATA: {
      Email: process.env.PAYMENTS_C2B_PHONE,
      Phone: process.env.PAYMENTS_C2B_EMAIL,
      // "DefaultCard": 10495015
    }
  };
  console.log({options});

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




  let initResult = await init(options);
  console.log({initResult});

  const getCardListOptions = {
    TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
    CustomerKey: CUSTOMER_KEY,
  };

  console.log(await getCardList(getCardListOptions));

  const browser = await puppeteer.launch({ args: [/*'--no-sandbox'*/] });
  const page = await browser.newPage();
  await payInBrowser({
    browser,
    page,
    url: initResult.response.PaymentURL,
  });
}

f();