const getUrl = method => `${process.env.PAYMENTS_C2C_URL}/${method}`;

exports.getUrl = getUrl;