// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.App');

goog.require('goog.Uri');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.AboutDialog');
goog.require('pics3.AlbumView');
goog.require('pics3.AppBar');
goog.require('pics3.AppContext');
goog.require('pics3.GoogleClient');
goog.require('pics3.GoogleDriveApi');
goog.require('pics3.GooglePickerClient');
goog.require('pics3.ImageProcessor');
goog.require('pics3.MediaManager');
goog.require('pics3.NotificationManager');
goog.require('pics3.PicasaApi');
goog.require('pics3.history.GoogleDriveHandler');
goog.require('pics3.history.Manager');
goog.require('pics3.history.PicasaHandler');
goog.require('pics3.source.Picker');
goog.require('pics3.source.Tile');
goog.require('pics3.worker.Client');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.App = function() {
  /** @type {!pics3.AppContext} */
  this.appContext_ = new pics3.AppContext();
  this.registerDisposable(this.appContext_);

  /** @type {!pics3.history.Manager} */
  this.history_ = new pics3.history.Manager();
  this.history_.register(this.appContext_);

  /** @type {!goog.Uri} */
  this.uri_ = new goog.Uri(window.location.href);

  /** @type {!pics3.worker.Client} */
  this.workerClient_ = new pics3.worker.Client();
  this.workerClient_.register(this.appContext_);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = new pics3.GoogleClient();
  this.googleClient_.register(this.appContext_);

  /** @type {!pics3.GooglePickerClient} */
  this.googlePickerClient_ = new pics3.GooglePickerClient(this.appContext_);
  this.googlePickerClient_.register(this.appContext_);

  /** @type {!pics3.GoogleDriveApi} */
  this.googleDriveApi_ = new pics3.GoogleDriveApi(this.appContext_);
  this.googleDriveApi_.register(this.appContext_);

  /** @type {!pics3.PicasaApi} */
  this.picasaApi_ = new pics3.PicasaApi(this.appContext_);
  this.picasaApi_.register(this.appContext_);

  /** @type {!pics3.ImageProcessor} */
  this.imageProcessor_ = new pics3.ImageProcessor(this.appContext_);
  this.imageProcessor_.register(this.appContext_);

  /** @type {pics3.MediaManager} */
  this.mediaManager_ = new pics3.MediaManager();
  this.mediaManager_.register(this.appContext_);

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.App, goog.events.EventTarget);

pics3.App.APP_NAME = '3D Photo Viewer';

/** @type {goog.debug.Logger} */
pics3.App.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.App');

/** @type {pics3.AppBar} */
pics3.App.prototype.appBar_;

/** @type {pics3.source.Picker} */
pics3.App.prototype.sourcePicker_;

/** @type {pics3.AboutDialog} */
pics3.App.prototype.aboutDialog_;

/** @type {pics3.AlbumView} */
pics3.App.prototype.albumView_;

/** @type {Element} */
pics3.App.prototype.appEl_;

pics3.App.prototype.start = function() {
  this.workerClient_.start();

  this.appEl_ = goog.dom.getElementByClass('app');
  goog.asserts.assert(this.appEl_);

  this.appBar_ = new pics3.AppBar();
  this.registerDisposable(this.appBar_);
  this.appBar_.render(this.appEl_);
  this.appBar_.getMainMenu().setTitle(pics3.App.APP_NAME);

  var notificationManager = new pics3.NotificationManager(this.appBar_);
  notificationManager.register(this.appContext_);

  this.sourcePicker_ = new pics3.source.Picker(this.appContext_);
  this.registerDisposable(this.sourcePicker_);
  this.sourcePicker_.render(this.appEl_);
  this.sourcePicker_.renderButton(this.appBar_.el);

  var aboutContentEl = goog.dom.getElementByClass('about-content');
  goog.asserts.assert(aboutContentEl);
  this.aboutDialog_ = new pics3.AboutDialog(aboutContentEl);
  this.registerDisposable(this.aboutDialog_);
  this.aboutDialog_.renderButton(this.appBar_.el);

  this.albumView_ = new pics3.AlbumView();
  this.registerDisposable(this.albumView_);
  this.albumView_.render(this.appEl_);

  this.googleClient_.loadAsync().addCallback(function() {
    this.logger_.info('Google client loaded');
  }, this);

  this.googlePickerClient_.loadAsync().addCallback(function() {
    this.logger_.info('Google Picker loaded');
  }, this);

  this.eventHandler_.
      listen(window, goog.events.EventType.RESIZE, this.handleWindowResize_).
      listen(window, 'beforeunload', this.handleWindowBeforeUnload_).
      listen(this.albumView_, pics3.AlbumView.EventType.SWITCH_PHOTO,
          this.handleAlbumViewSwitchPhoto_).
      listen(this.sourcePicker_, pics3.source.Tile.EventType.SELECT,
          this.handleSourcePickerSelectionChanged_).
      listen(this.mediaManager_, pics3.MediaManager.EventType.ALBUM_OPENED,
          this.handleMediaManagerAlbumOpened_).
      listen(this.mediaManager_, pics3.MediaManager.EventType.PHOTO_OPENED,
          this.handleMediaManagerPhotoOpened_).
      listen(window, goog.events.EventType.FOCUS, this.handleWindowFocus_);
  this.resize();
  this.albumView_.focus();

  this.history_.registerHandler(new pics3.history.GoogleDriveHandler(
      this.appContext_));
  this.history_.registerHandler(new pics3.history.PicasaHandler(
      this.appContext_));
  this.history_.start();
};

