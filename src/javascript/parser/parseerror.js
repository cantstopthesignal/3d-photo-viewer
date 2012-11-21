// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.parseError');


/**
 * @param {string} msg
 */
pics3.parser.parseError.newError = function(msg) {
  var e = Error(msg);
  e.name = 'pics3.parser.ParseError';
  return e;
};

/**
 * @param {Error} e
 * @return {boolean}
 */
pics3.parser.parseError.is = function(e) {
  return e.name == 'pics3.parser.ParseError';
};
