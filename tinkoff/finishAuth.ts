import axios from 'axios';
import { getUrl, getError } from './_utils';

export interface IFinishAuthRequest {
  (options: IFinishAuthOptions): Promise<IFinishAuthResponse>;
}

export interface IFinishAuthOptions {
  CardData: string;
  PaymentId: number;
  Token: string;
  TerminalKey: string;
}

export interface IFinishAuthResponse {
  error: string;
  request: IFinishAuthOptions;
  response: IFinishAuthPaymentResponse;
}

export interface IFinishAuthPaymentResponse {
  Success: boolean;
  ErrorCode: number;
  TerminalKey: string;
  Status: string;
  PaymentId: number;
  OrderId: string;
  Amount: number;
  ACSUrl: string;
  MD: string;
  PaReq: string;
}

export const finishAuth: IFinishAuthRequest = async (options: IFinishAuthOptions): Promise<IFinishAuthResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('FinishAuthorize'),
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
