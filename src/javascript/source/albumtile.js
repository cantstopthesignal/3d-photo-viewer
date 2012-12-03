// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.AlbumTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.Album');
goog.require('pics3.GoogleClient');
goog.require('pics3.GooglePickerClient');
goog.require('pics3.MediaManager');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.Album} album
 * @constructor
 * @extends {pics3.source.Tile}
 */
pics3.source.AlbumTile = function(appContext, album) {
  goog.base(this, appContext, 'google-plus-logo');

  /** @type {!pics3.Album} */
  this.album = album;

  this.eventHandler.listen(this.album, pics3.Album.EventType.STATE_CHANGED,
      this.handleAlbumStateChange_);
};
goog.inherits(pics3.source.AlbumTile, pics3.source.Tile);

pics3.source.AlbumTile.prototype.handleAlbumStateChange_ = function() {
  if (this.album.getState() == pics3.Album.State.LOADING) {
    var spinEntry = this.spinner.spin();
    this.album.getLoadDeferred().addBoth(function() {
      spinEntry.release();
    }, this);
  } else if (this.album.getState() == pics3.Album.State.LOADED) {
    this.updateNote();
  }
};

/** @override */
pics3.source.AlbumTile.prototype.getNoteText =  function() {
  var baseNoteText = goog.base(this, 'getNoteText');
  var albumName = this.album.getName();
  if (albumName && albumName.length > 0) {
    return albumName + ': ' + baseNoteText;
  }
  return baseNoteText;
};
