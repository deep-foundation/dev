const axios = require('axios');
const { generateToken } = require("./generateToken.cjs");
const { getError } = require("./getError.cjs");
const { getUrl } = require("./getUrl.cjs");

exports.getCardList = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('GetCardList'),
        headers: {
          'Content-Type': 'application/json',
        },
        data: { ...options, Token: generateToken(options) },
      });

      const error = getError(response.data.ErrorCode || '0');

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

  