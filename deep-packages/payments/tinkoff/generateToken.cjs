const crypto = require('crypto');

exports.generateToken = (data) => {
  const { Receipt, DATA, Shops, ...restData } = data;
  const dataWithPassword = {
    Password: process.env.PAYMENTS_C2B_TERMINAL_PASSWORD,
    ...restData,
  };
  console.log({ dataWithPassword });

  const dataString = Object.keys(dataWithPassword)
  .sort((a, b) => a.localeCompare(b))
  .map((key) => dataWithPassword[key])
  .reduce((acc, item) => `${acc}${item}`, '');
  console.log({ dataString });
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  console.log({ hash });
  return hash;
};

exports.generateTokenStringWithInsertedTerminalPassword = exports.generateToken
.toString()
.replace(
  'process.env.PAYMENTS_C2B_TERMINAL_PASSWORD',
  `"${process.env.PAYMENTS_C2B_TERMINAL_PASSWORD}"`
);

  
  