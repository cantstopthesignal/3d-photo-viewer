// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.history.Token');


/**
 * @constructor
 */
pics3.history.Token = function() {
};

/** @param {!goog.Uri} uri */
pics3.history.Token.prototype.addToUri = goog.abstractMethod;
