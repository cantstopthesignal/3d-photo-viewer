// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.GoogleDriveApi');

goog.require('goog.async.Deferred');
goog.require('goog.async.DeferredList');
goog.require('goog.debug.Logger');
goog.require('goog.events.EventTarget');
goog.require('goog.json');
goog.require('pics3.ErrorCode');
goog.require('pics3.ErrorMessage');
goog.require('pics3.NotificationManager');
goog.require('pics3.Service');
goog.require('pics3.loader.ProgressEvent');


/**
 * @constructor
 * @param {!pics3.AppContext} appContext
 * @extends {goog.events.EventTarget}
 * @implements {pics3.Service}
 */
pics3.GoogleDriveApi = function(appContext) {
  goog.base(this);

  /** @type {!pics3.AppContext} */
  this.appContext_ = appContext;

  /** @type {!pics3.GoogleClient} */
  this.googleClient_ = pics3.GoogleClient.get(this.appContext_);
};
goog.inherits(pics3.GoogleDriveApi, goog.events.EventTarget);

pics3.GoogleDriveApi.SERVICE_ID = 's' + goog.getUid(pics3.GoogleDriveApi);

/** @desc Message to show for unexpected google drive api issues */
pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_UNEXPECTED_ERROR = goog.getMsg(
    'Unexpected error in GoogleDrive api.');

/** @desc Message to show when a file's metadata could not load */
pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_METADATA_LOAD_ERROR = goog.getMsg(
    'Error loading file metadata.');

/** @desc Message to show when a file's data could not load */
pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_DATA_LOAD_ERROR = goog.getMsg(
    'Error loading file data.');

/** @desc Message to show when a file could not be found */
pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_NOT_FOUND_ERROR = goog.getMsg(
    'Google Drive file not found.  You may not have permission to see it.');

