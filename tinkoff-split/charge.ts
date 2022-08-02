import axios from 'axios';
import Debug from 'debug';
import { getError, getUrl } from './_utils';

const debug = Debug('payments:tinkoff-split:charge');

export interface IChargeRequest {
  (options: IChargeOptions): Promise<IChargeResponse>;
}

export interface IChargeOptions {
  TerminalKey: string;
  PaymentId: number;
  RebillId: number;
  SendEmail?: boolean;
  InfoEmail?: boolean;
  Token: string;
  log?: (data) => any;
}

export interface IChargeResponse {
  error: string;
  request: IChargeOptions;
  response: IChargePaymentResponse;
}

export interface IChargePaymentResponse {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Amount: number;
  Message?: string;
  Details?: string;
}

export const charge: IChargeRequest = async (options: IChargeOptions): Promise<IChargeResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('Charge'),
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
