// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.Rational');


/**
 * @param {number} numer
 * @param {number} denom
 * @constructor
 */
pics3.parser.Rational = function(numer, denom) {
  /** @type {number} */
  this.numer = numer;

  /** @type {number} */
  this.denom = denom;
};

/**
 * @param {!Object} object
 * @return {!pics3.parser.Rational}
 */
pics3.parser.Rational.fromObject = function(object) {
  var numer = object['numer'];
  goog.asserts.assert(goog.isNumber(numer));
  var denom = object['denom'];
  goog.asserts.assert(goog.isNumber(denom));
  return new pics3.parser.Rational(numer, denom);
};

/** @return {number} */
pics3.parser.Rational.prototype.getValue = function() {
  return this.numer / this.denom;
};

pics3.parser.Rational.prototype.toObject = function() {
  return {
    'numer': this.numer,
    'denom': this.denom
  };
};

