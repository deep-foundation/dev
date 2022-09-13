import axios from 'axios';
import { getUrl, getError } from './_utils';

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
