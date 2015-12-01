/**
 * @file
 * Contains the index controller.
 */

/**
 * Index Controller.
 *
 * Sets up the socket connection and displays the activation page if relevant.
 */
angular.module('ikApp').controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socket', 'itkLog', 'cssInjector',
  function ($scope, $rootScope, $timeout, socket, itkLog, cssInjector) {
    'use strict';

    // Initial slide function array to hold custom slide plugins loaded from
    // the administration interface
    if (!window.hasOwnProperty('slideFunctions')) {
      window.slideFunctions = [];
    }

    // The template to render in the index.html's ng-include.
    $scope.template = 'app/pages/index/init.html?' + window.config.version;

    // Is the screen running (has the screen template been loaded?).
    $scope.running = false;

    // Default fallback image, used when no slide content exists. Default to
    // displaying it during load.
    $scope.fallbackImageUrl = window.config.fallback_image ? window.config.fallback_image : 'assets/images/fallback_default.png';
    $scope.displayFallbackImage = true;

    // Stored channels for when the screen template has not yet been loaded.
    // @TODO: jeskr: don't understand the comment?
    var savedChannelPushes = [];

    // Saved info about regions
    var regions = [];

    /**
     * Register to the regionInfo event.
     *
     * Updates whether or not the fallback image should be displayed.
     *
     * @TODO: jeskr: When is this event fired? What is it used for?
     */
    $rootScope.$on('regionInfo', function(event, info) {
      regions[info.id] = info;

      var dontDisplayDefaultImage = false;

      // Check if the region has any content.
      regions.forEach(function(region) {
        if (region.scheduledSlides > 0) {
          dontDisplayDefaultImage = true;
        }
      });

      $scope.displayFallbackImage = !dontDisplayDefaultImage;
    });

    /**
     * Register to the activationNotComplete event.
     *
     * @TODO: jeskr: When is this event fired? What is it used for?
     */
    $rootScope.$on('activationNotComplete', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/notActivated/not-activated.html?' + window.config.version;
      });
    });

    /**
     * Register to the awaitingContent event.
     *
     * @TODO: jeskr: When is this event fired? What is it used for? Is it where
     *               used will default screen not be display while waiting on
     *               content?
     */
    $rootScope.$on('awaitingContent', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/index/awaiting-content.html?' + window.config.version;
      });
    });

    /**
     * Register to the start event.
     *
     * Applies the screen template and emits stored channels to regions after a
     * 5 seconds delay.
     *
     * @TODO: jeskr: yes... 5 sec... why 5?
     */
    $rootScope.$on('start', function(event, screen) {
      if (!$scope.running) {
        // Load screen template and trigger angular digest to update the screen
        // with the template.
        $scope.$apply(function () {
          // Inject the screen stylesheet.
          cssInjector.add(screen.template.path_css);

          // Set the screen template.
          $scope.template = screen.template.path_live;
          $scope.templateDirectory = screen.template.path;

          $scope.options = screen.options;
        });

        // Wait 5 seconds for the screen template to load.
        // @TODO: jeskr: could the load process not return a promise, 5 sek is
        //               just an random number, why not wait 10?
        $timeout(function() {
          $scope.running = true;

          // Push all stored channels.
          for (var i = 0; i < savedChannelPushes.length; i++) {
            itkLog.info('Emitting channel saved channel.');
            $rootScope.$emit('addChannel', savedChannelPushes[i]);
          }
        }, 5000);
      }
    });

    /**
     * Register to the addChannel event.
     *
     * If the screen template is not running yet, store the channel for
     * emission after the screen template has been loaded.
     *
     * @TODO: Note about where this hidden emission happens? And if it's running
     *        why not emit it now?
     */
    $rootScope.$on('addChannel', function(event, data) {
      if (!$scope.running) {
        itkLog.info('Saving channel till screen is ready.');
        savedChannelPushes.push(data);
      }
    });

    /**
     * Logout and reload the screen.
     */
    $scope.logout = function logout() {
      // Use the socket to logout.
      socket.logout();
    };

    // Start the socket connection to the middleware.
    socket.start();
  }
]);