/** @enum {string} */
pics3.GoogleDriveApi.ErrorMessage = {
  UNEXPECTED: pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_UNEXPECTED_ERROR,
  METADATA_LOAD: pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_METADATA_LOAD_ERROR,
  DATA_LOAD: pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_DATA_LOAD_ERROR,
  FILE_NOT_FOUND: pics3.GoogleDriveApi.MSG_GOOGLE_DRIVE_FILE_NOT_FOUND_ERROR
};

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
pics3.GoogleDriveApi.prototype.loadFileMetadataInternal = function(fileId) {
  var params = {
    'fileId': fileId
  };
  var callback = function(resp) {
    goog.asserts.assert(resp['kind'] == 'drive#file');
    this.logger_.info('File metadata loaded: ' + resp['result']['title'] +
        ', ' + parseInt(resp['fileSize'], 10) + ' bytes');
  };
  return this.callApi_('drive.files.get', 'v2', params).
      addCallback(callback, this);
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
          var error = Error('Empty response');
          error.code = pics3.ErrorCode.UNEXPECTED;
          d.errback(error);
        }
      } else if (resp['error']) {
        var errorObject = resp ? resp['error'] : null;
        if (errorObject && errorObject['code'] == 401) {
          // Authorization failure.
          if (!retryOnAuthFailure) {
            d.errback('Authorization failed');
            return;
          }
          retryOnAuthFailure = false;
          this.googleClient_.restart();
          this.googleClient_.addRequiredScopes(
              pics3.GoogleClient.GOOGLE_DRIVE_SCOPES);
          this.googleClient_.getAuthDeferred().branch().addCallbacks(doRequest,
              goog.bind(d.errback, d));
        } else if (errorObject && errorObject['code'] == 404) {
          var error = Error('Not found error: ' + goog.json.serialize(
              errorObject));
          error.code = pics3.ErrorCode.NOT_FOUND;
          d.errback(error);
        } else if (errorObject && errorObject['code'] == -1 &&
            (errorObject['message'] || '').indexOf('network') >= 0) {
          var error = Error(errorObject['message']);
          error.code = pics3.ErrorCode.NETWORK;
          d.errback(error);
        } else {
          var error = Error('Request error: ' + goog.json.serialize(
              errorObject));
          error.code = pics3.ErrorCode.UNEXPECTED;
          d.errback(error);
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
 * @param {Error} error
 * @param {string=} opt_message
 */
pics3.GoogleDriveApi.prototype.reportError = function(error, opt_message) {
  if (error instanceof goog.async.Deferred.CancelledError) {
    return;
  }
  var errorMessage = opt_message;
  if (!errorMessage) {
    if (error.code == pics3.ErrorCode.NETWORK) {
      errorMessage = pics3.ErrorMessage.NETWORK;
    } else {
      errorMessage = pics3.GoogleDriveApi.ErrorMessage.UNEXPECTED;
    }
  }
  this.logger_.severe(error.toString(), error);
  var notificationManager = pics3.NotificationManager.get(this.appContext_);
  notificationManager.show(errorMessage);
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
  return new goog.async.DeferredList(deferreds, false, true).addCallback(
      function(responses) {
        goog.asserts.assert(goog.array.every(responses, function(resp) {
          return resp[0];
        }));
        return this;
      }, this);
};

/**
 * @param {!pics3.GoogleDriveApi} api
 * @param {string} id
 * @constructor
 * @extends {goog.events.EventTarget}
 */
pics3.GoogleDriveApi.LoadFile = function(api, id) {
  goog.base(this);

  /** @type {!pics3.GoogleDriveApi} */
  this.api_ = api;

  /** @type {string} */
  this.id = id;
};
goog.inherits(pics3.GoogleDriveApi.LoadFile, goog.events.EventTarget);

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
    return this.api_.loadFileMetadataInternal(this.id).addCallbacks(
        function(metadata) {
          this.metadata_ = metadata;
          this.downloadUrl_ = metadata['downloadUrl'];
          if (this.loadData_) {
            return this.doLoadData_();
          }
          return this;
        }, function(error) {
          var errorMessage;
          if (error.code == pics3.ErrorCode.NOT_FOUND) {
            errorMessage = pics3.GoogleDriveApi.ErrorMessage.FILE_NOT_FOUND;
          }
          this.api_.reportError(error, errorMessage);
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

  var xhr = new XMLHttpRequest();
  xhr.open('GET', this.downloadUrl_);
  xhr.setRequestHeader('Authorization', 'Bearer ' +
      this.api_.getGoogleClient().getOAuthToken());
  xhr.responseType = 'arraybuffer';

  var d = new goog.async.Deferred();
  var eventHandler = new goog.events.EventHandler(this);
  function handleLoad() {
    if (xhr.status == 200) {
      goog.asserts.assert(xhr.response instanceof ArrayBuffer);
      this.logger_.info('File data loaded');
      this.dataBuffer_ = xhr.response;
      d.callback(this);
    } else {
      var error = Error('Error loading file data: Xhr response error: ' +
          xhr.status + ': ' + xhr.statusText);
      var errorMessage;
      if (xhr.status == 403) {
        error.code = pics3.ErrorCode.NOT_FOUND;
        errorMessage = pics3.GoogleDriveApi.ErrorMessage.DATA_LOAD;
      } else {
        error.code = pics3.ErrorCode.UNEXPECTED;
      }
      this.api_.reportError(error, errorMessage);
      d.errback(error);
    }
    goog.dispose(eventHandler);
  }
  function handleError(e) {
    var error = Error('Error loading file data: Xhr network error');
    error.code = pics3.ErrorCode.NETWORK;
    this.api_.reportError(error);
    d.errback(error);
    goog.dispose(eventHandler);
  }
  function handleProgress(e) {
    var browserEvent = e.getBrowserEvent();
    if (browserEvent.lengthComputable) {
      this.dispatchEvent(new pics3.loader.ProgressEvent(
          browserEvent.loaded, browserEvent.total));
    }
  }
  eventHandler.
      listen(xhr, goog.events.EventType.LOAD, handleLoad).
      listen(xhr, 'progress', handleProgress).
      listen(xhr, goog.events.EventType.ERROR, handleError);
  xhr.send();
  return d;
};

/** @return {Object} */
pics3.GoogleDriveApi.LoadFile.prototype.getMetadata = function() {
  return this.metadata_;
};

/** @return {ArrayBuffer} */
pics3.GoogleDriveApi.LoadFile.prototype.getDataBuffer = function() {
  return this.dataBuffer_;
};
