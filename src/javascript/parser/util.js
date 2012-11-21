// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.parser.util');

goog.require('goog.array');
goog.require('goog.asserts');


pics3.parser.util.strToCodeArray = function(str) {
  var array = [];
  for (var i = 0; i < str.length; i++) {
    array.push(str.charCodeAt(i));
  }
  return array;
};
