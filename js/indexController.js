ikApp.controller('IndexController', ['$scope', '$rootScope', '$interval', 'socketFactory', function ($scope, $rootScope, $interval, socketFactory) {
  $scope.activationCode = '';
  $scope.step = 'init';
  $scope.slides = [];
  $scope.nextSlides = [];
  $scope.currentIndex = 0;
  $scope.running = false;
  $scope.interval = null;

  socketFactory.start();

  $rootScope.$on('awaitingContent', function() {
    $scope.step = 'awaiting-content';
    $scope.$apply();
  });

  var startSlideShow = function startSlideShow() {
    if (angular.isDefined($scope.interval)) {
      $interval.cancel($scope.interval);
      $scope.interval = undefined;
    }

    $scope.interval = $interval(function() {
      $scope.currentIndex++;
      if ($scope.currentIndex >= $scope.slides.length) {
        $scope.currentIndex = 0;
      }
    }, 5000);
  };

  $rootScope.$on('showContent', function(event, data) {
    if (data === null) {
      return;
    }

    if ($scope.running) {
      startSlideShow();
    }
    else {
      $scope.slides = data.slides;
      $scope.running = true;
      startSlideShow();
      $scope.step = 'show-content';
      $scope.$apply();
    }
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