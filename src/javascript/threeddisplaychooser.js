// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.ThreeDDisplayChooser');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.dom.classes');
goog.require('goog.events.EventType');
goog.require('pics3.Component');
goog.require('pics3.display.Type');


/**
 * @param {pics3.display.Type=} opt_selectedType
 * @constructor
 * @extends {pics3.Component}
 */
pics3.ThreeDDisplayChooser = function(opt_selectedType) {
  goog.base(this);

  /** @type {!Array.<!pics3.ThreeDDisplayChooser.Entry_>} */
  this.entries_ = [];
  this.createEntries_();

  /** @type {!pics3.ThreeDDisplayChooser.Entry_} */
  this.selectedEntry_ = /** @type {!pics3.ThreeDDisplayChooser.Entry_} */ (
      goog.asserts.assertObject(this.getEntry_(
          opt_selectedType || pics3.display.Type.THREE_D_CROSS)));
};
goog.inherits(pics3.ThreeDDisplayChooser, pics3.Component);

/** @enum {string} */
pics3.ThreeDDisplayChooser.EventType = {
  CHANGED: goog.events.getUniqueId('changed')
};

pics3.ThreeDDisplayChooser.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'threed-display-chooser');

  goog.array.forEach(this.entries_, function(entry) {
    entry.render(this.el);
    this.eventHandler.listen(entry.el, goog.events.EventType.CLICK,
        goog.partial(this.handleEntryClick_, entry));
  }, this);
};

pics3.ThreeDDisplayChooser.prototype.createEntries_ = function() {
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_CROSS, 'Cross-eyed', '/images/cross-eye.svg'));
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_LEFT_IMAGE, 'Left image',
      '/images/left-image.svg'));
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_RIGHT_IMAGE, 'Right image',
      '/images/right-image.svg'));
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_WOBBLE, 'Wobble', '/images/wobble.svg'));
};

pics3.ThreeDDisplayChooser.prototype.handleEntryClick_ = function(entry) {
  this.selectedEntry_ = entry;
  this.dispatchEvent(pics3.ThreeDDisplayChooser.EventType.CHANGED);
};

/**
 * @param {!pics3.display.Type} type
 * @return {pics3.ThreeDDisplayChooser.Entry_}
 */
pics3.ThreeDDisplayChooser.prototype.getEntry_ = function(type) {
  return /** @type {pics3.ThreeDDisplayChooser.Entry_} */ (
      goog.array.find(this.entries_, function(entry) {
        return entry.type == type;
      }));
};

/** @return {!pics3.display.Type} */
pics3.ThreeDDisplayChooser.prototype.getSelectedType = function() {
  return this.selectedEntry_.type;
};

/**
 * @param {!pics3.display.Type} type
 * @param {string} name
 * @param {string} imageUrl
 * @constructor
 * @extends {pics3.Component}
 */
pics3.ThreeDDisplayChooser.Entry_ = function(type, name, imageUrl) {
  goog.base(this);

  /** @type {!pics3.display.Type} */
  this.type = type;

  /** @type {string} */
  this.name = name;

  /** @type {string} */
  this.imageUrl = imageUrl;
};
goog.inherits(pics3.ThreeDDisplayChooser.Entry_, pics3.Component);

pics3.ThreeDDisplayChooser.Entry_.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'entry');

  var overlayEl = document.createElement('div');
  goog.dom.classes.add(overlayEl, 'overlay');
  overlayEl.style.backgroundImage = 'url(' + this.imageUrl + ')';
  this.el.appendChild(overlayEl);
};
