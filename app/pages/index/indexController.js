/**
 * @file
 * Contains the index controller.
 */

/**
 * Index Controller.
 *
 * Sets up the socket connection and displays the activation page if relevant.
 */
angular.module('ikApp').controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socket', 'itkLogFactory', 'cssInjector',
  function ($scope, $rootScope, $timeout, socket, itkLogFactory, cssInjector) {
    'use strict';

    // The template to render in the index.html's ng-include.
    $scope.template = 'app/pages/index/init.html';
    // Is the screen running (has the screen template been loaded?).
    $scope.running = false;

    // Stored channels for when the screen template has not yet been loaded.
    var savedChannelPushes = [];

    /**
     * Register to the activationNotComplete event.
     */
    $rootScope.$on('activationNotComplete', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/notActivated/not-activated.html';
      });
    });

    /**
     * Register to the awaitingContent event.
     */
    $rootScope.$on('awaitingContent', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/index/awaiting-content.html';
      });
    });

    /**
     * Register to the start event.
     *
     * Applies the screen template and emits stored channels to regions after a 5 seconds delay.
     */
    $rootScope.$on('start', function(event, screen) {
      if (!$scope.running) {
        $scope.$apply(function () {
          // Inject the screen stylesheet.
          cssInjector.add(screen.template.path_css);

          // Set the screen template.
          $scope.template = screen.template.path_live;
        });

        // Wait 5 seconds for the screen template to load.
        $timeout(function() {
          $scope.running = true;

          // Push all stored channels.
          for (var i = 0; i < savedChannelPushes.length; i++) {
            itkLogFactory.info('emitting channel saved channel.');
            $rootScope.$emit('addChannel', savedChannelPushes[i]);
          }
        }, 5000);
      }
    });

    /**
     * Register to the addChannel event.
     *
     * If the screen template is not running yet, store the channel for
     *   emission after the screen template has been loaded.
     */
    $rootScope.$on('addChannel', function(event, data) {
      if (!$scope.running) {
        itkLogFactory.info('saving channel till screen is ready.');
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
