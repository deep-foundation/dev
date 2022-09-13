import crypto from 'crypto';

export const getUrl = method => `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;
export const getMarketUrl = method => `${process.env.PAYMENT_TINKOFF_MARKET_URL}/${method}`;

export const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
const SHAKE_PART = 0.07;

export const errorsConverter = {
  7:	'Покупатель не найден',
  53:	'Обратитесь к продавцу',
  99:	'Платеж отклонен',
  100:	'Повторите попытку позже',
  101:	'Не пройдена идентификация 3DS',
  102:	'Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой',
  103:	'Повторите попытку позже',
  119:	'Превышено кол-во запросов на авторизацию',
  191:	'Некорректный статус договора, обратитесь к вашему менеджеру',
  1001:	'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
  1003:	'Неверный merchant ID',
  1004:	'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1005:	'Платеж отклонен банком, выпустившим карту',
  1006:	'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
  1007:	'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1008:	'Платеж отклонен, необходима идентификация',
  1012:	'Такие операции запрещены для этой карты',
  1013:	'Повторите попытку позже',
  1014:	'Карта недействительна. Свяжитесь с банком, выпустившим карту',
  1015:	'Попробуйте снова или свяжитесь с банком, выпустившим карту',
  1019:	'Платеж отклонен — попробуйте снова',
  1030:	'Повторите попытку позже',
  1033:	'Истек срок действия карты. Свяжитесь с банком, выпустившим карту',
  1034:	'Попробуйте повторить попытку позже',
  1038:	'Превышено количество попыток ввода ПИН-кода',
  1039:	'Платеж отклонен — счет не найден',
  1041:	'Карта утеряна. Свяжитесь с банком, выпустившим карту',
  1043:	'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1051:	'Недостаточно средств на карте',
  1053:	'Платеж отклонен — счет не найден',
  1054:	'Истек срок действия карты',
  1055:	'Неверный ПИН',
  1057:	'Такие операции запрещены для этой карты',
  1058:	'Такие операции запрещены для этой карты',
  1059:	'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
  1061:	'Превышен дневной лимит платежей по карте',
  1062:	'Платежи по карте ограничены',
  1063:	'Операции по карте ограничены',
  1064:	'Проверьте сумму',
  1065:	'Превышен дневной лимит транзакций',
  1075:	'Превышено число попыток ввода ПИН-кода',
  1076:	'Платеж отклонен — попробуйте снова',
  1077:	'Коды не совпадают — попробуйте снова',
  1080:	'Неверный срок действия',
  1082:	'Неверный CVV',
  1086:	'Платеж отклонен — не получилось подтвердить ПИН-код',
  1088:	'Ошибка шифрования. Попробуйте снова',
  1089:	'Попробуйте повторить попытку позже',
  1091:	'Банк, выпустивший карту недоступен для проведения авторизации',
  1092:	'Платеж отклонен — попробуйте снова',
  1093:	'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
  1094:	'Системная ошибка',
  1096:	'Повторите попытку позже',
  9999:	'Внутренняя ошибка системы',
};

export const getError = errorCode => errorCode === '0' ? undefined : (errorsConverter[errorCode] || 'broken');

export const _generateToken = (dataWithPassword) => {
  const dataString = Object.keys(dataWithPassword)
    .sort((a, b) => a.localeCompare(b))
    .map(key => dataWithPassword[key])
    .reduce((acc, item) => `${acc}${item}`, '');
  const hash = crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
  return hash;
};

export const generateToken = (data) => {
  const { Receipt, DATA, Shops, ...restData } = data;
  const dataWithPassword = { ...restData, Password: process.env.PAYMENT_EACQ_TERMINAL_PASSWORD };
  return _generateToken(dataWithPassword);
};

export const generateTestToken = (data) => {
  const { Receipt, DATA, Shops, ...restData } = data;
  const dataWithPassword = { ...restData, Password: process.env.PAYMENT_TEST_TERMINAL_PASSWORD };
  return _generateToken(dataWithPassword);
};

export const tokenize = (options) => {
  return {
    ...options,
    Token: generateToken(options),
  };
};

export interface IReceipt {
  Items: IItem[];
  Phone?: string;
  Email?: string;
  Taxation: string;
}

export interface IItem {
  Name: string;
  Price: number;
  Quantity: number;
  Amount: number;
  PaymentMethod?: string;
  PaymentObject?: string;
  Tax: string;
}
export interface IShops {
  ShopCode: String;
  Amount: number;
  Name?: string;
  Fee?: number;
}

export function createShops({ splitToken, amount, needFee = true }) {
  const shops = [{
    ShopCode: splitToken?.json?.shopCode,
    Amount: Math.abs(amount) * 100,
    ...(amount > 0 && needFee ? { Fee: Math.round(+(SHAKE_PART * (amount * 100)).toFixed(2)) } : {}),
  }];
  return shops;
}
