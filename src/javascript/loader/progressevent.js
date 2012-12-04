// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.loader.ProgressEvent');

goog.require('goog.asserts');
goog.require('goog.events.Event');
goog.require('pics3.loader.EventType');


/**
 * @param {number} loaded
 * @param {number} total
 * @constructor
 * @extends {goog.events.Event}
 */
pics3.loader.ProgressEvent = function(loaded, total) {
  goog.base(this, pics3.loader.EventType.PROGRESS);

  /** @type {number} */
  this.loaded = loaded;

  /** @type {number} */
  this.total = total;
};
goog.inherits(pics3.loader.ProgressEvent, goog.events.Event);
