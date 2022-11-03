const axios = require('axios');
const { generateToken } = require("./generateToken.cjs");
const { getError } = require("./getError.cjs");
const { getUrl } = require("./getUrl.cjs");


const payment = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Payment'),
        headers: {
          'Content-Type': 'application/json',
        },
        data: {...options, Token: generateToken(options)},
      });
  
      const error = getError(response.data.ErrorCode);
  
      const d = {
        error,
        request: options,
        response: response.data,
      };
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

exports.payment = payment;