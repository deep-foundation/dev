import axios from 'axios';
import { getUrl, getError } from './_utils';

export interface IGetStateRequest {
  (options: IGetStateOptions): Promise<IGetStateResponse>;
}

export interface IGetStateOptions {
  TerminalKey: string;
  PaymentId: number;
  Amount?: number;
  Token: string;
}

export interface IGetStateResponse {
  error: string;
  request: IGetStateOptions;
  response: IGetStatePaymentResponse;
}

export interface IGetStatePaymentResponse {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const getState: IGetStateRequest = async (options: IGetStateOptions): Promise<IGetStateResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetState'),
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
