// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.BlobFile');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('pics3.loader.File');
goog.require('pics3.loader.FileResult');
goog.require('pics3.loader.ProgressEvent');


/**
 * @param {!Blob} blob
 * @extends {pics3.loader.File}
 * @constructor
 */
pics3.loader.BlobFile = function(blob) {
  goog.base(this);

  /** @type {!Blob} */
  this.blob_ = blob;

  /** @type {goog.events.EventHandler} */
  this.eventHandler = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler);
};
goog.inherits(pics3.loader.BlobFile, pics3.loader.File);

/** @type {goog.debug.Logger} */
pics3.loader.BlobFile.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.loader.BlobFile');

/** @override */
pics3.loader.BlobFile.prototype.loadAsync = function() {
  var fileReader = new FileReader();
  var deferred = new goog.async.Deferred();

  function handleLoad() {
    var fileResult = new pics3.loader.FileResult(fileReader.result,
        this.blob_.type, this.blob_.name);
    deferred.callback(fileResult);
  }
  function handleError(e) {
    deferred.errback(fileReader.error);
  }
  function handleProgress(e) {
    var browserEvent = e.getBrowserEvent();
    if (browserEvent.lengthComputable) {
      this.dispatchEvent(new pics3.loader.ProgressEvent(
          browserEvent.loaded, browserEvent.total));
    }
  }
  this.eventHandler.
      listen(fileReader, goog.events.EventType.LOAD, handleLoad).
      listen(fileReader, 'progress', handleProgress).
      listen(fileReader, goog.events.EventType.ERROR, handleError);
  fileReader.readAsArrayBuffer(this.blob_);
  return deferred;
};
