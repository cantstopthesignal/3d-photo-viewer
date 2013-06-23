// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.PhotoView');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.ProgressIndicator');
goog.require('pics3.ThreeDDisplayChooser');
goog.require('pics3.display.ThreeDCross');
goog.require('pics3.display.ThreeDNvidia');
goog.require('pics3.display.ThreeDSingleImage');
goog.require('pics3.display.ThreeDWobble');
goog.require('pics3.display.TwoD');
goog.require('pics3.display.type');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.Component}
 */
pics3.PhotoView = function(appContext, photo) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.Photo} */
  this.photo_ = photo;

  /** @type {pics3.display.Base} */
  this.display_;

  /** @type {!pics3.ThreeDDisplayChooser} */
  this.displayChooser_ = new pics3.ThreeDDisplayChooser();
  this.registerDisposable(this.displayChooser_);

  /** @type {!pics3.Spinner} */
  this.spinner_ = new pics3.Spinner(true);
  this.registerDisposable(this.spinner_);

  /** @type {pics3.ProgressIndicator} */
  this.progress_ = new pics3.ProgressIndicator();
  this.registerDisposable(this.progress_);
};
goog.inherits(pics3.PhotoView, pics3.Component);

/** @type {goog.debug.Logger} */
pics3.PhotoView.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.PhotoView');

pics3.PhotoView.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-view');

  this.spinner_.render(this.el);
  this.spinner_.setFloatingStyle(true);

  this.progress_.render(this.el);
  goog.style.setStyle(this.progress_.el, 'visibility', 'hidden');

  this.displayChooser_.render(this.el);
  goog.style.showElement(this.displayChooser_.el, false);

  this.eventHandler.
      listen(this.photo_, pics3.loader.EventType.PROGRESS,
          this.handlePhotoLoadProgress_).
      listen(this.displayChooser_, pics3.ThreeDDisplayChooser.EventType.CHANGED,
          this.handleThreeDDisplayChooserChanged_);
};

pics3.PhotoView.prototype.start = function() {
  var spinEntry = this.spinner_.spin(100);
  this.photo_.loadAsync().addBoth(function() {
        spinEntry.release();
      }, this).addBoth(this.updateDisplay_, this);
};

pics3.PhotoView.prototype.display = function() {
  if (!this.displayChooser_.updateToMatchUserPreference()) {
    return;  // No change made
  }
  if (this.display_ && this.photo_.stateIn(pics3.Photo.State.LOADED)) {
    this.recreateDisplay_();
  }
};

/** @param {pics3.loader.ProgressEvent} e */
pics3.PhotoView.prototype.handlePhotoLoadProgress_ = function(e) {
  goog.style.setStyle(this.progress_.el, 'visibility', '');
  this.progress_.setState(e.loaded, e.total);
};

pics3.PhotoView.prototype.handleThreeDDisplayChooserChanged_ = function() {
  this.recreateDisplay_();
};

pics3.PhotoView.prototype.updateDisplay_ = function() {
  if (this.photo_.getState() == pics3.Photo.State.ERROR) {
    this.logger_.severe('Update photo: ' + this.photo_.getError());
    return;
  } else if (this.photo_.getState() == pics3.Photo.State.LOADED) {
    goog.style.setStyle(this.progress_.el, 'display', 'none');
    this.recreateDisplay_();
  } else {
    goog.asserts.fail('Unexpected photo state: ' + this.photo_.getState());
  }
};

pics3.PhotoView.prototype.recreateDisplay_ = function() {
  goog.dispose(this.display_);
  delete this.display_;
  this.createDisplay_();
};

pics3.PhotoView.prototype.createDisplay_ = function() {
  goog.asserts.assert(!this.display_);
  if (this.photo_.getMimeType() == pics3.PhotoMimeType.MPO) {
    goog.style.showElement(this.displayChooser_.el, true);
    var type = this.displayChooser_.getSelectedType();
    switch (type) {
      case pics3.display.Type.THREE_D_CROSS:
        this.display_ = new pics3.display.ThreeDCross(this.photo_);
        break;
      case pics3.display.Type.THREE_D_LEFT_IMAGE:
        this.display_ = new pics3.display.ThreeDSingleImage(true, this.photo_);
        break;
      case pics3.display.Type.THREE_D_RIGHT_IMAGE:
        this.display_ = new pics3.display.ThreeDSingleImage(false, this.photo_);
        break;
      case pics3.display.Type.THREE_D_NVIDIA:
        this.display_ = new pics3.display.ThreeDNvidia(this.appContext_,
            this.photo_);
        break;
      case pics3.display.Type.THREE_D_WOBBLE:
        this.display_ = new pics3.display.ThreeDWobble(this.photo_);
        break;
      default:
        goog.asserts.fail('Unexpected display type: ' + type);
    }
    this.display_.render(this.el);
  } else {
    goog.style.showElement(this.displayChooser_.el, false);
    this.display_ = new pics3.display.TwoD(this.photo_);
    this.display_.render(this.el);
  }
  this.resizeDisplay_();
};

pics3.PhotoView.prototype.resize = function(opt_width, opt_height) {
  var width = opt_width || this.el.parentNode.offsetWidth;
  var height = opt_height || this.el.parentNode.offsetHeight;
  goog.style.setBorderBoxSize(this.el,
      new goog.math.Size(width, height));

  var spinnerSize = this.spinner_.getSize();
  var spinnerY = (height - spinnerSize) / 2;
  goog.style.setPosition(this.spinner_.el,
      (width - spinnerSize) / 2, spinnerY);

  goog.style.setPosition(this.progress_.el,
      (width - this.progress_.el.offsetWidth) / 2,
      spinnerY + spinnerSize + 20);

  this.resizeDisplay_();
};

pics3.PhotoView.prototype.resizeDisplay_ = function() {
  if (this.display_) {
    this.display_.resize(this.el.offsetWidth, this.el.offsetHeight);
  }
};