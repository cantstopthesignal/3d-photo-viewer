// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.MpoTest');

goog.require('goog.async.Deferred');
goog.require('goog.testing.DeferredTestCase');
goog.require('goog.testing.jsunit');
goog.require('pics3.parser.DataUrl');
goog.require('pics3.parser.Mpo');
goog.require('pics3.testing.sampleimages');


var deferredTestCase;
var mpo;

pics3.parser.MpoTest.install = function() {
  deferredTestCase = goog.testing.DeferredTestCase.createAndInstall(
      'pics3.parser.MpoTest');
};

function setUp() {
  mpo = new pics3.parser.Mpo();
}

function tearDown() {
  goog.dispose(mpo);
  delete mpo;
}

function testParseImage() {
  var dataUrl = new pics3.parser.DataUrl(pics3.testing.sampleimages.
      SAMPLE1_AUTOPARALLAX);
  assertEquals('image/mpo', dataUrl.getMimeType());
  var data = dataUrl.toUint8Array();
  assertEquals(1394115, data.length);

  assertTrue(mpo.parse(data.buffer, true));

  var images = mpo.getImages();
  assertEquals(2, images.length);
  var mpoIfd = images[0].getMpoIfd();
  assertTrue(!!mpoIfd);
  assertFalse(!!images[1].getMpoIfd());

  var imageDataUrls = goog.array.map(images, function(image) {
    return image.toDataUrl();
  });

  goog.array.forEach(imageDataUrls, function(dataUrl) {
    assertEquals('image/jpeg', dataUrl.getMimeType());
  });

  assertEquals(157.5, mpo.getParallaxXOffset());

  var callbacks = new goog.async.Deferred();
  goog.array.forEach(imageDataUrls, function(dataUrl) {
    deferredTestCase.addWaitForAsync('Waiting for image render', callbacks);
    callbacks.addCallback(function() {
      var d = new goog.async.Deferred();
      var imageEl = document.createElement('img');
      imageEl.style.visibility = 'hidden';
      imageEl.style.position = 'absolute';
      imageEl.onload = function() {
        assertEquals(1920, imageEl.offsetWidth);
        assertEquals(1080, imageEl.offsetHeight);
        d.callback();
      };
      imageEl.src = dataUrl.toString();
      document.body.appendChild(imageEl);
      return d;
    });
  });
  deferredTestCase.waitForDeferred(callbacks);
}

function testParseJpeg() {
  var dataUrl = new pics3.parser.DataUrl(pics3.testing.sampleimages.
      SAMPLE1_LEFTEYE_JPEG);
  assertEquals('image/jpeg', dataUrl.getMimeType());
  var data = dataUrl.toUint8Array();
  assertEquals(565912, data.length);

  assertFalse(mpo.parse(data.buffer));
  assertEquals('pics3.parser.Mpo: Expected to find an mpo ifd for 3d image',
      mpo.getError().message);
}

function testParsePng() {
  var dataUrl = new pics3.parser.DataUrl(pics3.testing.sampleimages.
      SAMPLE1_LEFTEYE_PNG);
  assertEquals('image/png', dataUrl.getMimeType());
  var data = dataUrl.toUint8Array();
  assertEquals(303495, data.length);

  assertFalse(mpo.parse(data.buffer));
  assertEquals('pics3.parser.Mpo.Image: Expected SOI', mpo.getError().message);
}
