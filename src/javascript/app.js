// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.App');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.AppBar');
goog.require('pics3.AppContext');
goog.require('pics3.Auth');
goog.require('pics3.MediaPicker');
goog.require('pics3.parser.Mpo');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.App = function() {
  this.auth_ = new pics3.Auth();

  this.appContext_ = new pics3.AppContext();
  this.registerDisposable(this.appContext_);

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

/** @type {Element} */
pics3.App.prototype.footerEl_;

/** @type {Element} */
pics3.App.prototype.appEl_;

pics3.App.prototype.start = function() {
  this.appEl_ = goog.dom.getElementByClass('app');
  goog.asserts.assert(this.appEl_);
  this.footerEl_ = goog.dom.getElementByClass('footer');
  goog.asserts.assert(this.footerEl_);

  this.appBar_ = new pics3.AppBar();
  this.appBar_.render(this.appEl_);
  this.appBar_.getMainMenu().setTitle(pics3.App.APP_NAME);

  this.mediaPicker_ = new pics3.MediaPicker();
  this.mediaPicker_.render(this.appEl_);
  this.mediaPicker_.renderButton(this.appBar_.el);

  this.auth_.getAuthDeferred().branch().
      addCallback(this.continueLoad_, this);
  this.auth_.start();

  this.eventHandler_.
      listen(window, goog.events.EventType.RESIZE, this.handleWindowResize_).
      listen(window, 'beforeunload', this.handleWindowBeforeUnload_);
  this.resize();
};

/** @override */
pics3.App.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};

pics3.App.prototype.continueLoad_ = function() {
  window.console.log('Continue to load...');
};

pics3.App.prototype.handleWindowResize_ = function() {
  this.resize();
};

pics3.App.prototype.resize = function() {
  var parentHeight = this.appEl_.parentNode.offsetHeight;
  var appBarHeight = this.appBar_.el.offsetHeight;
  var footerHeight = this.footerEl_.offsetHeight;

  var appHeight = parentHeight - footerHeight;
  goog.style.setHeight(this.appEl_, appHeight);

  var contentAreaHeight = Math.max(0, appHeight - appBarHeight);
  // TODO: Call subcomponent resize
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
