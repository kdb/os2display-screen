ikApp.controller('NotActivatedController', ['$scope', 'socketFactory',
  function ($scope, socketFactory) {
    "use strict";

    $scope.activationCode = '';

    // Submit handler for the activation screen.
    $scope.submitActivationCode = function() {
      socketFactory.activateScreenAndConnect($scope.activationCode);
    };
  }
]);
