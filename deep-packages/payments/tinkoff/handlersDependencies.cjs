import { errors } from "./errors.cjs";
import { getError } from "./getError.cjs";
import { getUrlString } from "./getUrl.cjs";
import { generateTokenStringWithInsertedTerminalPassword } from "./generateToken.cjs";


const handlersDependencies = `
const crypto = require('crypto');
const axios = require('axios');
const errorsConverter = ${JSON.stringify(errors)};
const getError = ${getError.toString()};
const getUrl = ${getUrlString};
const generateToken = ${generateTokenStringWithInsertedTerminalPassword};
`;

exports.handlersDependencies = handlersDependencies;