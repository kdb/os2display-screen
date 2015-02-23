/**
 * @file
 * Contains the index controller.
 */

/**
 * Index Controller.
 *
 * Starts the
 */
ikApp.controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socket',
  function ($scope, $rootScope, $timeout, socket) {
    "use strict";

    $scope.template = 'app/pages/index/init.html';
    $scope.running = false;

    // Screen activation have failed.
    $rootScope.$on("activationNotComplete", function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/index/not-activated.html';
      });
    });

    // Connected to the backend and waiting for content.
    $rootScope.$on('awaitingContent', function() {
      $scope.$apply(function () {
        $scope.template = 'app/pages/index/awaiting-content.html';
      });
    });

    $rootScope.$on('start', function() {
      if (!$scope.running) {
        $scope.running = true;

        $scope.$apply(function () {
          $scope.template = 'app/pages/index/screen.html';
        });
      }
    });

    socket.start();
  }
]);
