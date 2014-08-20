ikApp.controller('IndexController', ['$scope', 'socketFactory', function ($scope, socketFactory) {
  $scope.activationCode = '';
  $scope.step = 'init';

  var activated = socketFactory.start();

  if (activated) {
    $scope.step = 'activated'
  }
  else {
    $scope.step = 'not-activated';
  }

  $scope.submitActivationCode = function() {
    socketFactory.activateScreenAndConnect($scope.activationCode);
  }
}]);