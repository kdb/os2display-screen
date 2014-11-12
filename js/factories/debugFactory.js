/**
 * Web-socket factory using socket.io to communicate with the middleware.
 */
ikApp.factory('debugFactory', function() {
  var factory = {};

  /**
   * Outputs the debug message.
   * @param message
   */
  factory.debug = function(message) {
    if (window.config.debug && window.console) {
      var d = new Date();
      console.log(d + ':  ' + message);
    }
  };

  return factory;
});