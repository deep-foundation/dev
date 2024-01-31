const crypto = require('crypto');

const _generateToken = (dataWithPassword) => {
    const dataString = Object.keys(dataWithPassword)
      .sort((a, b) => a.localeCompare(b))
      .map(key => dataWithPassword[key])
      .reduce((acc, item) => `${acc}${item}`, '');
    const hash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
    return hash;
  };

exports._generateToken = _generateToken;