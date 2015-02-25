/**
 * @file
 * Contains the index controller.
 */

/**
 * Index Controller.
 *
 * Starts the
 */
ikApp.controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socket', 'debug',
  function ($scope, $rootScope, $timeout, socket, debug) {
    "use strict";

    $scope.template = 'app/pages/index/init.html';
    $scope.running = false;

    var savedChannelPushes = [];

    // Screen activation have failed.
    $rootScope.$on("activationNotComplete", function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/notActivated/not-activated.html';
      });
    });

    // Connected to the backend and waiting for content.
    $rootScope.$on('awaitingContent', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/index/awaiting-content.html';
      });
    });

    $rootScope.$on('start', function(event, screen) {
      if (!$scope.running) {
        $scope.$apply(function () {
          $scope.template = screen.template.path_live;
        });

        $timeout(function() {
          $scope.running = true;

          for (var i = 0; i < savedChannelPushes.length; i++) {
            debug.info("emitting channel saved channel.");
            $rootScope.$emit('addChannel', savedChannelPushes[i]);
          }
        }, 5000);
      }
    });

    $rootScope.$on('addChannel', function(event, data) {
      if (!$scope.running) {
        debug.info("saving channel till screen is ready.");
        savedChannelPushes.push(data);
      }
    });

    socket.start();
  }
]);
