// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.ImageProcessor');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('pics3.parser.ImageResult');
goog.require('pics3.worker.Client');
goog.require('pics3.Service');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.ImageProcessor = function(appContext) {
  goog.base(this);

  /** @type {!pics3.worker.Client} */
  this.workerClient_ = pics3.worker.Client.get(appContext);
};
goog.inherits(pics3.ImageProcessor, goog.events.EventTarget);

pics3.ImageProcessor.SERVICE_ID = 's' + goog.getUid(pics3.ImageProcessor);

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.ImageProcessor}
 */
pics3.ImageProcessor.get = function(appContext) {
  return /** @type {!pics3.ImageProcessor} */ (goog.asserts.assertObject(
      appContext.get(pics3.ImageProcessor.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.ImageProcessor.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.ImageProcessor');

/** @param {!pics3.AppContext} appContext */
pics3.ImageProcessor.prototype.register = function(appContext) {
  appContext.register(pics3.ImageProcessor.SERVICE_ID, this);
};

/**
 * @param {?string} mimeType
 * @param {?string} name
 * @param {ArrayBuffer} buffer
 * @return {!goog.async.Deferred} producing {pics3.parser.ImageResult}
 */
pics3.ImageProcessor.prototype.parseImageAsync = function(mimeType, name,
    buffer) {
  var request = {
    'mimeType': mimeType,
    'name': name,
    'buffer': buffer
  };
  var rpcMessage = new pics3.worker.RpcMessage(
      pics3.worker.RpcMessage.Type.PARSE_IMAGE, request);
  return this.workerClient_.rpcAsync(rpcMessage).
      addCallback(function(response) {
        return pics3.parser.ImageResult.fromObject(response);
      }, this);
};
