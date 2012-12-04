// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleClientScopes');

goog.require('goog.asserts');
goog.require('goog.object');


/**
 * @param {Array.<string>=} opt_scopeValues
 * @constructor
 */
pics3.GoogleClientScopes = function(opt_scopeValues) {
  /** @type {!Object.<string,boolean>} */
  this.scopeSet_ = {};

  if (opt_scopeValues) {
    this.addAll(opt_scopeValues);
  }
};

/**
 * @param {!Array.<string>} scopeValues
 * @return {boolean}
 */
pics3.GoogleClientScopes.prototype.addAll = function(scopeValues) {
  var added = false;
  goog.array.forEach(scopeValues, function(scopeValue) {
    if (!(scopeValue in this.scopeSet_)) {
      added = true;
      this.scopeSet_[scopeValue] = true;
    }
  }, this);
  return added;
};

/** @return {!Array.<string>} */
pics3.GoogleClientScopes.prototype.getValues = function() {
  return goog.object.getKeys(this.scopeSet_);
};

/**
 * @param {!pics3.GoogleClientScopes} other
 * @return {boolean}
 */
pics3.GoogleClientScopes.prototype.merge = function(other) {
  return this.addAll(other.getValues());
};

/**
 * @param {!pics3.GoogleClientScopes} other
 * @return {boolean}
 */
pics3.GoogleClientScopes.prototype.equals = function(other) {
  return this.contains(other) && other.contains(this);
};

/**
 * @param {!pics3.GoogleClientScopes} other
 * @return {boolean}
 */
pics3.GoogleClientScopes.prototype.contains = function(other) {
  return goog.object.every(other.scopeSet_, function(entry, scopeValue) {
    return scopeValue in this.scopeSet_;
  }, this);
};

/**
 * @return {boolean}
 */
pics3.GoogleClientScopes.prototype.isEmpty = function() {
  return goog.object.isEmpty(this.scopeSet_);
};
