// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.display.Type');
goog.provide('pics3.display.type');


/** @enum {string} */
pics3.display.Type = {
  THREE_D_ANAGLYPH: 'THREE_D_ANAGLYPH',
  THREE_D_CROSS: 'THREE_D_CROSS',
  THREE_D_LEFT_IMAGE: 'THREE_D_LEFT_IMAGE',
  THREE_D_NVIDIA: 'THREE_D_NVIDIA',
  THREE_D_RIGHT_IMAGE: 'THREE_D_RIGHT_IMAGE',
  THREE_D_WOBBLE: 'THREE_D_WOBBLE',
  TWO_D: 'TWO_D'
};

/** @type {!goog.structs.Set} */
pics3.display.type.THREE_D_TYPES_ = new goog.structs.Set([
    pics3.display.Type.THREE_D_ANAGLYPH,
    pics3.display.Type.THREE_D_CROSS,
    pics3.display.Type.THREE_D_LEFT_IMAGE,
    pics3.display.Type.THREE_D_NVIDIA,
    pics3.display.Type.THREE_D_RIGHT_IMAGE,
    pics3.display.Type.THREE_D_WOBBLE
    ]);

/**
 * @param {pics3.display.Type} type
 * @return {boolean}
 */
pics3.display.type.is3D = function(type) {
  return pics3.display.type.THREE_D_TYPES_.contains(type);
};
