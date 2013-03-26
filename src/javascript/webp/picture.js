// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.picture');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.debug');
goog.require('webp.vp8.types');
goog.require('webp.vp8.utils');


goog.scope(function() {

var constants = webp.vp8.constants;
var debug = webp.vp8.debug;
var vp8 = webp.vp8;

/** @constructor */
webp.picture.WebPPicture = function() {
  //   INPUT
  //////////////

  // YUV input (mostly used for input to lossy compression)
  // colorspace: should be YUV420 for now (=Y'CbCr).
  this.colorspace = vp8.types.WebPEncCSP.WEBP_YUV420;

  // int width, height;         // dimensions (less or equal to WEBP_MAX_DIMENSION)
  this.width = 0;
  this.height = 0;

  // uint8_t *y, *u, *v;        // pointers to luma/chroma planes.
  this.y = null;
  this.u = null;
  this.v = null;

  // int y_stride, uv_stride;   // luma/chroma strides.
  this.yStride = 0;
  this.uvStride = 0;

  // uint8_t* a;                // pointer to the alpha plane
  this.a = null;

  // int a_stride;              // stride of the alpha plane
  this.aStride = 0;

  // ARGB input (mostly used for input to lossless compression)
  // uint32_t* argb;            // Pointer to argb (32 bit) plane.
  this.argb = null;

  // int argb_stride;           // This is stride in pixels units, not bytes.
  this.argbStride = 0;

  //   OUTPUT
  ///////////////

  // Byte-emission hook, to store compressed bytes as they are ready.
  // WebPWriterFunction writer;  // can be NULL
  this.writer = null;

  // PRIVATE FIELDS
  ////////////////////
  // void* memory_;          // row chunk of memory for yuva planes
};

webp.picture.HALVE = function(x) {
  return parseInt(((x) + 1) >> 1, 10);
};

//------------------------------------------------------------------------------
// WebPPicture
//------------------------------------------------------------------------------

/**
 * @param {webp.picture.WebPPicture} picture
 * @return {boolean}
 */
webp.picture.WebPPictureAlloc = function(picture) {
  var uvCsp = picture.colorspace & vp8.types.WebPEncCSP.WEBP_CSP_UV_MASK;
  var width = picture.width;
  var height = picture.height;

  var yStride = width;
  var uvWidth = webp.picture.HALVE(width);
  var uvHeight = webp.picture.HALVE(height);
  var uvStride = uvWidth;

  // U/V
  if (uvCsp != vp8.types.WebPEncCSP.WEBP_YUV420) {
    return false;
  }

  var ySize = yStride * height;  // uint64_t
  var uvSize = uvStride * uvHeight;  // uint64_t

  var totalSize = ySize + 2 * uvSize;

  // Security and validation checks
  if (width <= 0 || height <= 0 ||         // luma/alpha param error
      uvWidth < 0 || uvHeight < 0) {     // u/v param error
    return false;
  }
  // Clear previous buffer and allocate a new one.
  webp.picture.WebPPictureFree(picture);   // erase previous buffer

  // From now on, we're in the clear, we can no longer fail...
  picture.yStride  = yStride;
  picture.uvStride = uvStride;
  // TODO(skal): we could align the y/u/v planes and adjust stride.
  picture.y = new Uint8Array(ySize);
  picture.u = new Uint8Array(uvSize);
  picture.v = new Uint8Array(uvSize);
  return true;
};

// Should always be called, to initialize the structure. Returns false in case
// of version mismatch. WebPPictureInit() must have succeeded before using the
// 'picture' object.
// Note that, by default, use_argb is false and colorspace is WEBP_YUV420.
/**
 * @param {webp.picture.WebPPicture} picture
 * @return {boolean}
 */
webp.picture.WebPPictureInit = function(picture) {
  return webp.picture.WebPPictureInitInternal(picture,
      constants.WEBP_ENCODER_ABI_VERSION);
};

/**
 * @param {webp.picture.WebPPicture} picture
 * @param {number} version
 * @return {boolean}
 */
webp.picture.WebPPictureInitInternal = function(picture, version) {
  if (vp8.utils.WEBP_ABI_IS_INCOMPATIBLE(
      version, constants.WEBP_ENCODER_ABI_VERSION)) {
    return false;   // caller/system version mismatch!
  }
  return true;
};

// Release memory owned by 'picture' (both YUV and ARGB buffers).
/** @param {webp.picture.WebPPicture} picture */
webp.picture.WebPPictureFree = function(picture) {
  if (picture) {
    picture.y = null;
    picture.u = null;
    picture.v = null;
    picture.a = null;
    picture.yStride = 0;
    picture.uvStride = 0;
  }
};

/**
 * @param {webp.picture.WebPPicture} picture
 * @param {Uint8Array} rgba
 * @param {number} rgbStride
 * @return {boolean}
 */
webp.picture.WebPPictureImportRGBA = function(picture, rgba, rgbStride) {
  return webp.picture.Import(picture, rgba, rgbStride, 4);
};

/**
 * @param {webp.picture.WebPPicture} picture
 * @param {Uint8Array} rgb
 * @param {number} rgbStride
 * @param {number} step
 * @return {boolean}
 */
webp.picture.Import = function(picture, rgb, rgbStride, step) {
  var rBuf = rgb.subarray(0);  // uint8_t*
  var gBuf = rgb.subarray(1);  // uint8_t*
  var bBuf = rgb.subarray(2);  // uint8_t*
  var width = picture.width;
  var height = picture.height;

  return webp.picture.ImportYUVAFromRGBA(rBuf, gBuf, bBuf, step, rgbStride, picture);
};

/**
 * @param {Uint8Array} rBuf
 * @param {Uint8Array} gBuf
 * @param {Uint8Array} bBuf
 * @param {number} step bytes per pixel
 * @param {number} rgbStride bytes per scanline
 * @param {webp.picture.WebPPicture} picture
 * @return {boolean}
 */
webp.picture.ImportYUVAFromRGBA = function(rBuf, gBuf, bBuf, step, rgbStride, picture) {
  var uvCsp = picture.colorspace & vp8.types.WebPEncCSP.WEBP_CSP_UV_MASK;
  var width = picture.width;
  var height = picture.height;

  picture.colorspace = uvCsp;
  if (!webp.picture.WebPPictureAlloc(picture)) {
    return false;
  }

  // Import luma plane
  for (var y = 0; y < height; ++y) {
    for (var x = 0; x < width; ++x) {
      var offset = step * x + y * rgbStride;
      picture.y[x + y * picture.yStride] = vp8.utils.VP8RGBToY(
          rBuf[offset], gBuf[offset], bBuf[offset]);
    }
  }

  function SUM4(arr, off) {
    return arr[off] + arr[off + step] + arr[off + rgbStride] +
        arr[off + rgbStride + step];
  }
  function SUM2H(arr, off) {
    return 2 * arr[off] + 2 * arr[off + step];
  }
  function SUM2V(arr, off) {
    return 2 * arr[off] + 2 * arr[off + rgbStride];
  }
  function SUM1(arr, off) {
    return 4 * arr[off];
  }
  function RGB_TO_UV(x, y, sumFn) {
    var src = (2 * (step * x + y * rgbStride));
    var dst = x + y * picture.uvStride;
    var r = sumFn(rBuf, src);
    var g = sumFn(gBuf, src);
    var b = sumFn(bBuf, src);
    picture.u[dst] = vp8.utils.VP8RGBToU(r, g, b);
    picture.v[dst] = vp8.utils.VP8RGBToV(r, g, b);
  }

  // Downsample U/V plane
  for (var y = 0; y < (height >> 1); ++y) {
    for (var x = 0; x < (width >> 1); ++x) {
      RGB_TO_UV(x, y, SUM4);
    }
    if (width & 1) {
      RGB_TO_UV(x, y, SUM2V);
    }
  }
  if (height & 1) {
    for (var x = 0; x < (width >> 1); ++x) {
      RGB_TO_UV(x, y, SUM2H);
    }
    if (width & 1) {
      RGB_TO_UV(x, y, SUM1);
    }
  }

  if (debug.isEnabled()) {
    debug.log("ImportYUVAFromRGBA width", picture.width,
              "height", picture.height,
              "y", debug.checksumArray("y", 0, picture.y),
              "u", debug.checksumArray("u", 0, picture.u),
              "v", debug.checksumArray("v", 0, picture.v))
  }

  return true;
};

});
