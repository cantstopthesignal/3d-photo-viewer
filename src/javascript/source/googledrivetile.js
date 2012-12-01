// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.source.GoogleDriveTile');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('pics3.GoogleClient');
goog.require('pics3.GooglePickerClient');
goog.require('pics3.MediaManager');
goog.require('pics3.source.Tile');


/**
 * @param {!pics3.AppContext} appContext
 * @constructor
 * @extends {pics3.source.Tile}
 */
pics3.source.GoogleDriveTile = function(appContext) {
  goog.base(this, appContext);

  var mediaManager = pics3.MediaManager.get(this.appContext);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext);

  /** @type {!pics3.GooglePickerClient} */
  this.pickerClient_ = pics3.GooglePickerClient.get(this.appContext);

  /** @type {!pics3.PhotoList} */
  this.photoList_ = mediaManager.getPhotoList(
      pics3.MediaManager.Source.GOOGLE_DRIVE);

  this.eventHandler.listen(this.photoList_, pics3.PhotoList.EventType.CHANGED,
      this.handlePhotoListChanged_);
};
goog.inherits(pics3.source.GoogleDriveTile, pics3.source.Tile);

/** @type {pics3.Button} */
pics3.source.GoogleDriveTile.prototype.button_;

/** @type {Element} */
pics3.source.GoogleDriveTile.prototype.noteEl_;

pics3.source.GoogleDriveTile.prototype.createDom = function() {
  goog.base(this, 'createDom');

  this.noteEl_ = document.createElement('div');
  goog.dom.classes.add(this.noteEl_, 'note');
  goog.style.showElement(this.noteEl_, false);
  this.el.appendChild(this.noteEl_);

  this.button_ = new pics3.Button('');
  this.registerDisposable(this.button_);
  this.button_.setCaptionHtml(this.getOpenFirstCaptionHtml_());
  this.button_.render(this.el);

  this.eventHandler.
      listen(this.button_.el, goog.events.EventType.CLICK,
          this.handleLoadClick_).
      listen(this.el, goog.events.EventType.CLICK, this.handleClick_);
};

/** @override */
pics3.source.GoogleDriveTile.prototype.getPhotoList = function() {
  return this.photoList_;
};

pics3.source.GoogleDriveTile.prototype.handlePhotoListChanged_ = function() {
  if (this.photoList_.getLength() > 0) {
    goog.style.showElement(this.noteEl_, true);

    if (this.photoList_.getLength() > 1) {
      /** @desc Number of photos loaded from Google Drive */
      var MSG_N_PHOTOS_GOOGLE_DRIVE = goog.getMsg(
          '{$logoHtml} {$count} photos from Google Drive',
          {count: this.photoList_.getLength(),
           logoHtml: this.getLogoHtml_()});
      this.noteEl_.innerHTML = MSG_N_PHOTOS_GOOGLE_DRIVE;
    } else {
      /** @desc Number of photos loaded from Google Drive */
      var MSG_1_PHOTO_GOOGLE_DRIVE = goog.getMsg(
          '{$logoHtml} 1 photo from Google Drive',
          {logoHtml: this.getLogoHtml_()});
      this.noteEl_.innerHTML = MSG_1_PHOTO_GOOGLE_DRIVE;
    }

    this.button_.setCaption(pics3.source.Tile.MSG_ADD_MORE);
  } else {
    goog.style.showElement(this.noteEl_, false);
    this.button_.setCaptionHtml(this.getOpenFirstCaptionHtml_());
  }
};

pics3.source.GoogleDriveTile.prototype.handleClick_ = function() {
  this.select();
};

/** @param {goog.events.BrowserEvent} e */
pics3.source.GoogleDriveTile.prototype.handleLoadClick_ = function(e) {
  e.stopPropagation();
  this.googleClient_.setAuthRequired(true);
  this.googleClient_.getAuthDeferred().branch().addCallback(function() {
    this.pickerClient_.loadAsync().addCallback(
        this.displayPicker_, this);
  }, this);
};

pics3.source.GoogleDriveTile.prototype.displayPicker_ = function() {
  var picker = this.pickerClient_.newPickerBuilder().
      build();
  this.eventHandler.listen(
      picker, pics3.GooglePickerClient.Picker.EventType.PICK,
      this.handlePickerPick_);
  picker.show();
};

/** @param {pics3.GooglePickerClient.PickerEvent} e */
pics3.source.GoogleDriveTile.prototype.handlePickerPick_ = function(e) {
  var photos = e.result.getPhotos();
  this.photoList_.addAll(photos);
  if (photos.length) {
    this.select();
  }
};

/** @return {string} */
pics3.source.GoogleDriveTile.prototype.getOpenFirstCaptionHtml_ = function() {
  /** @desc Load from my computer button caption */
  var MSG_LOAD_FIRST_DRIVE = goog.getMsg('{$logoHtml} View from Google Drive',
      {logoHtml: this.getLogoHtml_()});
  return MSG_LOAD_FIRST_DRIVE;
};

/** @return {string} */
pics3.source.GoogleDriveTile.prototype.getLogoHtml_ = function() {
  return '<div class="google-drive-logo"></div>';
};
