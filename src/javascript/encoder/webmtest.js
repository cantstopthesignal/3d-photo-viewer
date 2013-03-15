// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.encoder.WebmTest');

goog.require('goog.async.Deferred');
goog.require('goog.date.Date');
goog.require('goog.dom');
goog.require('goog.testing.DeferredTestCase');
goog.require('goog.testing.jsunit');
goog.require('pics3.PhotoMimeType');
goog.require('pics3.encoder.Webm');
goog.require('pics3.encoder.Webp');
goog.require('pics3.encoder.testing.webmTestUtil');
goog.require('pics3.encoder.util');
goog.require('pics3.parser.base64');


var deferredTestCase;
var webm;

pics3.encoder.WebmTest.install = function() {
  deferredTestCase = goog.testing.DeferredTestCase.createAndInstall(
      'pics3.encoder.WebmTest');
};

function setUp() {
  webm = new pics3.encoder.Webm();
}

function tearDown() {
  goog.dispose(webm);
  delete webm;
}

function testEncodeVideo() {
  var canvasEl = document.createElement('canvas');
  canvasEl.setAttribute('width', 150);
  canvasEl.setAttribute('height', 150);
  document.body.appendChild(canvasEl);
  var canvasCtx = canvasEl.getContext('2d');

  var videoEl = document.createElement('video');
  videoEl.setAttribute('width', 150);
  videoEl.setAttribute('height', 150);
  videoEl.setAttribute('controls', 'on');
  videoEl.setAttribute('autoplay', 'on');
  document.body.appendChild(videoEl);

  var time = new goog.date.Date(2013, 1, 1).getTime();
  var frameIndex = 0;
  var frameCount = 5;
  var frameDurations = [20, 30, 40, 50, 60];
  var loadedDataFired = false;

  function finish(d) {
    goog.dom.removeNode(canvasEl);
    goog.dom.removeNode(videoEl);
    d.callback();
  }

  function finalizeVideo(d) {
    webm.compile(true);
    assertEquals(TEST_ENCODE_VIDEO_GOLDEN_WEBM_BASE64,
        pics3.parser.base64.fromUint8Array(webm.getOutput()));
    var url = pics3.encoder.util.createObjectUrl(webm.getOutputAsBlob());
    videoEl.addEventListener('loadeddata', function() {
      loadedDataFired = true;
      assertEquals(150, videoEl.videoWidth);
      assertEquals(150, videoEl.videoHeight);
    }, false);
    videoEl.addEventListener('error', function(e) {
      fail('Video error: ' + e);
    }, false);
    videoEl.addEventListener('ended', function() {
      assertTrue(loadedDataFired);
      assertEquals(0, videoEl.startTime);
      assertEquals(200, Math.round(videoEl.duration * 1000));
      finish(d);
    }, false);
    videoEl.src = url;
  }

  function renderNextFrame(d) {
    if (frameIndex >= frameCount) {
      finalizeVideo(d);
      return;
    }

    time += 1000;
    pics3.encoder.testing.webmTestUtil.renderClock(canvasCtx, time);

    var webp = new pics3.encoder.Webp();
    var dataUrl = new pics3.parser.DataUrl(canvasEl.toDataURL(
        pics3.PhotoMimeType.JPG));
    webp.encodeDataUrls([dataUrl]).addCallback(function() {
      var image = webp.getImages()[0];
      var frame = pics3.encoder.Webm.Frame.newFrame(image,
          frameDurations[frameIndex]);
      webm.addFrame(frame);
      frameIndex++;
      renderNextFrame(d);
    });
  }

  var callbacks = new goog.async.Deferred();
  deferredTestCase.addWaitForAsync('Waiting for video encode', callbacks);
  callbacks.addCallback(function() {
    var d = new goog.async.Deferred();
    renderNextFrame(d);
    return d;
  });
  deferredTestCase.waitForDeferred(callbacks);
}

/** @type {string} */
var TEST_ENCODE_VIDEO_GOLDEN_WEBM_BASE64 = ['GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQ',
    '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'].
    join('');
