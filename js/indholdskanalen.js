/**
 * @file
 * This is a client for the Indholdskanalen system.
 */
var INFOS = (function() {
  "use strict"

  // Get the load configuration object.
  var config = window.config;

  // Communication with web-socket.
  var socket = undefined;

  // Global variable with token cookie.
  var token_cookie = undefined;

  // Array of cached slides. Used to cache new pushed content
  // until the system is ready to display it.
  var cache = [];
  var content_update = false;
  var content_init = true;

  /**
   * Cookie object.
   *
   * Used to handle the cookie(s), mainly used to store the connection JSON Web Token.
   */
  var Cookie = (function() {
    var Cookie = function(name) {
      var self = this;
      var name = name;

      // Get token.
      self.get = function get() {
        var regexp = new RegExp("(?:^" + name + "|;\s*"+ name + ")=(.*?)(?:;|$)", "g");
        var result = regexp.exec(document.cookie);
        return (result === null) ? undefined : result[1];
      }

      // Set token
      self.set = function set(value, expire) {
        var cookie = name + '=' + escape(value) + ';';

        if (expire == undefined) {
          expire = 'Thu, 01 Jan 2018 00:00:00 GMT';
        }
        cookie += 'expires=' + expire + ';';

        cookie += 'path=/;';
        cookie += 'domain=' + document.domain + ';';

        // Check if cookie should be available only over https.
        if (config.cookie.secure === true) {
          cookie += ' secure';
        }

        document.cookie = cookie;
      }

      // Remove the cookie by expiring it.
      self.remove = function remove() {
        self.set('', 'Thu, 01 Jan 1970 00:00:00 GMT');
      }
    }

    return Cookie;
  })();

  /***************************
   * Private methods
   *****************/

  /**
   * Activate the screen and connect.
   * @param activationCode
   *   Activation code for the screen.
   */
  function activateScreenAndConnect(activationCode) {
    // Build ajax post request.
    var request = new XMLHttpRequest();
    request.open('POST', config.resource.server + config.resource.uri + '/activate', true);
    request.setRequestHeader('Content-Type', 'application/json');

    request.onload = function(resp) {
      if (request.readyState == 4 && request.status == 200) {
        // Success.
        resp = JSON.parse(request.responseText);

        // Try to get connection to the proxy.
        connect(resp.token);
      }
      else {
        // We reached our target server, but it returned an error
        alert('Activation could not be performed.');
      }
    }

    request.onerror = function(exception) {
      // There was a connection error of some sort
      alert('Activation request failed.');
    }

    // Send the request.
    request.send(JSON.stringify({ activationCode: activationCode }));
  }

  /**
   * Get GET-parameter @name from the url
   * @param name
   * @returns {string}
   */
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");

    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);

    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  /**
   * Check if a valid token exists.
   *
   * If a token is found a connection to the proxy is attempted. If token
   * not found the activation form is displayed.
   *
   * If the key url-parameter is set, use that for activation.
   */
  function activation() {
    // Check if token exists.
    token_cookie = new Cookie('infostander_token');
    var token = token_cookie.get('token');

    if (token === undefined) {
      // If key in url do ajax and return;
      var key = getParameterByName('key');
      if (key !== "") {
        activateScreenAndConnect(key);

        return false;
      }

      // Token not found, so display actiavte page.
      var template = Handlebars.templates.activation;
      var output = template({button: 'Activation'});

      // Insert the render content.
      var el = document.getElementsByClassName('content');
      el[0].innerHTML = output;

      // Add event listener to form submit button.
      el = document.getElementsByClassName('btn-activate');
      el[0].addEventListener('click', function(event) {
        event.preventDefault();

        // Send the request.
        var form = document.getElementsByClassName('form-activation-code');
        activateScreenAndConnect(form[0].value);

        return false;
      });
    }
    else {
      // If token exists, connect to the socket.
      connect(token);
    }
  }

  /**
   * Load the socket.io script from the proxy server.
   *
   * Retry if  io  is not loaded after 30 seconds.
   */
  function loadSocket(callback) {
    var file = document.createElement('script');
    file.setAttribute('type', 'text/javascript');
    file.setAttribute('src', config.resource.server +  config.resource.uri + '/socket.io/socket.io.js');

    file.onload = callback;

    document.getElementsByTagName("head")[0].appendChild(file);

    // Make sure the script has been loaded, else restart application.
    window.setTimeout(function() {
      if (typeof io === "undefined") {
        document.getElementsByTagName("head")[0].removeChild(file);
        window.setTimeout(start, 100);
      }
    }, 30000);
  }

  /**
   * Helper function to display error and system messages.
   */
  function updateContent(msg) {
    var el = document.getElementsByClassName('content');
    el[0].innerHTML = '<p>' + msg + '</p>';
  }

  /**
   * Connect to the web-socket.
   *
   * @param string token
   *   JWT authentication token from the activation request.
   */
  function connect(token) {
    // Get connected to the server.
    socket = io.connect(config.ws.server, { query: 'token=' + token });

    // Handle error events.
    socket.on('error', function (reason) {
      if (window.console) {
        console.log(reason);
      }
    });

    // Handle connected event.
    socket.on('connect', function () {
      // Connection accepted, so lets store the token.
      token_cookie.set(token);

      // Set ready state at the server, if not reconnected.
      if (content_init) {
        socket.emit('ready', { token: token });
      }
    });

    // Handled deletion of screen event.
    socket.on('booted', function (data) {
      // Remove cookie with token.
      token_cookie.remove();

      // Reload application.
      location.reload(true);
    });

    // Ready event - if the server accepted the ready command.
    socket.on('ready', function (data) {
      if (data.statusCode != 200) {
        // Screen not found will reload applicaton on dis-connection event.
        if (data.statusCode !== 404) {
          if (window.console) {
            console.log('Code: ' + data.statusCode + ' - Connection error');
          }
          return;
        }
      }
      else {
        // Remove the form.
        updateContent('Awaiting content...');
      }
    });

    // Pause event - if the server accepted the pause command.
    socket.on('pause', function (data) {
      if (data.statusCode != 200) {
        // @todo: error on pause command.
      }
    });

    // Reload - if the server accepted the pause command.
    socket.on('reload', function (data) {
      // Reload browser windows (by-pass-cache).
      location.reload(true);
    });

    // Channel pushed content.
    socket.on('channelPush', function (data) {
      // Cache data.
      cache = data;

      // Flags that content is available. The slides will be
      // updated when current slides have been displayed. This
      // is to prevent "flicker" on the screens.
      content_update = true;

      // If this is the first time content have been received
      // start the show.
      if (content_init) {
        content_init = false;
        insertSlides();
        startAnimation();
      }
    });
  }

  /**
   * Insert the new slides into the DOM.
   */
  function insertSlides () {
    // Render images (slides) from cache.
    var html = '';
    var length = cache.slides.length;
    for (var i = 0; i < length; i++) {
      var output = Handlebars.templates.slide(cache.slides[i]);
      html += output;
    }

    // Added render content to the page.
    var el = document.getElementsByClassName('content');
    el[0].innerHTML = html;

    // Reset content update flag.
    content_update = false
  }

  /**
   * Start the slide animations (by moving the fade class between images).
   *
   * The
   */
  function startAnimation () {
    // Setup the animation.
    var images = document.getElementsByClassName('image');
    var count = images.length;
    var current = 0;
    var el = document.getElementsByClassName('content');

    var changeClass = function(event) {
      // Remove class.
      event.target.className = event.target.className.replace(' fade', '');

      // Update counter.
      current++;
      if (current === count) {
        // Reset counter;
        current = 0;

        // All slides have been displayed, check for new content.
        if (content_update) {
          insertSlides();

          // Reload images array.
          images = document.getElementsByClassName('image');
          count = images.length;
        }
      }

      // Add class to next image.
      // Timeout added to make sure the fade-class removal was completed,
      //   before adding it again in 1-slide situations.
      window.setTimeout(function() {
        images[current].className += ' fade';
      }, 10);
    }

    // Register event listener for animation end.
    el[0].addEventListener("animationend", changeClass, false);
    el[0].addEventListener("webkitAnimationEnd", changeClass, false);

    // Start the show.
    images[current].className += ' fade';
  }

  /***************************
   * Exposed methods
   *****************/

  /**
   * This is used to start the application.
   */
  function start() {
    // Load socket.io Javascript.
    loadSocket(function () {
      // Activate the screen.
      activation();
    });
  }

  /**
   * This should mainly be used to debugging.
   */
  function stop() {
    socket.emit('pause', {});
  }

  return {
    start: start,
    stop: stop
  }
})();

// Get the show on the road.
INFOS.start();
