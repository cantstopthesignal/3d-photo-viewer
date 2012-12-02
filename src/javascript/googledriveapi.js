// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveApi');

goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.Service');


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

/** @return {goog.async.Deferred} */
pics3.GoogleDriveApi.prototype.loadAsync = function() {
  return this.googleClient_.loadAsync();
};

/** @return {!pics3.GoogleClient} */
pics3.GoogleDriveApi.prototype.getGoogleClient = function() {
  return this.googleClient_;
};

/**
 * @param {string} fileId
 * @return {!pics3.GoogleDriveApi.LoadFile}
 */
pics3.GoogleDriveApi.prototype.newLoadFile = function(fileId) {
  return new pics3.GoogleDriveApi.LoadFile(this, fileId);
}

/**
 * @param {!Array.<string>} fileIds
 * @return {!pics3.GoogleDriveApi.LoadFiles}
 */
pics3.GoogleDriveApi.prototype.newLoadFiles = function(fileIds) {
  return new pics3.GoogleDriveApi.LoadFiles(this, fileIds);
};

/**
 * @param {string} fileId
 * @return {goog.async.Deferred} producing {Object}
 */
pics3.GoogleDriveApi.prototype.loadFileMetadata = function(fileId) {
  var params = {
    'fileId': fileId
  };
  var callback = function(resp) {
    goog.asserts.assert(resp['kind'] == 'drive#file');
    this.logger_.info('File metadata loaded: ' + resp['result']['title'] +
        ', ' + parseInt(resp['fileSize'], 10) + ' bytes');
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
 * @param {!pics3.GoogleDriveApi} api
 * @param {Array.<string>} ids
 * @constructor
 */
pics3.GoogleDriveApi.LoadFiles = function(api, ids) {
  /** @type {!pics3.GoogleDriveApi} */
  this.api_ = api;

  /** @type {!Array.<pics3.GoogleDriveApi.LoadFile>} */
  this.array_ = goog.array.map(ids, function(id) {
    return new pics3.GoogleDriveApi.LoadFile(this.api_, id);
  }, this);
};

/** @return {!Array.<pics3.GoogleDriveApi.LoadFile>} */
pics3.GoogleDriveApi.LoadFiles.prototype.getArray = function() {
  return this.array_;
};

/**
 * @param {boolean} loadMetadata
 * @return {!pics3.GoogleDriveApi.LoadFiles}
 */
pics3.GoogleDriveApi.LoadFiles.prototype.setLoadMetadata = function(
    loadMetadata) {
  goog.array.forEach(this.array_, function(loadFile) {
    loadFile.setLoadMetadata(loadMetadata);
  });
  return this;
};

/** @return {!goog.async.Deferred} */
pics3.GoogleDriveApi.LoadFiles.prototype.load = function() {
  var deferreds = goog.array.map(this.array_, function(loadFile) {
    return loadFile.load();
  });
  return new goog.async.DeferredList(deferreds, false, true).addBoth(
      function(responses) {
        var error;
        goog.array.some(responses, function(resp) {
          if (!resp[0]) {
            error = resp[1];
            return true;
          }
        });
        return error || this;
      }, this);
};

/**
 * @param {!pics3.GoogleDriveApi} api
 * @param {string} id
 * @constructor
 */
pics3.GoogleDriveApi.LoadFile = function(api, id) {
  /** @type {!pics3.GoogleDriveApi} */
  this.api_ = api;

  /** @type {string} */
  this.id = id;
};

/** @type {goog.debug.Logger} */
pics3.GoogleDriveApi.LoadFile.prototype.logger_ = goog.debug.Logger.getLogger(
    'pics3.GoogleDriveApi.LoadFile');

/** @type {boolean} */
pics3.GoogleDriveApi.LoadFile.prototype.loadMetadata_ = false;

/** @type {boolean} */
pics3.GoogleDriveApi.LoadFile.prototype.loadData_ = false;

/** @type {string} */
pics3.GoogleDriveApi.LoadFile.prototype.downloadUrl_;

/** @type {Object} */
pics3.GoogleDriveApi.LoadFile.prototype.metadata_;

/** @type {ArrayBuffer} */
pics3.GoogleDriveApi.LoadFile.prototype.dataBuffer_;

/**
 * @param {boolean} loadMetadata
 * @return {!pics3.GoogleDriveApi.LoadFile}
 */
pics3.GoogleDriveApi.LoadFile.prototype.setLoadMetadata = function(
    loadMetadata) {
  this.loadMetadata_ = loadMetadata;
  return this;
};

/**
 * @param {boolean} loadData
 * @return {!pics3.GoogleDriveApi.LoadFile}
 */
pics3.GoogleDriveApi.LoadFile.prototype.setLoadData = function(loadData) {
  this.loadData_ = loadData;
  return this;
};

/**
 * @param {string} downloadUrl
 * @return {!pics3.GoogleDriveApi.LoadFile}
 */
pics3.GoogleDriveApi.LoadFile.prototype.setDownloadUrl = function(downloadUrl) {
  this.downloadUrl_ = downloadUrl;
  return this;
};

/** @return {!goog.async.Deferred} */
pics3.GoogleDriveApi.LoadFile.prototype.load = function() {
  if (this.loadMetadata_ || (this.loadData_ && !this.downloadUrl_)) {
    return this.api_.loadFileMetadata(this.id).addCallback(function(metadata) {
          this.metadata_ = metadata;
          this.downloadUrl_ = metadata['downloadUrl'];
          if (this.loadData_) {
            return this.doLoadData_();
          }
          return this;
        }, this);
  } else if (this.loadData_) {
    return this.doLoadData_().addCallback(function() {
          return this;
        }, this);
  }
  return goog.async.Deferred.succeed(this);
};

/** @return {!goog.async.Deferred} */
pics3.GoogleDriveApi.LoadFile.prototype.doLoadData_ = function() {
  goog.asserts.assert(this.downloadUrl_ && this.downloadUrl_.length);

  var oAuthToken = this.api_.getGoogleClient().getOAuthToken();
  var xhr = new XMLHttpRequest();
  xhr.open('GET', this.downloadUrl_);
  xhr.setRequestHeader('Authorization', 'Bearer ' + oAuthToken);
  xhr.responseType = 'arraybuffer';

  var deferred = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    goog.asserts.assert(xhr.response instanceof ArrayBuffer);
    this.logger_.info('File data loaded');
    this.dataBuffer_ = xhr.response;
    deferred.callback(this);
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    deferred.errback(e);
    goog.dispose(eventHandler);
  }
  function handleProgress(e) {
    var browserEvent = e.getBrowserEvent();
    window.console.log(browserEvent.loaded, browserEvent.lengthComputable,
        browserEvent.total);
  }
  eventHandler.
      listen(xhr, goog.events.EventType.LOAD, handleLoad).
      listen(xhr, 'progress', handleProgress).
      listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return deferred;
};

/** @return {Object} */
pics3.GoogleDriveApi.LoadFile.prototype.getMetadata = function() {
  return this.metadata_;
};

/** @return {ArrayBuffer} */
pics3.GoogleDriveApi.LoadFile.prototype.getDataBuffer = function() {
  return this.dataBuffer_;
};
