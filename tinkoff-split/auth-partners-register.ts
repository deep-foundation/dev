import axios from 'axios';
import { getError, getMarketUrl } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:auth-partners-register');

export interface IAuthPartnersRegisterPartner {
  (options: IAuthPartnersRegisterPartnerOptions): Promise<IAuthPartnersRegisterPartnerResponse>;
}

export interface IAuthPartnersRegisterPartnerOptions {
  username: string;
  password: string;
}

export interface IAuthPartnersRegisterPartnerResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  jti: string;
}

// only for unsafe usage in registerPartner
export const authPartnerRegister: IAuthPartnersRegisterPartner = async (options: IAuthPartnersRegisterPartnerOptions): Promise<IAuthPartnersRegisterPartnerResponse> => {
  const response = await axios({
    method: 'post',
    url: `${getMarketUrl('oauth/token')}?grant_type=password&username=${options.username}&password=${options.password}`,
    auth: {
      username: 'partner',
      password: 'partner',
    },
    headers: {
      Authorization: 'Basic',
      'Content-Type': 'application/json',
    },
    validateStatus: () => true,
  });

  const error = getError(response.data.ErrorCode);

  const d = {
    error,
    request: options,
    response: response.data,
  };
  debug(d);

  return response.data;
};
