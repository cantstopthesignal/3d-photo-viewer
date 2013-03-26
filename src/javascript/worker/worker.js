// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.Worker');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.AppContext');
goog.require('pics3.worker.ImageHandler');
goog.require('pics3.worker.Message');
goog.require('pics3.worker.RpcMessage');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.worker.Worker = function() {
  /** @type {!pics3.AppContext} */
  this.appContext_ = new pics3.AppContext();
  this.registerDisposable(this.appContext_);

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);

  /** @type {!Object.<!pics3.worker.RpcMessage.Type,!pics3.worker.Handler>} */
  this.handlerMap_ = {};
  this.registerHandlers_();
};
goog.inherits(pics3.worker.Worker, goog.events.EventTarget);

/** @type {goog.debug.Logger} */
pics3.worker.Worker.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.worker.Worker');

pics3.worker.Worker.prototype.start = function() {
  this.logger_.info('start');
  this.eventHandler_.
      listen(goog.global, goog.events.EventType.MESSAGE, this.handleMessage_);
};

pics3.worker.Worker.prototype.registerHandlers_ = function() {
  var imageHandler = new pics3.worker.ImageHandler();
  this.handlerMap_[pics3.worker.RpcMessage.Type.PARSE_IMAGE] = imageHandler;
  this.handlerMap_[pics3.worker.RpcMessage.Type.ENCODE_WEBP] = imageHandler;
};

/** @param {goog.events.Event} e */
pics3.worker.Worker.prototype.handleMessage_ = function(e) {
  var message = pics3.worker.Message.fromObject(e.getBrowserEvent().data);
  if (message.type == pics3.worker.Message.Type.RPC) {
    var rpcMessage = pics3.worker.RpcMessage.fromMessage(message);
    this.handleRpcMessage_(rpcMessage);
  } else {
    this.logger_.warning('Unhandled worker message of type ' + message.type);
  }
};

/** @param {!pics3.worker.RpcMessage} rpcMessage */
pics3.worker.Worker.prototype.handleRpcMessage_ = function(rpcMessage) {
  var rpcName = rpcMessage.type + ':' + rpcMessage.id;
  this.logger_.fine('rpc[' + rpcName + '] start');
  var startTime = goog.now();
  var handler = this.handlerMap_[rpcMessage.type];
  if (handler) {
    handler.handleRpc(rpcMessage).addCallbacks(function(data) {
      var responseMessage = rpcMessage.makeResponse(data);
      this.logger_.info('rpc[' + rpcName + '] success in ' +
          (goog.now() - startTime) + 'ms');
      responseMessage.toMessage().send(goog.global);
    }, function(error) {
      this.logger_.info('rpc[' + rpcName + '] failure in ' +
          (goog.now() - startTime) + 'ms');
      this.logger_.severe('RPC Error dropped: ' + error);
    }, this);
  } else {
    this.logger_.warning('No handler registered for rpc ' + rpcMessage.type);
  }
};
