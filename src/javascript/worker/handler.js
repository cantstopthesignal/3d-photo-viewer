// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.Handler');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('pics3.worker.RpcMessage');


/**
 * @interface
 */
pics3.worker.Handler = function() {
};

/**
 * @param {!pics3.worker.RpcMessage} rpcMessage
 * @return {!goog.async.Deferred}
 */
pics3.worker.Handler.prototype.handleRpc = goog.abstractMethod;
