// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.config');

goog.require('webp.vp8.constants');
goog.require('webp.vp8.utils');


goog.scope(function() {

var constants = webp.vp8.constants;
var vp8 = webp.vp8;

/** @constructor */
webp.config.WebPConfig = function() {
  // float quality;          // between 0 (smallest file) and 100 (biggest)
  this.quality = 0;

  // Parameters related to lossy compression only:
  // int segments;           // maximum number of segments to use, in [1..4]
  this.segments = 0;

  // int sns_strength;       // Spatial Noise Shaping. 0=off, 100=maximum.
  this.snsStrength = 0;
};

// Should always be called, to initialize a fresh WebPConfig structure before
// modification. Returns false in case of version mismatch. WebPConfigInit()
// must have succeeded before using the 'config' object.
// Note that the default values are lossless=0 and quality=75.
/**
 * @param {webp.config.WebPConfig} config
 * @return {boolean}
 */
webp.config.WebPConfigInit = function(config) {
  return webp.config.WebPConfigInitInternal(config,
    constants.WEBP_ENCODER_ABI_VERSION);
};

/**
 * @param {webp.config.WebPConfig} config
 * @param {number} version
 * @return {boolean}
 */
webp.config.WebPConfigInitInternal = function(config, version) {
  if (vp8.utils.WEBP_ABI_IS_INCOMPATIBLE(version,
      constants.WEBP_ENCODER_ABI_VERSION)) {
    return false;   // caller/system version mismatch!
  }
  if (!config) {
    return false;
  }

  config.quality = 0.75;
  config.snsStrength = 50;
  config.segments = 4;

  return webp.config.WebPValidateConfig(config);
};

/**
 * @param {webp.config.WebPConfig} config
 * @return {boolean}
 */
webp.config.WebPValidateConfig = function(config) {
  if (!config) {
    return false;
  }
  if (config.quality < 0 || config.quality > 100) {
    return false;
  }
  if (config.segments < 1 || config.segments > 4) {
    return false;
  }
  if (config.snsStrength < 0 || config.snsStrength > 100) {
    return false;
  }
  return true;
};

});