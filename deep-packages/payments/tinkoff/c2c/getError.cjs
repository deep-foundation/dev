const {errors} = require("./errors.cjs");


const getError = errorCode => errorCode === '0' ? undefined : (errors[errorCode] || 'broken');

exports.getError = getError;