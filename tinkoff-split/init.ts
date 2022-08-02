import axios from 'axios';
import { getUrl, getError, IReceipt, IShops } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:init');

export interface IInitRequest {
  (options: IInitOptions): Promise<IInitResponse>;
}

export interface IInitOptions {
  TerminalKey: string;
  OrderId: string;
  Amount: number;
  Description?: string;
  CustomerKey?: string;
  Language?: string;
  Token?: string;
  Recurrent?: string;
  DATA?: IUserData;
  PayType?: string;
  Receipt?: IReceipt;
  NotificationURL?: string;
  SuccessURL?: string;
  FailURL?: string;
  shops: IShops[];
  log?: (data) => any;
}

export interface IUserData {
  Phone: string;
  Email: string;
}

export interface IInitResponse {
  error: string;
  request: IInitOptions;
  response: IInitPaymentResponse;
}

export interface IInitPaymentResponse {
  TerminalKey: string;
  Amount: number;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  PaymentURL?: string;
  Message?: string;
  Details?: string;
}

export const init: IInitRequest = async (options: IInitOptions): Promise<IInitResponse> => {
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
    debug(d);
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
