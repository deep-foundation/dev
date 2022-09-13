import crypto from 'crypto';

export const getUrl = method => `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;

export const errorsConverter = {
  4: 'invalid',
  7: 'invalid',
  53: 'broken',
  99: 'invalid',
  100: 'broken',
  101: 'invalid',
  102: 'invalid',
  103: 'broken',
  308: 'invalid',
  1006: 'invalid',
  1012: 'broken',
  1013: 'broken',
  1014: 'invalid',
  1030: 'broken',
  1033: 'invalid',
  1034: 'broken',
  1041: 'broken',
  1043: 'broken',
  1051: 'no-money',
  1054: 'invalid',
  1057: 'broken',
  1065: 'broken',
  1082: 'invalid',
  1089: 'broken',
  1091: 'broken',
  1096: 'broken',
  9999: 'invalid',
};

export const getError = errorCode => errorCode === '0' ? undefined : (errorsConverter[errorCode] || 'broken');

const _generateToken = (dataWithPassword) => {
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
  const { Receipt, DATA, ...restData } = data;
  console.log(restData);
  const dataWithPassword = { ...restData, Password: process.env.PAYMENT_EACQ_TERMINAL_PASSWORD };
  return _generateToken(dataWithPassword);
};

export const generateTestToken = (data) => {
  const { Receipt, DATA, ...restData } = data;
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
  FfdVersion?: string;
  Email?: string;
  Phone?: string;
  Taxation: string;
  Payments?: object;
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

export interface IReceipts {
  ShopCode: string;
  Items: IItem[];
  Email?: string;
  Phone?: string;
  Taxation: string;
}

export interface IShops {
  ShopCode: string;
  Amount: number;
  Name?: string;
  Fee?: string;
}
