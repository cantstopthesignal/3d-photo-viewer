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
      this.getEntryForInitialSelection_(opt_selectedType));
};
goog.inherits(pics3.ThreeDDisplayChooser, pics3.Component);

/** @enum {string} */
pics3.ThreeDDisplayChooser.EventType = {
  CHANGED: goog.events.getUniqueId('changed')
};

pics3.ThreeDDisplayChooser.SELECTED_TYPE_KEY =
    'pics3.ThreeDDisplayChooser.SELECTED_TYPE';

/** @type {Element} */
pics3.ThreeDDisplayChooser.prototype.underlay1El_;

/** @type {Element} */
pics3.ThreeDDisplayChooser.prototype.selectionEl_;

/** @type {Element} */
pics3.ThreeDDisplayChooser.prototype.dropdownEl_;

pics3.ThreeDDisplayChooser.prototype.createDom = function() {
  goog.base(this, 'createDom');
  goog.dom.classes.add(this.el, 'threed-display-chooser');

  this.underlay1El_ = document.createElement('div');
  goog.dom.classes.add(this.underlay1El_, 'underlay1');
  this.el.appendChild(this.underlay1El_);
  var underlay2El = document.createElement('div');
  goog.dom.classes.add(underlay2El, 'underlay2');
  this.el.appendChild(underlay2El);

  var dropdownArrowEl = document.createElement('div');
  goog.dom.classes.add(dropdownArrowEl, 'dropdown-arrow');
  dropdownArrowEl.appendChild(document.createElement('div'));
  this.el.appendChild(dropdownArrowEl);

  this.selectionEl_ = document.createElement('div');
  goog.dom.classes.add(this.selectionEl_, 'selection');
  this.el.appendChild(this.selectionEl_);

  this.dropdownEl_ = document.createElement('div');
  goog.dom.classes.add(this.dropdownEl_, 'dropdown');
  goog.style.showElement(this.dropdownEl_, false);
  this.el.appendChild(this.dropdownEl_);

  goog.array.forEach(this.entries_, function(entry) {
    entry.render(this.dropdownEl_);
    this.eventHandler.listen(entry.el, goog.events.EventType.CLICK,
        goog.partial(this.handleEntryClick_, entry));
  }, this);

  this.updateSelection_();

  this.eventHandler.
      listen(this.el, goog.events.EventType.MOUSEOVER, this.handleMouseOver_).
      listen(this.el, goog.events.EventType.MOUSEOUT, this.handleMouseOut_);
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
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_ANAGLYPH, 'Anaglyph',
      '/images/anaglyph.svg'));
  this.entries_.push(new pics3.ThreeDDisplayChooser.Entry_(
      pics3.display.Type.THREE_D_NVIDIA, 'Nvidia 3D Vision',
      '/images/nvidia.svg'));
};

/** @return {boolean} Whether the display type was changed */
pics3.ThreeDDisplayChooser.prototype.updateToMatchUserPreference = function() {
  var prefType = window.localStorage[
      pics3.ThreeDDisplayChooser.SELECTED_TYPE_KEY];
  var entry = this.getEntry_(prefType);
  if (entry && entry != this.selectedEntry_) {
    this.selectedEntry_ = entry;
    this.updateSelection_();
    return true;
  }
  return false;
};

/** @return {!pics3.ThreeDDisplayChooser.Entry_} */
pics3.ThreeDDisplayChooser.prototype.getEntryForInitialSelection_ = function(
    opt_selectedType) {
  var entry = this.getEntry_(opt_selectedType);
  if (!entry) {
    var prefType = window.localStorage[
        pics3.ThreeDDisplayChooser.SELECTED_TYPE_KEY];
    entry = this.getEntry_(prefType);
  }
  if (!entry) {
    entry = goog.asserts.assertObject(
        this.getEntry_(pics3.display.Type.THREE_D_CROSS));
  }
  return entry;
};

pics3.ThreeDDisplayChooser.prototype.handleEntryClick_ = function(entry) {
  this.selectedEntry_ = entry;
  window.localStorage[pics3.ThreeDDisplayChooser.SELECTED_TYPE_KEY] =
      this.selectedEntry_.type;
  this.updateSelection_();
  this.dispatchEvent(pics3.ThreeDDisplayChooser.EventType.CHANGED);
};

/** @param {goog.events.BrowserEvent} e */
pics3.ThreeDDisplayChooser.prototype.handleMouseOver_ = function(e) {
  if (e.relatedTarget && goog.dom.contains(this.el, e.relatedTarget)) {
    return;
  }
  goog.style.showElement(this.underlay1El_, false);
  goog.style.showElement(this.dropdownEl_, true);
  goog.style.showElement(this.selectionEl_, false);
};

/** @param {goog.events.BrowserEvent} e */
pics3.ThreeDDisplayChooser.prototype.handleMouseOut_ = function(e) {
  if (e.relatedTarget && goog.dom.contains(this.el, e.relatedTarget)) {
    return;
  }
  goog.style.showElement(this.underlay1El_, true);
  goog.style.showElement(this.selectionEl_, true);
  goog.style.showElement(this.dropdownEl_, false);
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

pics3.ThreeDDisplayChooser.prototype.updateSelection_ = function() {
  var oldEntryEls = this.selectionEl_.getElementsByClassName('entry');
  goog.array.forEach(oldEntryEls, function(oldEntryEl) {
    goog.dom.removeNode(oldEntryEl);
  });
  goog.array.forEach(this.entries_, function(entry) {
    goog.dom.classes.remove(entry.el, 'selected');
  });
  if (this.selectedEntry_) {
    goog.dom.classes.add(this.selectedEntry_.el, 'selected');
    var clonedEntryEl = this.selectedEntry_.el.cloneNode(true);
    this.selectionEl_.insertBefore(clonedEntryEl,
        this.selectionEl_.firstChild);
  }
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
  this.el.title = this.name;

  var overlayEl = document.createElement('div');
  goog.dom.classes.add(overlayEl, 'overlay');
  overlayEl.style.backgroundImage = 'url(' + this.imageUrl + ')';
  this.el.appendChild(overlayEl);
};
