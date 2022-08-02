import axios from 'axios';
import { getUrl, IReceipt, getError, IShops } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:cancel');

export interface ICancelRequest {
  (options: ICancelOptions): Promise<ICancelResponse>;
}

export interface ICancelOptions {
  TerminalKey: string;
  PaymentId: number;
  Amount?: number;
  Token: string;
  Receipt?: IReceipt;
  shops: IShops[];
  log?: (data) => any;
}

export interface ICancelResponse {
  error: string;
  request: ICancelOptions;
  response: ICancelPaymentResponse;
}

export interface ICancelPaymentResponse {
  TerminalKey: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  OrderId: string;
  OriginalAmount: number;
  NewAmount: number;
  Message?: string;
  Details?: string;
}

export const cancel: ICancelRequest = async (options: ICancelOptions): Promise<ICancelResponse> => {
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
