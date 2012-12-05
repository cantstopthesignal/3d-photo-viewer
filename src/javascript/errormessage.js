// Copyright cantstopthesignals@gmail.com

goog.provide('pics3.ErrorMessage');
goog.provide('pics3.errorMessage');


/** @desc Network error */
pics3.errorMessage.MSG_NETWORK_ERROR = goog.getMsg(
    'A network error occurred.  Please try again later.');

/** @enum {string} */
pics3.ErrorMessage = {
  NETWORK: pics3.errorMessage.MSG_NETWORK_ERROR
};
