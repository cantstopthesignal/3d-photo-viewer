// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.Client');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.AppContext');
goog.require('pics3.worker.Message');
goog.require('pics3.worker.RpcMessage');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.worker.Client = function() {
  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);

  /** @type {!Object.<number,!goog.async.Deferred>} */
  this.rpcMap_ = {};
};
goog.inherits(pics3.worker.Client, goog.events.EventTarget);

pics3.worker.Client.SERVICE_ID = 's' + goog.getUid(pics3.worker.Client);

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.worker.Client}
 */
pics3.worker.Client.get = function(appContext) {
  return /** @type {!pics3.worker.Client} */ (goog.asserts.assertObject(
      appContext.get(pics3.worker.Client.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.worker.Client.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.worker.Client');

/** @param {!pics3.AppContext} appContext */
pics3.worker.Client.prototype.register = function(appContext) {
  appContext.register(pics3.worker.Client.SERVICE_ID, this);
};

/** @type {Worker} */
pics3.worker.Client.prototype.worker_;

pics3.worker.Client.prototype.start = function() {
  this.worker_ = new Worker(this.getWorkerScriptUrl_());
  this.eventHandler_.
      listen(this.worker_, goog.events.EventType.MESSAGE, this.handleMessage_);
};

/**
 * @param {pics3.worker.RpcMessage} rpcMessage
 * @return {goog.async.Deferred}
 */
pics3.worker.Client.prototype.rpcAsync = function(rpcMessage) {
  var deferred = new goog.async.Deferred();
  goog.asserts.assert(!this.rpcMap_[rpcMessage.id]);
  this.rpcMap_[rpcMessage.id] = deferred;
  var message = rpcMessage.toMessage();
  message.send(this.worker_);
  return deferred;
};

/** @param {goog.events.Event} e */
pics3.worker.Client.prototype.handleMessage_ = function(e) {
  goog.asserts.assert(e.getBrowserEvent().data);
  var message = pics3.worker.Message.fromObject(e.getBrowserEvent().data);
  if (message.type == pics3.worker.Message.Type.LOG) {
    this.handleLogMessage_(message);
  } else if (message.type == pics3.worker.Message.Type.RPC) {
    var rpcMessage = pics3.worker.RpcMessage.fromMessage(message);
    this.handleRpcMessage_(rpcMessage);
  } else {
    this.logger_.warning('Unhandled worker message of type ' + message.type);
  }
};

/** @param {!pics3.worker.Message} message */
pics3.worker.Client.prototype.handleLogMessage_ = function(message) {
  var levelObject = message.data['level'];
  var level = /** @type {?goog.debug.Logger.Level} */ (goog.array.find(
      goog.debug.Logger.Level.PREDEFINED_LEVELS, function(level) {
        return level.name == levelObject['name'] &&
            level.value == levelObject['value'];
      }));
  var record = message.data['record'];
  this.logger_.log(level || goog.debug.Logger.Level.INFO, record);
};

/** @param {!pics3.worker.RpcMessage} rpcMessage */
pics3.worker.Client.prototype.handleRpcMessage_ = function(rpcMessage) {
  var deferred = this.rpcMap_[rpcMessage.id];
  goog.asserts.assert(deferred);
  delete this.rpcMap_[rpcMessage.id];
  deferred.callback(rpcMessage.data);
};

/** @return {string} */
pics3.worker.Client.prototype.getWorkerScriptUrl_ = function() {
  var jsMode = goog.getObjectByName('pics3.jsMode');
  if (jsMode == 'debug' || jsMode == 'uncompiled') {
    jsMode = 'debug';
  } else {
    jsMode = 'optimized';
  }
  return '/js/workermain' + jsMode + '.js';
};
