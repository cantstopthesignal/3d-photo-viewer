// Copyright cantstopthesignals@gmail.com
// Some code Copyright (c) 2010, Google Inc. All rights reserved.
/**
 * @license Portions of this code are from the Google libwebp implementation,
 * which is provided with a BSD license.  See COPYING.
 */

goog.provide('webp.Config');

goog.require('webp.vp8.Constants');

var WebPConfig;

goog.scope(function() {

/** @constructor */
WebPConfig = function() {
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
 * @param {WebPConfig} config
 * @return {boolean}
 */
WebPConfigInit = function(config) {
  return WebPConfigInitInternal(config, WEBP_ENCODER_ABI_VERSION);
};

/**
 * @param {WebPConfig} config
 * @param {number} version
 * @return {boolean}
 */
WebPConfigInitInternal = function(config, version) {
  if (WEBP_ABI_IS_INCOMPATIBLE(version, WEBP_ENCODER_ABI_VERSION)) {
    return false;   // caller/system version mismatch!
  }
  if (!config) {
    return false;
  }

  config.quality = 0.75;
  config.snsStrength = 50;
  config.segments = 4;

  return WebPValidateConfig(config);
};

/**
 * @param {WebPConfig} config
 * @return {boolean}
 */
WebPValidateConfig = function(config) {
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