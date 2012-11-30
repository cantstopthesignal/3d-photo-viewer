// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.util');

goog.require('goog.asserts');


/**
 * @param {string} name
 * @param {...*} var_args
 * @return {!Object}
 */
pics3.util.createNamedObject = function(name, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);

  var constructor = goog.getObjectByName(name);
  goog.asserts.assertObject(constructor);

  var instance = Object.create(constructor.prototype);
  constructor.apply(instance, args);
  return instance;
};
