import axios from 'axios';
import { getUrl, getError } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:remove-customer');

export interface IRemoveCustomerRequest {
  (options: IRemoveCustomerOptions): Promise<IRemoveCustomerResponse>;
}

export interface IRemoveCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  Token: string;
}

export interface IRemoveCustomerResponse {
  error: string;
  request: IRemoveCustomerOptions;
  response: IRemoveCustomerPaymentResponse;
}

export interface IRemoveCustomerPaymentResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const removeCustomer: IRemoveCustomerRequest = async (options: IRemoveCustomerOptions): Promise<IRemoveCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('RemoveCustomer'),
      headers: {
        'Content-Type': 'application/json',
      },
      data: options,
    });

    const error = getError(response.data.ErrorCode);

    debug({
      error,
      request: options,
      response: response.data,
    });

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
