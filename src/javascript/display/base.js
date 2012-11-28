// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.Base');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.Photo');


/**
 * @param {!pics3.Photo} photo
 * @constructor
 * @extends {pics3.Component}
 */
pics3.display.Base = function(photo) {
  goog.base(this);

  /** @type {!pics3.Photo} */
  this.photo = photo;
};
goog.inherits(pics3.display.Base, pics3.Component);

pics3.display.Base.prototype.resize = goog.abstractMethod;
