import axios from 'axios';
import { getUrl, getError } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:add-customer');

export interface IResendRequest {
  (options: IResendOptions): Promise<IResendResponse>;
}

export interface IResendOptions {
  TerminalKey: string;
  Token: string;
  log?: (data) => any;
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
