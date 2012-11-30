// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleClient');

goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('pics3.Dialog');


/**
 * Handle authorization.
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.GoogleClient = function() {
  goog.base(this);

  /** @type {goog.async.Deferred} */
  this.loadDeferred_ = new goog.async.Deferred();

  /** @type {goog.async.Deferred} */
  this.authDeferred_ = new goog.async.Deferred();
};
goog.inherits(pics3.GoogleClient, goog.events.EventTarget);

pics3.GoogleClient.SERVICE_ID = 's' + goog.getUid(pics3.GoogleClient);

pics3.GoogleClient.GAPI_API_KEY = 'AIzaSyA7jCmXxuW-fZk1_OZGJ2HRwVY2z1vGDhQ';
pics3.GoogleClient.GAPI_CLIENT_ID = '416949524888.apps.googleusercontent.com';
pics3.GoogleClient.GAPI_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.install'
    ];

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.GoogleClient}
 */
pics3.GoogleClient.get = function(appContext) {
  return /** @type {!pics3.GoogleClient} */ (goog.asserts.assertObject(
      appContext.get(pics3.GoogleClient.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.GoogleClient.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.GoogleClient');

/** @type {boolean} */
pics3.GoogleClient.prototype.loadStarted_ = false;

/** @type {boolean} */
pics3.GoogleClient.prototype.authRequired_ = false;

/** @type {pics3.GoogleClient.ConnectDialog_} */
pics3.GoogleClient.prototype.connectDialog_;

/** @type {number} */
pics3.GoogleClient.prototype.authRefreshTimeoutId_;

/** @param {!pics3.AppContext} appContext */
pics3.GoogleClient.prototype.register = function(appContext) {
  appContext.register(pics3.GoogleClient.SERVICE_ID, this);
};

/**
 * Restart auth in the case where an api has detected an authorization failure.
 */
pics3.GoogleClient.prototype.restart = function() {
  if (!this.authDeferred_.hasFired()) {
    // Re-auth already in progress.
    return;
  }
  this.authDeferred_ = new goog.async.Deferred();
  this.checkAuth_();
  goog.asserts.assert(!this.authDeferred_.hasFired());
};

/** @param {boolean} authRequired */
pics3.GoogleClient.prototype.setAuthRequired = function(authRequired) {
  goog.asserts.assert(authRequired);
  if (!this.authRequired_) {
    this.authRequired_ = true;
    if (this.loadDeferred_.hasFired() && !this.isAuthorized_()) {
      this.checkAuth_();
    }
  }
};

/** @return {goog.async.Deferred} */
pics3.GoogleClient.prototype.getAuthDeferred = function() {
  return this.authDeferred_;
};

/** @return {goog.async.Deferred} */
pics3.GoogleClient.prototype.loadAsync = function() {
  if (!this.loadStarted_) {
    this.loadStarted_ = true;
    this.loadGapiJavascriptClientAndAuth_();
    if (goog.DEBUG) {
      goog.exportSymbol('pics3.auth.invalidateToken',
          goog.bind(this.invalidateToken_, this));
    }
  }
  return this.loadDeferred_;
};

/** @override */
pics3.GoogleClient.prototype.disposeInternal = function() {
  this.clearAuthRefreshTimer_();
  goog.base(this, 'disposeInternal');
}

pics3.GoogleClient.prototype.getOAuthToken = function() {
  var token = goog.getObjectByName('gapi.auth.getToken')();
  return token ? token['access_token'] || null : null;
};

pics3.GoogleClient.prototype.loadGapiJavascriptClientAndAuth_ = function() {
  if (goog.getObjectByName('gapi.client') &&
      goog.getObjectByName('gapi.auth')) {
    this.logger_.info('loadGapiJavascriptClientAndAuth_ already present');
    this.handleGapiClientLoad_();
    return;
  }
  var callbackName = 'callback_' + goog.getUid(this);
  goog.exportSymbol(callbackName,
      goog.bind(this.handleGapiClientLoad_, this));
  var scriptEl = document.createElement("script");
  scriptEl.async = true;
  scriptEl.type = "text/javascript";
  scriptEl.src = "https://apis.google.com/js/client.js?onload=" +
      encodeURIComponent(callbackName);
  document.body.appendChild(scriptEl);
};

pics3.GoogleClient.prototype.handleGapiClientLoad_ = function() {
  this.logger_.info('handleGapiClientLoad_');
  goog.getObjectByName('gapi.client.setApiKey')(
      pics3.GoogleClient.GAPI_API_KEY);
  goog.getObjectByName('gapi.auth.init')(
      goog.bind(this.handleGapiAuthInit_, this));
};

pics3.GoogleClient.prototype.handleGapiAuthInit_ = function() {
  this.logger_.info('handleGapiAuthInit_');
  window.setTimeout(goog.bind(this.checkAuth_, this), 1);
};

pics3.GoogleClient.prototype.checkAuth_ = function() {
  this.logger_.info('checkAuth_');
  goog.getObjectByName('gapi.auth.authorize')({
    'client_id': pics3.GoogleClient.GAPI_CLIENT_ID,
    'scope': pics3.GoogleClient.GAPI_SCOPES,
    'immediate': true
  }, goog.bind(this.handleAuthResult_, this));
};

pics3.GoogleClient.prototype.fullAuth_ = function() {
  this.logger_.info('fullAuth_');
  if (!this.connectDialog_) {
    this.connectDialog_ = new pics3.GoogleClient.ConnectDialog_(
        goog.bind(this.handleAuthResult_, this));
    this.registerDisposable(this.connectDialog_);
  }
  this.connectDialog_.show();
};

pics3.GoogleClient.prototype.handleAuthResult_ = function(authResult) {
  if (authResult) {
    this.logger_.info('handleAuthResult_: authorized');
    this.setAuthRefreshTimer_(parseInt(authResult['expires_in'], 10));
  } else {
    this.logger_.info('handleAuthResult_: no result');
  }
  if (!this.loadDeferred_.hasFired()) {
    this.loadDeferred_.callback(null);
  }
  if (this.authDeferred_.hasFired()) {
    return;
  }
  if (!authResult) {
    if (this.authRequired_) {
      // An empty auth result can happen if the user previously authorized
      // this service but then de-authorized.  Go immediately to full auth
      // in this case.
      this.fullAuth_();
    }
    return;
  }
  if (this.connectDialog_) {
    this.connectDialog_.hide();
  }
  this.authDeferred_.callback(null);
};

pics3.GoogleClient.prototype.clearAuthRefreshTimer_ = function() {
  if (this.authRefreshTimeoutId_) {
    window.clearTimeout(this.authRefreshTimeoutId_);
    delete this.authRefreshTimeoutId_;
  }
};

pics3.GoogleClient.prototype.setAuthRefreshTimer_ = function(expireTimeSecs) {
  goog.asserts.assert(goog.math.isFiniteNumber(expireTimeSecs));
  this.clearAuthRefreshTimer_();
  var refreshDelaySecs = Math.max(5 * 60, expireTimeSecs - 5 * 60);
  this.authRefreshTimeoutId_ = window.setTimeout(
      goog.bind(this.checkAuth_, this), refreshDelaySecs * 1000);
};

pics3.GoogleClient.prototype.isAuthorized_ = function() {
  var token = goog.getObjectByName('gapi.auth.getToken')();
  return token && 'access_token' in token;
};

pics3.GoogleClient.prototype.invalidateToken_ = function() {
  this.logger_.info('invalidateToken_');
  var token = goog.getObjectByName('gapi.auth.getToken')();
  var accessToken = goog.asserts.assertString(token['access_token']);
  token['access_token'] = 'invalid';
  goog.getObjectByName('gapi.auth.setToken')(token);
};

/**
 * @constructor
 * @extends {pics3.Dialog}
 */
pics3.GoogleClient.ConnectDialog_ = function(authResultCallback) {
  goog.base(this);

  this.authResultCallback_ = authResultCallback;
};
goog.inherits(pics3.GoogleClient.ConnectDialog_, pics3.Dialog);

pics3.GoogleClient.ConnectDialog_.prototype.createDom = function() {
  goog.base(this, 'createDom');

  var headerEl = document.createElement('div');
  goog.dom.classes.add(headerEl, 'title');
  headerEl.appendChild(document.createTextNode(
      '3d picture viewer needs your authorization to access your Google ' +
      'Drive'));
  this.el.appendChild(headerEl);

  var connectButtonEl = document.createElement('div');
  goog.dom.classes.add(connectButtonEl, 'button');
  this.eventHandler.listen(connectButtonEl, goog.events.EventType.CLICK,
      this.handleConnectClick_);
  connectButtonEl.appendChild(document.createTextNode('Connect'));
  this.el.appendChild(connectButtonEl);
};

pics3.GoogleClient.ConnectDialog_.prototype.handleConnectClick_ = function() {
  goog.getObjectByName('gapi.auth.authorize')({
    'client_id': pics3.GoogleClient.GAPI_CLIENT_ID,
    'scope': pics3.GoogleClient.GAPI_SCOPES,
    'immediate': false
  }, this.authResultCallback_);
};
