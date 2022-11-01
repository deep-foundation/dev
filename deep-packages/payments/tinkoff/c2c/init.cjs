const axios = require('axios');
const { generateToken } = require("./../generateToken.cjs");
const { getError } = require("./getError.cjs");
const { getUrl } = require("./getUrl.cjs");

const init = async (options) => {
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Init'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: objectToFormData({ ...options, Token: generateToken(options) }),
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
    } catch (e) {
      console.log(e?.response?.data);
      console.log(e?.response?.status);
      console.log(e?.response?.data?.Causes);
      const error = getError(e?.response?.ErrorCode);
      return {
        error,
        request: options,
        response: null,
      };
    }
  };

  exports.init = init;