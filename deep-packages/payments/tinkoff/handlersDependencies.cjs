const { errors } = require("./errors.cjs");
const { getError } = require("./getError.cjs");
const { getUrlString } = require("./getUrl.cjs");
const { generateTokenStringWithInsertedTerminalPassword } = require("./generateToken.cjs");


const handlersDependencies = `
const crypto = require('crypto');
const axios = require('axios');
const errorsConverter = ${JSON.stringify(errors)};
const getError = ${getError.toString()};
const getUrl = ${getUrlString};
const generateToken = ${generateTokenStringWithInsertedTerminalPassword};
`;

exports.handlersDependencies = handlersDependencies;