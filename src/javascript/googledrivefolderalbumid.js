// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveFolderAlbumId');

goog.require('goog.asserts');
goog.require('pics3.AlbumId');


/**
 * @param {string} id
 * @constructor
 * @extends {pics3.AlbumId}
 */
pics3.GoogleDriveFolderAlbumId = function(id) {
  goog.base(this);

  /** @type {string} */
  this.id = goog.asserts.assertString(id);
};
goog.inherits(pics3.GoogleDriveFolderAlbumId, pics3.AlbumId);

/**
 * @param {string} id
 * @return {!pics3.GoogleDriveFolderAlbumId}
 */
pics3.GoogleDriveFolderAlbumId.fromId = function(id) {
  return new pics3.GoogleDriveFolderAlbumId(id);
};

/** @override */
pics3.GoogleDriveFolderAlbumId.prototype.equals = function(other) {
  if (!(other instanceof pics3.GoogleDriveFolderAlbumId)) {
    return false;
  }
  return this.id == other.id;
};
