// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.ThreeDAnaglyph');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.display.Base');


/**
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.display.Base}
 */
pics3.display.ThreeDAnaglyph = function(photo) {
  goog.base(this, pics3.display.Type.THREE_D_ANAGLYPH, photo);
  goog.asserts.assert(photo.getState() == pics3.Photo.State.LOADED);
  goog.asserts.assert(photo.getMimeType() == pics3.PhotoMimeType.MPO);
  goog.asserts.assert(photo.getImageCount() == 2);
};
goog.inherits(pics3.display.ThreeDAnaglyph, pics3.display.Base);

/** @type {Element} */
pics3.display.ThreeDAnaglyph.prototype.imageEl_;

pics3.display.ThreeDAnaglyph.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'photo-display');

  this.imageEl_ = document.createElement('img');
  goog.dom.classes.add(this.imageEl_, 'image');
  this.eventHandler.listen(this.imageEl_, goog.events.EventType.LOAD,
      this.handleImageLoaded_);
  goog.style.setStyle(this.imageEl_, 'visibility', 'hidden');
  this.el.appendChild(this.imageEl_);

  this.loadImages_().addCallback(function(images) {
    goog.asserts.assert(images[0].width == images[1].width);
    goog.asserts.assert(images[0].height == images[1].height);
    this.createAnaglyph_(images);
  }, this);
};

/**
 * @return {!goog.async.Deferred} producing {!Array.<!Image>}
 */
pics3.display.ThreeDAnaglyph.prototype.loadImages_ = function() {
  var dataUrls = this.photo.getImageDataUrls();
  var deferred = new goog.async.Deferred();

  var images = goog.array.map(dataUrls, function(){
    return new Image();
  });
  var loadCount = 0;
  var handleImageLoad = function() {
    loadCount++;
    if (loadCount < images.length) {
      return;
    }
    deferred.callback(images);
  };

  goog.array.forEach(dataUrls, function(dataUrl, i) {
    var image = images[i];
    this.eventHandler.listen(image, goog.events.EventType.LOAD,
        goog.bind(handleImageLoad, this));
    image.src = dataUrl;
  }, this);
  return deferred;
};

/** @param {!Array.<!Image>} images */
pics3.display.ThreeDAnaglyph.prototype.createAnaglyph_ = function(images) {
  var width = images[0].width;
  var height = images[0].height;
  var canvasEl = document.createElement('canvas');
  canvasEl.setAttribute('width', width);
  canvasEl.setAttribute('height', height);
  var canvasCtx = canvasEl.getContext('2d');

  var imageDatas = [];
  for (var i = 0; i < 2; i++) {
    canvasCtx.drawImage(images[i], 0, 0);
    imageDatas.push(canvasCtx.getImageData(0, 0, width, height));
  }
  var length = imageDatas[0].data.length;
  var data0 = imageDatas[0].data;
  var data1 = imageDatas[1].data;
  for (var i = 0; i < length; i += 4) {
    // r = 0.7 * g1 + 0.3 * b1;
    data0[i] = data0[i + 1] * 0.7 + data0[i + 2] * 0.3;
    // g = g2;
    data0[i + 1] = data1[i + 1];
    // b = b2;
    data0[i + 2] = data1[i + 2];
  }
  canvasCtx.putImageData(imageDatas[0], 0, 0);

  this.imageEl_.src = canvasEl.toDataURL(pics3.PhotoMimeType.JPG);
};

pics3.display.ThreeDAnaglyph.prototype.handleImageLoaded_ = function() {
  this.layout();
  goog.style.setStyle(this.imageEl_, 'visibility', '');
};

pics3.display.ThreeDAnaglyph.prototype.layout = function() {
  this.resizeImageToFullSize(this.imageEl_);
};
