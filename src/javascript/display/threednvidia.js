// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDNvidia');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('goog.userAgent');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.Service');
goog.require('pics3.display.Base');
goog.require('pics3.encoder.Webm');
goog.require('pics3.encoder.Webp');
goog.require('pics3.encoder.util');


/**
 * @param {!pics3.AppContext} appContext
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDNvidia = function(appContext, photo) {
  goog.base(this, pics3.display.Type.THREE_D_NVIDIA, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);

  var imageProcessor = pics3.ImageProcessor.get(appContext);

  /** @type {!pics3.encoder.Webp} */
  this.webp_ = new pics3.encoder.Webp(imageProcessor.getWebpAsyncEncoder());
  this.registerDisposable(this.webp_);

  /** @type {!pics3.encoder.Webm} */
  this.webm_ = new pics3.encoder.Webm();
  this.registerDisposable(this.webm_);

  /** @type {!pics3.display.ThreeDNvidia.SupportDetector_} */
  this.supportDetector_ = pics3.display.ThreeDNvidia.SupportDetector_.get(
      appContext);
};
goog.inherits(pics3.display.ThreeDNvidia, pics3.display.Base);

/** @type {string} */
pics3.display.ThreeDNvidia.VIDEO_LOADED_DATA_EVENT_TYPE = 'loadeddata';

/** @type {Element} */
pics3.display.ThreeDNvidia.prototype.videoEl_;

pics3.display.ThreeDNvidia.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display');

  this.videoEl_ = document.createElement('video');
  goog.dom.classes.add(this.videoEl_, 'image');
  this.eventHandler.listen(this.videoEl_, pics3.display.ThreeDNvidia.
      VIDEO_LOADED_DATA_EVENT_TYPE, this.handleVideoLoaded_);

  this.webp_.encode(this.photo).addCallback(function() {
    var image = goog.asserts.assertObject(this.webp_.getImage());
    var frame = pics3.encoder.Webm.Frame.newFrame(image, 1000);
    if (this.photo.getImageCount() == 2) {
      frame.setStereoSideBySide(true);
    }
    this.webm_.addFrame(frame);
    this.webm_.compile(true);

    var url = pics3.encoder.util.createObjectUrl(this.webm_.getOutputAsBlob());
    this.videoEl_.src = url;
  }, this);

  goog.style.setStyle(this.videoEl_, 'visibility', 'hidden');
  this.el.appendChild(this.videoEl_);

  this.checkBrowserSupport_();
};

pics3.display.ThreeDNvidia.prototype.checkBrowserSupport_ = function() {
  this.supportDetector_.detectAsync(goog.bind(function(isSupported,
      warningMessage) {
    if (warningMessage) {
      var warningElWrapper = document.createElement('div');
      goog.dom.classes.add(warningElWrapper, 'browser-warning');
      var warningEl = document.createElement('div');
      goog.dom.classes.add(warningEl, 'inner');
      warningEl.appendChild(document.createTextNode(warningMessage));
      warningElWrapper.appendChild(warningEl);
      this.el.appendChild(warningElWrapper);
    }
  }, this));
};

pics3.display.ThreeDNvidia.prototype.handleVideoLoaded_ = function() {
  this.layout();
  goog.style.setStyle(this.videoEl_, 'visibility', '');
};

pics3.display.ThreeDNvidia.prototype.layout = function() {
  this.resizeComponentToFullSize(this.videoEl_, this.videoEl_.videoWidth,
      this.videoEl_.videoHeight);
};

/**
 * Check for proper browser support and plugins.
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.display.ThreeDNvidia.SupportDetector_ = function() {
  goog.base(this);

  /** @type {Element} */
  this.embedEl_;
};
goog.inherits(pics3.display.ThreeDNvidia.SupportDetector_,
    goog.events.EventTarget);

pics3.display.ThreeDNvidia.SupportDetector_.SERVICE_ID = 's' +
    goog.getUid(pics3.display.ThreeDNvidia.SupportDetector_);

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.display.ThreeDNvidia.SupportDetector_}
 */
pics3.display.ThreeDNvidia.SupportDetector_.get = function(appContext) {
  var service = appContext.get(pics3.display.ThreeDNvidia.
      SupportDetector_.SERVICE_ID);
  if (!service) {
    service = new pics3.display.ThreeDNvidia.SupportDetector_();
    appContext.register(pics3.display.ThreeDNvidia.SupportDetector_.SERVICE_ID,
        service);
  }
  return /** @type {!pics3.display.ThreeDNvidia.SupportDetector_} */ (
      goog.asserts.assertObject(service));
};

/** @type {goog.debug.Logger} */
pics3.display.ThreeDNvidia.SupportDetector_.prototype.logger_ =
    goog.debug.Logger.getLogger(
        'pics3.display.ThreeDNvidia.SupportDetector_');

/** @param {function(boolean, ?string)} callback */
pics3.display.ThreeDNvidia.SupportDetector_.prototype.detectAsync = function(
    callback) {
  var warningMessage;
  var isBrowserSupported = goog.userAgent.GECKO && goog.userAgent.isVersion(2);
  if (!isBrowserSupported) {
    // Firefox 4 (Gecko 2.0) required.
    warningMessage = 'Firefox 4.0 or greater required to view 3D webm files';
  }

  var hasPlugin = false;
  if (navigator.plugins && navigator.plugins.length) {
    hasPlugin = goog.array.find(navigator.plugins, function(plugin) {
      return plugin['name'].indexOf('NVIDIA 3D Vision') >= 0;
    });
  }

  if (hasPlugin && isBrowserSupported) {
    if (!this.embedEl_) {
      this.embedEl_ = document.createElement('embed');
      this.embedEl_.setAttribute('style', "visibility: hidden");
      this.embedEl_.setAttribute('width', 25);
      this.embedEl_.setAttribute('height', 25);
      this.embedEl_.setAttribute('type', "image/jps");
      document.body.appendChild(this.embedEl_);
    }
  }

  window.setTimeout(goog.bind(function() {
    var stereoCapable = false;
    var stereoEnabled = false;
    if (this.embedEl_) {
      try {
        stereoCapable = !!parseInt(this.embedEl_['NvIsStereoCapable'](), 0);
      } catch(e) {}
      try {
        stereoEnabled = !!parseInt(this.embedEl_['NvIsStereoEnabled'](), 0);
      } catch(e) {}
    }
    if (!stereoCapable) {
      warningMessage = (warningMessage ? warningMessage + '; ' : '') +
          'NVidia 3D Vision required to view 3D webm files';
    } else if (!stereoEnabled) {
      warningMessage = (warningMessage ? warningMessage + '; ' : '') +
          'NVidia 3D Vision must be enabled to view 3D webm files';
    }
    callback(!warningMessage, warningMessage);
  }, this), 0);
};
