// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.RpcMessage');

goog.require('goog.asserts');
goog.require('goog.object');


/**
 * @param {pics3.worker.RpcMessage.Type} type
 * @param {Object} data
 * @param {number=} opt_id
 * @constructor
 */
pics3.worker.RpcMessage = function(type, data, opt_id) {
  this.type = type;

  /** @type {Object} */
  this.data = data;

  /** @type {number} */
  this.id = opt_id || (pics3.worker.RpcMessage.nextId_++);
};

/** @enum {string} */
pics3.worker.RpcMessage.Type = {
  PARSE_IMAGE: 'PARSE_IMAGE',
  ENCODE_WEBP: 'ENCODE_WEBP'
};

/** @type {number} */
pics3.worker.RpcMessage.nextId_ = 1;

/**
 * @param {pics3.worker.Message} message
 * @return {!pics3.worker.RpcMessage}
 */
pics3.worker.RpcMessage.fromMessage = function(message) {
  goog.asserts.assert(message.type == pics3.worker.Message.Type.RPC);
  var type = message.data['type'];
  goog.asserts.assert(goog.object.contains(pics3.worker.RpcMessage.Type, type));
  var data = message.data['data'];
  var id = message.data['id'];
  return new pics3.worker.RpcMessage(type, data, id);
};

/** @return {!pics3.worker.Message} */
pics3.worker.RpcMessage.prototype.toMessage = function() {
  var data = {
    'type': this.type,
    'data': this.data,
    'id': this.id
  };
  return new pics3.worker.Message(pics3.worker.Message.Type.RPC, data);
};

/**
 * @param {Object} responseData
 * @return {!pics3.worker.RpcMessage}
 */
pics3.worker.RpcMessage.prototype.makeResponse = function(responseData) {
  return new pics3.worker.RpcMessage(this.type, responseData,
      this.id);
};
