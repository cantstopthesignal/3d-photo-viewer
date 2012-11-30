// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.MediaManager');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('pics3.PhotoList');
goog.require('pics3.Service');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.MediaManager = function() {
  goog.base(this);

  /** @type {!Object.<pics3.MediaManager.Source,!pics3.PhotoList>} */
  this.photoListMap_ = {};
};
goog.inherits(pics3.MediaManager, goog.events.EventTarget);

pics3.MediaManager.SERVICE_ID = 's' + goog.getUid(pics3.MediaManager);

/** @enum {string} */
pics3.MediaManager.Source = {
  UPLOAD: 'UPLOAD',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE'
};

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.MediaManager}
 */
pics3.MediaManager.get = function(appContext) {
  return /** @type {!pics3.MediaManager} */ (goog.asserts.assertObject(
      appContext.get(pics3.MediaManager.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.MediaManager.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.MediaManager');

/** @param {!pics3.AppContext} appContext */
pics3.MediaManager.prototype.register = function(appContext) {
  appContext.register(pics3.MediaManager.SERVICE_ID, this);
};

/**
 * @param {pics3.MediaManager.Source} source
 * @return {!pics3.PhotoList}
 */
pics3.MediaManager.prototype.getPhotoList = function(source) {
  var photoList = this.photoListMap_[source];
  if (!photoList) {
    photoList = new pics3.PhotoList();
    this.photoListMap_[source] = photoList;
  }
  return photoList;
};

/** @override */
pics3.MediaManager.prototype.disposeInternal = function() {
  goog.disposeAll(goog.object.getValues(this.photoListMap_));
  this.photoListMap_ = {};
  goog.base(this, 'disposeInternal');
};
