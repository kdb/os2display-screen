ikApp.controller('IndexController', ['$scope', '$rootScope', 'socketFactory', function ($scope, $rootScope, socketFactory) {
  $scope.activationCode = '';
  $scope.step = 'init';

  socketFactory.start();

  $rootScope.$on('awaitingContent', function() {
    $scope.step = 'awaiting-content';
    $scope.$apply();
  });

  $rootScope.$on("activationNotComplete", function() {
    $scope.step = 'not-activated';
    $scope.$apply();
  });

  $scope.submitActivationCode = function() {
    $scope.step = 'loading';
    socketFactory.activateScreenAndConnect($scope.activationCode);
  }
}]);