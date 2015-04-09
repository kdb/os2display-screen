/**
 * @file
 * Contains the debug module.
 */

/**
 * Setup the module.
 */
(function() {
  'use strict';

  var app;
  app = angular.module("itkDebug", []);

  /**
   * debug factory.
   *
   * Contains the debug methods.
   */
  app.factory('debug', function () {
    var factory = {};

    /**
     * Outputs the debug log message.
     *
     * @param message
     * @param id
     */
    factory.log = function (message, id) {
      if (window.config.debug && window.console) {
        var d = new Date();
        console.log(d + ':  ' + message);
      }

      if (typeof Raven !== 'undefined' && Raven.isSetup()) {
        Raven.captureMessage(message, { tags: { type: 'log', id: id }});
      }
    };

    /**
     * Outputs the debug error message.
     *
     * @param message
     * @param id
     */
    factory.error = function (message, id) {
      if (window.config.debug && window.console) {
        var d = new Date();
        console.error(d + ':  ' + message);
      }

      if (typeof Raven !== 'undefined' && Raven.isSetup()) {
        Raven.captureMessage(message, { tags: { type: 'error', id: id }});
      }
    };

    /**
     * Outputs the debug info message.
     * 
     * @param message
     * @param id
     */
    factory.info = function (message, id) {
      if (window.config.debug && window.console) {
        var d = new Date();
        console.info(d + ':  ' + message);
      }

      if (typeof Raven !== 'undefined' && Raven.isSetup()) {
        Raven.captureMessage(message, { tags: { type: 'info', id: id }});
      }
    };

    return factory;
  });
}).call(this);
