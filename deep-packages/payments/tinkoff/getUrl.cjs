exports.getUrl = (method) =>
      `${process.env.PAYMENTS_C2B_URL}/${method}`;
exports.getUrlString = exports.getUrl
  .toString()
  .replace(
    '${process.env.PAYMENTS_C2B_URL}',
    process.env.PAYMENTS_C2B_URL
  );

    
    