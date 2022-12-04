const {errors} = require("./errors.cjs");

exports.getError = (errorCode) =>
      errorCode === '0' ? undefined : errors[errorCode] || 'broken';


