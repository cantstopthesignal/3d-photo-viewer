// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PhotoMimeType');
goog.provide('pics3.photoMimeType');

goog.require('goog.Disposable');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');


/** @enum {string} */
pics3.PhotoMimeType = {
  MPO: 'image/mpo',
  JPG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif'
};

/**
 * @param {string} mimeType
 * @return {boolean}
 */
pics3.photoMimeType.isSupported = function(mimeType) {
  return goog.object.containsValue(pics3.PhotoMimeType, mimeType);
};

/**
 * @param {?string} mimeType
 * @param {?string} fileName
 * @return {boolean}
 */
pics3.photoMimeType.isPossible3dPhoto = function(mimeType, fileName) {
  if (!mimeType || !mimeType.length) {
    return true;
  }
  if (mimeType == pics3.PhotoMimeType.MPO) {
    return true;
  }
  if (mimeType == pics3.PhotoMimeType.JPG && fileName) {
    var nameLower = fileName.toLowerCase();
    if (goog.string.endsWith(nameLower, '.mpo') ||
        nameLower.indexOf('.mpo.') >= 0) {
      return true;
    }
  }
  return false;
};
