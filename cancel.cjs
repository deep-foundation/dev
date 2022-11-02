const { generateToken } = require("./deep-packages/payments/tinkoff/generateToken.cjs");
const { getError } = require("./deep-packages/payments/tinkoff/getError.cjs");
const { getUrl } = require("./deep-packages/payments/tinkoff/getUrl.cjs");
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const crypto = require('crypto');
const axios = require('axios');

const cancel = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Cancel'),
        data: { ...options, Token: generateToken(options) },
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

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const f = async () => {
    const cancelOptions = {
        TerminalKey: process.env.PAYMENTS_C2B_TERMINAL_KEY,
        PaymentId: 1942858647,
        Amount: 3000
    }

    const cancelResult = await cancel(cancelOptions);
    console.log({cancelResult});
}

f();

