// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveApi');

goog.require('pics3.Service');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');


/**
 * @constructor
 * @param {!pics3.GoogleClient} googleClient
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.GoogleDriveApi = function(googleClient) {
  goog.base(this);

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = googleClient;
};
goog.inherits(pics3.GoogleDriveApi, goog.events.EventTarget);

pics3.GoogleDriveApi.SERVICE_ID = 's' + goog.getUid(pics3.GoogleDriveApi);

/**
 * @param {!pics3.AppContext} appContext
 * @return {!pics3.GoogleDriveApi}
 */
pics3.GoogleDriveApi.get = function(appContext) {
  return /** @type {!pics3.GoogleDriveApi} */ (goog.asserts.assertObject(
      appContext.get(pics3.GoogleDriveApi.SERVICE_ID)));
};

/** @type {goog.debug.Logger} */
pics3.GoogleDriveApi.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.GoogleDriveApi');

/** @param {!pics3.AppContext} appContext */
pics3.GoogleDriveApi.prototype.register = function(appContext) {
  appContext.register(pics3.GoogleDriveApi.SERVICE_ID, this);
};

/**
 * @param {string} fileId
 * @return {goog.async.Deferred}
 */
pics3.GoogleDriveApi.prototype.loadFile = function(fileId) {
  var params = {
    'fileId': fileId
  };
  var callback = function(resp) {
    goog.asserts.assert(resp['kind'] == 'drive#file');
    var downloadUrl = resp['result']['downloadUrl'];
    goog.asserts.assert(downloadUrl && downloadUrl.length);
    this.logger_.info('File metadata loaded: ' + resp['result']['title'] +
        ', ' + parseInt(resp['fileSize'], 10) + ' bytes');

    var oAuthToken = this.googleClient_.getOAuthToken();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', downloadUrl);
    xhr.setRequestHeader('Authorization', 'Bearer ' + oAuthToken);
    xhr.responseType = 'arraybuffer';

    var downloadDeferred = new goog.async.Deferred();
    var eventHandler = new goog.events.EventHandler(this);
    function handleLoad() {
      goog.asserts.assert(xhr.response instanceof ArrayBuffer);
      this.logger_.info('File loaded');
      downloadDeferred.callback(new pics3.GoogleDriveApi.LoadFileResult(
          resp, xhr.response));
      goog.dispose(eventHandler);
    }
    function handleError(e) {
      downloadDeferred.errback(e);
      goog.dispose(eventHandler);
    }
    eventHandler.
        listen(xhr, goog.events.EventType.LOAD, handleLoad).
        listen(xhr, goog.events.EventType.ERROR, handleError);
    xhr.send();
    return downloadDeferred;
  };
  var errback = function(error) {
    this.logger_.severe('Error loading file: ' + error, error);
  };
  return this.callApi_('drive.files.get', 'v2', params).
      addCallbacks(callback, errback, this);
};

/**
 * @param {string} name
 * @param {string} version
 * @param {Object} params
 * @param {boolean=} opt_expectEmptyResponse
 */
pics3.GoogleDriveApi.prototype.callApi_ = function(name, version, params,
    opt_expectEmptyResponse) {
  var d = new goog.async.Deferred();
  this.logger_.info(name);
  var retryOnAuthFailure = true;
  var doRequest = goog.bind(function() {
    var request = goog.getObjectByName('gapi.client.rpcRequest')(
        name, version, params);
    request['execute'](goog.bind(function(resp) {
      if (!resp) {
        if (opt_expectEmptyResponse) {
          d.callback(null);
        } else {
          d.errback('Empty response');
        }
      } else if (resp['error']) {
        var error = resp ? resp['error'] : null;
        if (error && error['code'] == 401) {
          // Authorization failure.
          if (!retryOnAuthFailure) {
            d.errback('Authorization failed');
            return;
          }
          retryOnAuthFailure = false;
          this.googleClient_.restart();
          this.googleClient_.setAuthRequired(true);
          this.googleClient_.getAuthDeferred().branch().addCallbacks(doRequest,
              goog.bind(d.errback, d));
        } else {
          d.errback('Request error: ' + goog.json.serialize(error));
        }
      } else {
        d.callback(resp);
      }
    }, this));
  }, this);
  doRequest();
  return d;
};

/**
 * @param {!Object} result
 * @param {!ArrayBuffer} buffer
 * @constructor
 */
pics3.GoogleDriveApi.LoadFileResult = function(result, buffer) {
  /** @type {Object} */
  this.result = result;

  /** @type {!ArrayBuffer} */
  this.buffer = buffer;
};