// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.Message');

goog.require('goog.asserts');
goog.require('goog.json');
goog.require('goog.object');


/**
 * @param {pics3.worker.Message.Type} type
 * @param {Object} data
 * @constructor
 */
pics3.worker.Message = function(type, data) {
  this.type = type;

  /** @type {Object} */
  this.data = data;
};

/** @enum {string} */
pics3.worker.Message.Type = {
  LOG: 'LOG',
  RPC: 'RPC'
};

/**
 * @param {Object} obj
 * @return {!pics3.worker.Message}
 */
pics3.worker.Message.fromObject = function(obj) {
  var type = obj['type'];
  goog.asserts.assert(goog.object.contains(pics3.worker.Message.Type, type));
  var data = obj['data'];
  return new pics3.worker.Message(type, data);
};

/** @return {Object} */
pics3.worker.Message.prototype.toObject_ = function() {
  return {
    'type': this.type,
    'data': this.data
  };
};

/** @return {string} */
pics3.worker.Message.prototype.toString = function() {
  return goog.json.serialize(this.toObject_());
};

/** @param {Object} recipient */
pics3.worker.Message.prototype.send = function(recipient) {
  var postMessage = /** @type {Function} */ (recipient.postMessage);
  postMessage.call(recipient, this.toObject_());
};
