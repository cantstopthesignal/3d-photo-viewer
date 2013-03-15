// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.util');

goog.require('goog.array');
goog.require('goog.asserts');


/**
 * @param {string} str
 * @return {!Array.<number>}
 */
pics3.parser.util.strToCodeArray = function(str) {
  var array = [];
  for (var i = 0; i < str.length; i++) {
    array.push(str.charCodeAt(i));
  }
  return array;
};


/**
 * @param {!Array.<number>} codeArray
 * @return {string}
 */
pics3.parser.util.codeArrayToStr = function(codeArray) {
  var array = [];
  for (var i = 0; i < codeArray.length; i++) {
    array.push(String.fromCharCode(codeArray[i]));
  }
  return array.join('');
};
