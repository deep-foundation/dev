
    try {
      const response = await axios({
        method: 'post',
        url: getUrl('Confirm'),
        data: { ...options, tokenTypeId: generateToken(options) },
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
  }