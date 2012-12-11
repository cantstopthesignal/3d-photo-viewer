// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.PicasaTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.Album');
goog.require('pics3.GoogleClient');
goog.require('pics3.GooglePickerClient');
goog.require('pics3.MediaManager');
goog.require('pics3.source.ButtonTile');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.source.ButtonTile}
 */
pics3.source.PicasaTile = function(appContext) {
  goog.base(this, appContext, 'google-plus-logo');

  /** @type {!pics3.MediaManager} */
  this.mediaManager_ = pics3.MediaManager.get(this.appContext);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext);

  /** @type {!pics3.GooglePickerClient} */
  this.pickerClient_ = pics3.GooglePickerClient.get(this.appContext);

  /** @type {!pics3.Album} */
  this.album = this.mediaManager_.getSourceAlbum(
      pics3.MediaManager.Source.PICASA);
};
goog.inherits(pics3.source.PicasaTile, pics3.source.ButtonTile);

pics3.source.PicasaTile.prototype.createDom = function() {
  goog.base(this, 'createDom');

  this.eventHandler.
      listen(this.button.el, goog.events.EventType.CLICK,
          this.handleLoadClick_);
};

/** @param {goog.events.BrowserEvent} e */
pics3.source.PicasaTile.prototype.handleLoadClick_ = function(e) {
  e.stopPropagation();
  this.googleClient_.addRequiredScopes(pics3.GoogleClient.PICASA_SCOPES);
  this.googleClient_.getAuthDeferred().branch().addCallback(function() {
    this.pickerClient_.loadAsync().addCallback(
        this.displayPicker_, this);
  }, this);
};

pics3.source.PicasaTile.prototype.displayPicker_ = function() {
  var picker = this.pickerClient_.newPickerBuilder().
      setMode(pics3.GooglePickerClient.Mode.PICASA).
      build();
  this.eventHandler.listen(
      picker, pics3.GooglePickerClient.Picker.EventType.PICK,
      this.handlePickerPick_);
  picker.show();
};

/** @param {pics3.GooglePickerClient.PickerEvent} e */
pics3.source.PicasaTile.prototype.handlePickerPick_ = function(e) {
  var photos = e.result.getPhotos();
  this.album.addAll(photos);
  var albums = e.result.getAlbums();
  if (albums) {
    this.mediaManager_.addAllAlbums(albums);
    var firstAlbum = this.mediaManager_.getAlbumById(albums[0].getAlbumId());
    goog.asserts.assert(firstAlbum);
    this.mediaManager_.openAlbum(firstAlbum);
  }
  if (photos.length) {
    this.select();
  }
};

/** @override */
pics3.source.PicasaTile.prototype.getOpenFirstCaptionHtml = function() {
  /** @desc Load from my computer button caption */
  var MSG_LOAD_FIRST_GOOGLEPLUS = goog.getMsg('{$logoHtml} Google+ Photos',
      {logoHtml: this.getLogoHtml_()});
  return MSG_LOAD_FIRST_GOOGLEPLUS;
};
