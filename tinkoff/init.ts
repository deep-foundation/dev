import axios from 'axios';
import { getUrl, getError, IReceipt } from './_utils';

const log = require('debug')('shakeapp-payments-event-handler');
const debugResponse = log.extend('response.data');

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
    console.log('!!!!!!', getUrl('Init'));
    const response = await axios({
      method: 'post',
      url: getUrl('Init'),
      headers: {
        'Content-Type': 'application/json',
      },
      data: options,
    });

    const error = getError(response.data.ErrorCode);

    debugResponse(response.data);

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
