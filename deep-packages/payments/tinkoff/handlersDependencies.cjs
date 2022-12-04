const { errors } = require("./errors.cjs");
const { getError } = require("./getError.cjs");
const { getUrlString } = require("./getUrl.cjs");
const { generateTokenStringWithInsertedTerminalPassword } = require("./generateToken.cjs");


exports.handlersDependencies = `
const crypto = require('crypto');
const axios = require('axios');
exports.errors = ${JSON.stringify(errors)};
exports.getError = ${getError.toString()};
exports.getUrl = ${getUrlString};
exports.generateToken = ${generateTokenStringWithInsertedTerminalPassword};
`;

