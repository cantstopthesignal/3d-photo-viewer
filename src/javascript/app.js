// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.App');

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
goog.require('pics3.Auth');
goog.require('pics3.MediaManager');
goog.require('pics3.MediaPicker');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.App = function() {
  this.auth_ = new pics3.Auth();

  this.appContext_ = new pics3.AppContext();
  this.registerDisposable(this.appContext_);

  /** @type {pics3.MediaManager} */
  this.mediaManager_ = new pics3.MediaManager();
  this.mediaManager_.register(this.appContext_);
  this.registerDisposable(this.mediaManager_);

  /** @type {goog.events.EventHandler} */
  this.eventHandler_ = new goog.events.EventHandler(this);
  this.registerDisposable(this.eventHandler_);
};
goog.inherits(pics3.App, goog.events.EventTarget);

pics3.App.APP_NAME = '3d Photo Viewer';

/** @type {goog.debug.Logger} */
pics3.App.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.App');

/** @type {pics3.AppBar} */
pics3.App.prototype.appBar_;

/** @type {pics3.MediaPicker} */
pics3.App.prototype.mediaPicker_;

/** @type {pics3.AboutDialog} */
pics3.App.prototype.aboutDialog_;

/** @type {pics3.AlbumView} */
pics3.App.prototype.albumView_;

/** @type {Element} */
pics3.App.prototype.appEl_;

pics3.App.prototype.start = function() {
  this.appEl_ = goog.dom.getElementByClass('app');
  goog.asserts.assert(this.appEl_);

  this.appBar_ = new pics3.AppBar();
  this.registerDisposable(this.appBar_);
  this.appBar_.render(this.appEl_);
  this.appBar_.getMainMenu().setTitle(pics3.App.APP_NAME);

  this.mediaPicker_ = new pics3.MediaPicker(this.appContext_);
  this.registerDisposable(this.mediaPicker_);
  this.mediaPicker_.render(this.appEl_);
  this.mediaPicker_.renderButton(this.appBar_.el);

  var aboutContentEl = goog.dom.getElementByClass('about-content');
  goog.asserts.assert(aboutContentEl);
  this.aboutDialog_ = new pics3.AboutDialog(aboutContentEl);
  this.registerDisposable(this.aboutDialog_);
  this.aboutDialog_.renderButton(this.appBar_.el);

  this.albumView_ = new pics3.AlbumView();
  this.registerDisposable(this.albumView_);
  this.albumView_.render(this.appEl_);

  this.auth_.getAuthDeferred().branch().
      addCallback(this.continueLoad_, this);
  this.auth_.start();

  this.eventHandler_.
      listen(window, goog.events.EventType.RESIZE, this.handleWindowResize_).
      listen(window, 'beforeunload', this.handleWindowBeforeUnload_).
      listen(this.mediaPicker_, pics3.MediaPicker.EventType.PHOTO_LIST_CHANGED,
          this.handleMediaPickerPhotoListChanged_).
      listen(window, goog.events.EventType.FOCUS, this.handleWindowFocus_);
  this.resize();
  this.albumView_.focus();
};

/** @override */
pics3.App.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};

pics3.App.prototype.continueLoad_ = function() {
  window.console.log('Continue to load...');
};

/** @param {pics3.MediaPicker.PhotoListChangedEvent} e */
pics3.App.prototype.handleMediaPickerPhotoListChanged_ = function(e) {
  this.albumView_.setPhotoList(e.photoList);
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

pics3.App.prototype.resize = function() {
  var parentHeight = this.appEl_.parentNode.offsetHeight;
  var appBarHeight = this.appBar_.el.offsetHeight;

  var appHeight = parentHeight;
  goog.style.setHeight(this.appEl_, appHeight);

  var contentAreaHeight = Math.max(0, appHeight - appBarHeight);
  if (this.mediaPicker_ && this.mediaPicker_.isExpanded()) {
    contentAreaHeight = Math.max(0, contentAreaHeight -
        this.mediaPicker_.el.offsetHeight);
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
