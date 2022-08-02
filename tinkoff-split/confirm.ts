import axios from 'axios';
import { getUrl, IReceipt, getError, IShops } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:confirm');

export interface IConfirmRequest {
  (options: IConfirmOptions): Promise<IConfirmResponse>;
}

export interface IConfirmOptions {
  TerminalKey: string;
  PaymentId: number;
  Amount?: number;
  Token: string;
  Receipt?: IReceipt;
  shops: IShops[];
  log?: (data) => any;
}

export interface IConfirmResponse {
  error: string;
  request: IConfirmOptions;
  response: IConfirmPaymentResponse;
}

export interface IConfirmPaymentResponse {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const confirm: IConfirmRequest = async (options: IConfirmOptions): Promise<IConfirmResponse> => {
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
