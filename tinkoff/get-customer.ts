import axios from 'axios';
import { getUrl, getError } from './_utils';

export interface IGetCustomerRequest {
  (options: IGetCustomerOptions): Promise<IGetCustomerResponse>;
}

export interface IGetCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  Token: string;
}

export interface IGetCustomerResponse {
  error: string;
  request: IGetCustomerOptions;
  response: IGetCustomerPaymentResponse;
}

export interface IGetCustomerPaymentResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: boolean;
  ErrorCode: string;
  Email?: string;
  Phone?: string;
  Message?: string;
  Details?: string;
}

export const getCustomer: IGetCustomerRequest = async (options: IGetCustomerOptions): Promise<IGetCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetCustomer'),
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
