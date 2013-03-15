// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.encodeError');


/**
 * @param {string} msg
 */
pics3.encoder.encodeError.newError = function(msg) {
  var e = Error(msg);
  e.name = 'pics3.encoder.EncodeError';
  return e;
};

/**
 * @param {Error} e
 * @return {boolean}
 */
pics3.encoder.encodeError.is = function(e) {
  return e.name == 'pics3.encoder.EncodeError';
};
