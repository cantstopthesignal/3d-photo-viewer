// Copyright cantstopthesignals@gmail.com
// Adapted from:
/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

goog.provide('pics3.parser.base64');

goog.require('goog.asserts');
goog.require('goog.debug.Logger');


/**
 * @param {string} input Base64 encoded input.
 * @return {!Uint8Array} the result.
 */
pics3.parser.base64.toUint8Array = function(input) {
  var base64 = pics3.parser.base64;

  var startTime = goog.now();

  // Get last chars to see if are valid and skip padding chars
  var endKey1 = base64.keyStr_.indexOf(input.charAt(input.length - 1));
  var endKey2 = base64.keyStr_.indexOf(input.charAt(input.length - 2));
  var byteLength = (input.length / 4) * 3;
  if (endKey1 == 64) {
    byteLength--;
  }
  if (endKey2 == 64) {
    byteLength--;
  }
  var buffer = new Uint8Array(byteLength);

  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

  var j = 0;
  for (var i = 0; i < byteLength; i += 3) {
    // Get the 3 octects in 4 ascii chars
    var enc1 = base64.keyStr_.indexOf(input.charAt(j++));
    var enc2 = base64.keyStr_.indexOf(input.charAt(j++));
    var enc3 = base64.keyStr_.indexOf(input.charAt(j++));
    var enc4 = base64.keyStr_.indexOf(input.charAt(j++));

    var chr1 = (enc1 << 2) | (enc2 >> 4);
    var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    var chr3 = ((enc3 & 3) << 6) | enc4;

    buffer[i] = chr1;
    if (enc3 != 64) buffer[i+1] = chr2;
    if (enc4 != 64) buffer[i+2] = chr3;
  }
  pics3.parser.base64.logger_.info('parse time ' + (
      goog.now() - startTime) + 'ms');
  return buffer;
};

/**
 * @param {!Uint8Array} input byte array.
 * @return {string} Base64 encoded output.
 */
pics3.parser.base64.fromUint8Array = function(input) {
  var base64 = pics3.parser.base64;

  var startTime = goog.now();
  var output = "";
  var i = 0;
  while (i < input.byteLength) {
    var chr1 = input[i++];
    var chr2 = input[i++];
    var chr3 = input[i++];

    var enc1 = chr1 >> 2;
    var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    var enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output += base64.keyStr_.charAt(enc1) + base64.keyStr_.charAt(enc2) +
        base64.keyStr_.charAt(enc3) + base64.keyStr_.charAt(enc4);
  }
  pics3.parser.base64.logger_.info('generate time ' + (
      goog.now() - startTime) + 'ms');
  return output;
};

/** @type {!goog.debug.Logger} */
pics3.parser.base64.logger_ = goog.debug.Logger.getLogger(
    'pics3.parser.base64');

/** @type {string} */
pics3.parser.base64.keyStr_ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
    "abcdefghijklmnopqrstuvwxyz0123456789+/=";
