import axios from 'axios';
import { getMarketUrl } from './_utils';
import { authPartnerRegister } from './auth-partners-register';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-split:register-partner');

export interface IRegisterPartner {
  (options: IRegisterPartnerOptions): Promise<IRegisterPartnerResponse>;
}

export interface IRegisterPartnerOptions {
  serviceProviderEmail?: string;
  shopArticleId?: string;
  billingDescriptor: string;
  fullName: string;
  name: string;
  inn: string;
  kpp: string;
  okved?: string;
  ogrn: number;
  regDepartment?: string;
  regDate?: string;
  addresses: {
    type: string;
    zip: string;
    country: string;
    city: string;
    street: string;
    description?: string;
  }[];
  phones?: {
    type?: string;
    phone?: string;
    description?: string;
  }[];
  email: string;
  assets?: string;
  founders?: {
    individuals: {
      firstName: string;
      lastName: string;
      middleName?: string;
      birthDate?: string;
      birthPlace?: string;
      citizenship: string;
      docType?: string;
      docNumber?: string;
      issueDate?: string;
      issuedBy?: string;
      address: string;
    }[];
  };
  ceo: {
    firstName: string;
    lastName: string;
    middleName: string;
    birthDate: string;
    birthPlace?: string;
    docType?: string;
    docNumber?: string;
    issueDate?: string;
    issuedBy?: string;
    address?: string;
    phone: string;
  };
  licenses?: {
    type?: string;
    number?: string;
    issueDate?: string;
    issuedBy?: string;
    expiryDate?: string;
    description?: string;
  };
  siteUrl: string;
  primaryActivities?: string;
  bankAccount: {
    account: string;
    korAccount?: string;
    bankName: string;
    bik: string;
    details: string;
    tax: string;
  };
  comment?: string;
  nonResident?: boolean;
}

export interface IRegisterPartnerResponse {
  code?: string;
  shopCode?: string;
  terminals?: any[];

  timestamp?: string;
  status?: number;
  error?: string;
  errors?: {
    field?: string;
    defaultMessage?: string;
    rejectedValue?: string;
    code?: string;
  }[];
  message?: string;
  path?: string;
}

export const registerPartner: IRegisterPartner = async (options: IRegisterPartnerOptions): Promise<any> => {
  const access_token = (await authPartnerRegister({
    username: process.env.PAYMENT_TINKOFF_MARKET_USERNAME || '',
    password: process.env.PAYMENT_TINKOFF_MARKET_PASSWORD || '',
  }));

  console.log({ access_token });

  const response = await axios({
    method: 'post',
    url: getMarketUrl('register'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access_token?.access_token}`,
    },
    data: options,
    validateStatus: () => true,
  });

  debug({
    request: options,
    response: response.data,
  });

  return response.data;
};