/** @override */
pics3.App.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};

/** @param {goog.events.Event} e */
pics3.App.prototype.handleSourcePickerSelectionChanged_ = function(e) {
  goog.asserts.assert(e.target instanceof pics3.source.Tile);
  var tile = /** @type {pics3.source.Tile} */ (e.target);
  this.albumView_.setAlbum(tile.getAlbum());
  this.updateHistory_();
};

pics3.App.prototype.handleAlbumViewSwitchPhoto_ = function() {
  this.updateHistory_();
};

/** @param {pics3.MediaManager.AlbumOpenedEvent} e */
pics3.App.prototype.handleMediaManagerAlbumOpened_ = function(e) {
  var tile = this.sourcePicker_.getTileForAlbum(e.album);
  if (tile) {
    tile.select();
  }
};

/** @param {pics3.MediaManager.PhotoOpenedEvent} e */
pics3.App.prototype.handleMediaManagerPhotoOpened_ = function(e) {
  this.history_.lock();
  var tile = this.sourcePicker_.getTileForAlbum(e.album);
  if (tile) {
    tile.select();
  }
  this.history_.unlock();
  this.albumView_.selectPhoto(e.photoId);
};

pics3.App.prototype.handleWindowResize_ = function() {
  this.resize();
};

/** @param {goog.events.BrowserEvent} e */
pics3.App.prototype.handleWindowFocus_ = function(e) {
  if (!this.albumView_ || e.target != window) {
    return;
  }
  window.setTimeout(goog.bind(function() {
    this.albumView_.focus();
  }, this), 0);
};

pics3.App.prototype.updateHistory_ = function() {
  if (!this.albumView_) {
    return;
  }
  var currentAlbum = this.albumView_.getAlbum();
  if (!currentAlbum) {
    return;
  }
  var currentPhoto = this.albumView_.getDisplayedPhoto();
  var token = this.mediaManager_.getHistoryTokenForAlbum(currentAlbum,
      currentPhoto ? currentPhoto.getId() : undefined);
  if (token) {
    this.history_.pushToken(token);
  }
};

pics3.App.prototype.resize = function() {
  var parentHeight = this.appEl_.parentNode.offsetHeight;
  var appBarHeight = this.appBar_.el.offsetHeight;

  var appHeight = parentHeight;
  goog.style.setHeight(this.appEl_, appHeight);

  var contentAreaHeight = Math.max(0, appHeight - appBarHeight);
  if (this.sourcePicker_ && this.sourcePicker_.isExpanded()) {
    contentAreaHeight = Math.max(0, contentAreaHeight -
        this.sourcePicker_.el.offsetHeight);
  }
  if (this.albumView_) {
    this.albumView_.resize(undefined, contentAreaHeight);
  }
};

/** @param {goog.events.BrowserEvent} e */
pics3.App.prototype.handleWindowBeforeUnload_ = function(e) {
  if (this.eventsView_ && this.eventsView_.hasUnsavedChanges()) {
    var message = this.eventsView_.getUnloadWarning();
    if (message) {
      if (e) {
        e.returnValue = message;
      }
      return message;
    }
  }
};
