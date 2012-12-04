// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.worker.WorkerLogger');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.LogManager');
goog.require('goog.debug.Logger');
goog.require('goog.debug.TextFormatter');
goog.require('pics3.worker.Message');


/**
 * @constructor
 */
pics3.worker.WorkerLogger = function() {
  /** @type {Function} */
  this.publishHandler_ = goog.bind(this.addLogRecord_, this);

  /** @type {!goog.debug.TextFormatter} */
  this.formatter_ = new goog.debug.TextFormatter();
  this.formatter_.showAbsoluteTime = false;
  this.formatter_.showExceptionText = false;
};

/** @type {pics3.worker.WorkerLogger} */
pics3.worker.WorkerLogger.instance_;

pics3.worker.WorkerLogger.install = function() {
  if (!pics3.worker.WorkerLogger.instance_) {
    var instance = new pics3.worker.WorkerLogger();
    instance.setCapturing(true);
    pics3.worker.WorkerLogger.instance_ = instance;
  }
};

/** @type {boolean} */
pics3.worker.WorkerLogger.prototype.capturing_ = false;

pics3.worker.WorkerLogger.prototype.setCapturing = function(capturing) {
  if (this.capturing_ != capturing) {
    this.capturing_ = capturing;
    var rootLogger = goog.debug.LogManager.getRoot();
    if (this.capturing_) {
      rootLogger.addHandler(this.publishHandler_);
    } else {
      rootLogger.removeHandler(this.publishHandler_);
    }
  }
};

/** @param {goog.debug.LogRecord} logRecord */
pics3.worker.WorkerLogger.prototype.addLogRecord_ = function(logRecord) {
  var data = {
    'level': {
      'name': logRecord.getLevel().name,
      'value': logRecord.getLevel().value
    },
    'record': this.formatter_.formatRecord(logRecord).trim()
  };
  var message = new pics3.worker.Message(
      pics3.worker.Message.Type.LOG, data);
  message.send(goog.global);
};
