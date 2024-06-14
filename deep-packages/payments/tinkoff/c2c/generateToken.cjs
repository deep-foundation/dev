const crypto = require('crypto');
const {_generateToken} = require("./../_generateToken.cjs");

const generateToken = (data) => {
    const { Receipt, DATA, ...restData } = data;
    const dataWithPassword = { ...restData, Password: process.env.PAYMENTS_C2C_TERMINAL_PASSWORD };
    return _generateToken(dataWithPassword);
  };

  const generateTokenStringWithInsertedTerminalPassword = generateToken
  .toString()
  .replace(
    'process.env.PAYMENTS_C2C_TERMINAL_PASSWORD',
    `"${process.env.PAYMENTS_C2C_TERMINAL_PASSWORD}"`
  );

exports.generateToken = generateToken;
exports.generateTokenStringWithInsertedTerminalPassword = generateTokenStringWithInsertedTerminalPassword;