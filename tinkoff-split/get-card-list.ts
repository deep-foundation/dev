import axios from 'axios';
import { getUrl, getError } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:get-card-list');

export interface IGetCardListRequest {
  (options: IGetCardListOptions): Promise<IGetCardListResponse>;
}

export interface IGetCardListOptions {
  TerminalKey: string;
  CustomerKey: string;
  Token: string;
  log?: (data) => any;
}

export interface IGetCardListResponse {
  error: string;
  request: IGetCardListOptions;
  response: IGetCardListPaymentResponse[];
}

export interface IGetCardListPaymentResponse {
  Pan: string;
  CardId: string;
  Status: string;
  RebillId?: string;
  ExpDate: string;
  CardType: number;
}

export const getCardList: IGetCardListRequest = async (options: IGetCardListOptions): Promise<IGetCardListResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetCardList'),
      headers: {
        'Content-Type': 'application/json',
      },
      data: options,
    });

    const error = getError(response.data.ErrorCode || '0');

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
