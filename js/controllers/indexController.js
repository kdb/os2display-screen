/**
 * @file
 * Main controller for the application.
 */
ikApp.controller('IndexController', ['$scope', '$rootScope', '$timeout', 'socketFactory', 'cssInjector', function ($scope, $rootScope, $timeout, socketFactory, cssInjector) {
  $scope.activationCode = '';
  $scope.step = 'init';
  $scope.slides = [];
  $scope.nextSlides = [];
  $scope.currentIndex = null;
  $scope.running = false;
  $scope.timeout = null;
  $scope.slidesUpdated = false;


  cssInjector.add(window.config.backend.address + 'css/styles.css');

  /**
   * Register a one time event listener.
   * @param node
   * @param type
   * @param callback
   */
  var registerOnetimeEventListener = function registerOnetimeEventListener(node, type, callback) {
    // create event
    node.addEventListener(type, function(e) {
      // remove event
      e.target.removeEventListener(e.type, arguments.callee);
      // call handler
      return callback(e);
    });
  }

  /**
   * Display the current slide.
   * Call next slide.
   *
   * Include 2 seconds in timeout for fade in/outs.
   */
  var displaySlide = function() {
    var slide = $scope.slides[$scope.currentIndex];

    if (slide.template === 'only-video') {
      slide.currentVideo = {
        "mp4" : slide.videoUrls[slide.options.videos[0]].mp4,
        "ogg" : slide.videoUrls[slide.options.videos[0]].ogg
      };

      $timeout(function() {
        var el = angular.element(document.querySelector('#videoPlayer'))[0];
        el.load();
        el.muted = true;
        registerOnetimeEventListener(el, 'ended', function() {
          $scope.$apply(function() {
            nextSlide();
          });
        });
        $timeout(function() {
          el.play();
        }, 900);
      }, 100);
    }
    else {
      $scope.timeout = $timeout(function() {
        nextSlide();
      }, (slide.duration + 2) * 1000);
    }
  };

  var nextSlide = function nextSlide() {
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

          $scope.running = true;
          displaySlide();
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