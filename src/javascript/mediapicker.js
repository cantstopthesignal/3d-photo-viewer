// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.MediaPicker');

goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Button');
goog.require('pics3.Component');


/**
 * @constructor
 * @extends {pics3.Component}
 */
pics3.MediaPicker = function() {
  goog.base(this);
};
goog.inherits(pics3.MediaPicker, pics3.Component);

/** @type {Element} */
pics3.MediaPicker.prototype.buttonEl_;

/** @type {pics3.Button} */
pics3.MediaPicker.prototype.uploadButton_;

/** @type {boolean} */
pics3.MediaPicker.prototype.expanded_ = true;

pics3.MediaPicker.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'media-picker');

  this.uploadButton_ = new pics3.Button('Upload');
  this.registerDisposable(this.uploadButton_);
  this.uploadButton_.render(this.el);

  this.buttonEl_ = document.createElement('div');
  goog.dom.classes.add(this.buttonEl_, 'media-picker-button');
  this.buttonEl_.appendChild(document.createTextNode('Select Media'));
};

pics3.MediaPicker.prototype.renderButton = function(parentEl) {
  parentEl.appendChild(this.buttonEl_);
};

/** @return {boolean} */
pics3.MediaPicker.prototype.isExpanded = function() {
  return this.expanded_;
};

/** @override */
pics3.MediaPicker.prototype.disposeInternal = function() {
  goog.dom.removeNode(this.buttonEl_);
  delete this.buttonEl_;
  goog.base(this, 'disposeInternal');
};
