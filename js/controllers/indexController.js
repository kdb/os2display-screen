ikApp.controller('IndexController', ['$scope', '$rootScope', '$interval', '$sce', 'socketFactory', function ($scope, $rootScope, $interval, $sce, socketFactory) {
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

    $scope.running = true;

    $scope.interval = $interval(function() {
      $scope.currentIndex++;
      if ($scope.currentIndex >= $scope.slides.length) {
        $scope.currentIndex = 0;
        if ($scope.slidesUpdated) {
          $scope.slides = $scope.nextSlides;
          $scope.slidesUpdated = false;
        }
      }
    }, 5000);
  };

  var updateSlideShow = function updateSlideShow(data) {
    $scope.nextSlides = data.slides;
    $scope.slidesUpdated = true;
  }

  $rootScope.$on('showContent', function(event, data) {
    if (data === null) {
      return;
    }

    if ($scope.running) {
      updateSlideShow(data);
    }
    else {
      $scope.slides = data.slides;
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