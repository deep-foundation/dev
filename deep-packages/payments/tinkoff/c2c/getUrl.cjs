const getUrl = method => `${process.env.PAYMENT_E2C_URL}/${method}`;

exports.getUrl = getUrl;