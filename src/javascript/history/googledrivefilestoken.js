// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.GoogleDriveFilesToken');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('pics3.PhotoId');
goog.require('pics3.history.Token');


/**
 * @param {!Array.<!pics3.PhotoId>} fileIds
 * @param {pics3.PhotoId=} opt_currentFileId
 * @constructor
 * @extends {pics3.history.Token}
 */
pics3.history.GoogleDriveFilesToken = function(fileIds, opt_currentFileId) {
  goog.base(this);

  goog.asserts.assert(fileIds.length);
  /** @type {!Array.<!pics3.PhotoId>} */
  this.fileIds_ = fileIds;

  /** @type {?pics3.PhotoId} */
  this.currentFileId_ = opt_currentFileId || null;
};
goog.inherits(pics3.history.GoogleDriveFilesToken, pics3.history.Token);

/** @type {string} */
pics3.history.GoogleDriveFilesToken.PARAM = 'googledrivefiles';

/** @type {string} */
pics3.history.GoogleDriveFilesToken.FILE_PARAM = 'file';

/**
 * @param {goog.Uri} uri
 * @return {?pics3.history.GoogleDriveFilesToken}
 */
pics3.history.GoogleDriveFilesToken.fromUri = function(uri) {
  var value = uri.getParameterValue(pics3.history.GoogleDriveFilesToken.PARAM);
  var currentFileValue = uri.getParameterValue(pics3.history.
      GoogleDriveFilesToken.FILE_PARAM);
  var currentFileId = currentFileValue ? new pics3.PhotoId(
      goog.asserts.assertString(currentFileValue)) : undefined;
  if (value) {
    var fileIds = goog.array.map(value.split('/'), function(fileId) {
      return new pics3.PhotoId(fileId);
    });
    return new pics3.history.GoogleDriveFilesToken(fileIds, currentFileId);
  }
  return null;
};

/** @return {!Array.<!pics3.PhotoId>} */
pics3.history.GoogleDriveFilesToken.prototype.getFileIds = function() {
  return this.fileIds_;
};

/** @return {?pics3.PhotoId} */
pics3.history.GoogleDriveFilesToken.prototype.getCurrentFileId = function() {
  return this.currentFileId_;
};

/** @override */
pics3.history.GoogleDriveFilesToken.prototype.addToUri = function(uri) {
  var fileIdStrs = goog.array.map(this.fileIds_, function(fileId) {
    return fileId.id;
  });
  uri.setParameterValue(pics3.history.GoogleDriveFilesToken.PARAM,
      fileIdStrs.join('/'));
  if (this.currentFileId_) {
    uri.setParameterValue(pics3.history.GoogleDriveFilesToken.FILE_PARAM,
        this.currentFileId_.id);
  }
};
