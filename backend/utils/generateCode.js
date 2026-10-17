const crypto = require('crypto');

// No 0/O/1/I so codes are easy to read from a projector
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

module.exports = function generateCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) code += CHARS[crypto.randomInt(CHARS.length)];
  return code;
};
