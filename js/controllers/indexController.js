/**
 * @file
 * Main controller for the application.
 */
ikApp.controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socketFactory', function ($scope, $rootScope, $timeout, socketFactory) {
  $scope.activationCode = '';
  $scope.step = 'init';
  $scope.slides = [];
  $scope.nextSlides = [];
  $scope.currentIndex = null;
  $scope.running = false;
  $scope.timeout = null;
  $scope.slidesUpdated = false;

  /**
   * Display the current slide.
   * Call next slide.
   *
   * Include 2 seconds in timeout for fade in/outs.
   */
  var displaySlide = function() {
    $scope.timeout = $timeout(function() {
      $scope.currentIndex++;

      if ($scope.currentIndex >= $scope.slides.length) {
        if ($scope.slidesUpdated && $scope.slides !== $scope.nextSlides) {
          $scope.currentIndex = null;
          $scope.slides = $scope.nextSlides;
        }

        $scope.currentIndex = 0;
        $scope.slidesUpdated = false;
      }

      displaySlide();
    }, ($scope.slides[$scope.currentIndex].duration + 2) * 1000);
  }

  /**
   * Start the slideshow.
   */
  var startSlideShow = function startSlideShow() {
    if (angular.isDefined($scope.interval)) {
      $interval.cancel($scope.interval);
      $scope.interval = undefined;
    }

    $scope.running = true;

    displaySlide();
  };

  /**
   * Set the next slides to show.
   * @param data
   */
  var updateSlideShow = function updateSlideShow(data) {
    $scope.nextSlides = data.slides;
    $scope.slidesUpdated = true;
  };

  // Connect to the backend via sockets.
  socketFactory.start();

  // Connected to the backend and waiting for content.
  $rootScope.$on('awaitingContent', function() {
    $scope.$apply(function () {
      $scope.step = 'awaiting-content';
    });
  });

  // Content has arrived from the middleware.
  $rootScope.$on('showContent', function(event, data) {
    if (data === null) {
      return;
    }

    // The show is running simply update the slides.
    if ($scope.running) {
      updateSlideShow(data);
    }
    else {
      // The show was not running, so update the slides and start the show.
      $scope.$apply(function () {
        $scope.step = 'show-content';
        $scope.slides = data.slides;

        // Make sure the slides have been loaded. Then start the show.
        $timeout(function() {
          $scope.currentIndex = 0;

          startSlideShow();
        }, 1000);

      });
    }
  });

  // Screen activation have failed.
  $rootScope.$on("activationNotComplete", function() {
    $scope.$apply(function () {
      $scope.step = 'not-activated';
    });
  });

  // Submit handler for the activation screen.
  $scope.submitActivationCode = function() {
    $scope.step = 'loading';
    socketFactory.activateScreenAndConnect($scope.activationCode);
  }

}]);