ikApp.controller('NotActivatedController', ['$scope', 'socket',
  function ($scope, socket) {
    "use strict";

    $scope.activationCode = '';

    // Submit handler for the activation screen.
    $scope.submitActivationCode = function() {
      socket.activateScreenAndConnect($scope.activationCode);
    };
  }
]);
