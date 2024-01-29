const getUrl = (method) =>
      `${process.env.PAYMENTS_C2B_URL}/${method}`;
    const getUrlString = getUrl
      .toString()
      .replace(
        '${process.env.PAYMENTS_C2B_URL}',
        process.env.PAYMENTS_C2B_URL
      );
    console.log({ getUrlString });

    exports.getUrl = getUrl;
    exports.getUrlString = getUrlString;