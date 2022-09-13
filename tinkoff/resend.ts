import axios from 'axios';
import { getUrl, getError } from './_utils';

export interface IResendRequest {
  (options: IResendOptions): Promise<IResendResponse>;
}

export interface IResendOptions {
  TerminalKey: string;
  Token: string;
}

export interface IResendResponse {
  error: string;
  request: IResendOptions;
  response: IResendPaymentResponse;
}

export interface IResendPaymentResponse {
  TerminalKey: string;
  Count: number;
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const resend: IResendRequest = async (options: IResendOptions): Promise<IResendResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('Resend'),
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
