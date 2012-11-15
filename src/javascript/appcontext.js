// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.AppContext');

goog.require('goog.asserts');
goog.require('goog.events.EventTarget');
goog.require('pics3.Service');


/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.AppContext = function() {
  /** @type {Object.<pics3.Service>} */
  this.serviceMap_ = {};
};
goog.inherits(pics3.AppContext, goog.events.EventTarget);

/**
 * @param {string} serviceId
 * @param {pics3.Service} service
 */
pics3.AppContext.prototype.register = function(serviceId, service) {
  goog.asserts.assert(!this.get(serviceId));
  this.serviceMap_[serviceId] = service;
  this.registerDisposable(service);
};

/**
 * @param {string} serviceId
 * @return {pics3.Service}
 */
pics3.AppContext.prototype.get = function(serviceId) {
  return this.serviceMap_[serviceId] || null;
};

/** @override */
pics3.AppContext.prototype.disposeInternal = function() {
  delete this.serviceMap_;
  goog.base(this, 'disposeInternal');
};

