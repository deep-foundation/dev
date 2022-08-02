import axios from 'axios';
import { getUrl, getError } from './_utils';

export interface IAddCustomerRequest {
  (options: IAddCustomerOptions): Promise<IAddCustomerResponse>;
}

export interface IAddCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  Email?: string;
  Phone?: string;
  Token: string;
}

export interface IAddCustomerResponse {
  error: string;
  request: IAddCustomerOptions;
  response: IAddCustomerPaymentResponse;
}

export interface IAddCustomerPaymentResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const addCustomer: IAddCustomerRequest = async (options: IAddCustomerOptions): Promise<IAddCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('AddCustomer'),
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
