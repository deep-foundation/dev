import axios from 'axios';
import { getUrl, IReceipt, IShops, getError } from './_utils';

export interface IConfirmRequest {
  (options: IConfirmOptions): Promise<IConfirmResponse>;
}

export interface IConfirmOptions {
  TerminalKey: string;
  PaymentId: number;
  Token: string;
  IP?: string;
  Amount?: number;
  Receipt?: IReceipt;
  Shops?: IShops;
  Receipts?: object;
  Route?: 'ТСВ' | 'BNPL';
  Source?: 'Installment' | 'BNPL';
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
