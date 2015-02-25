/**
 * @file
 * Contains the itkRegion module.
 */

/**
 * Setup the module.
 */
(function() {
  var app;
  app = angular.module("itkRegion", []);

  /**
   * region directive.
   *
   * html parameters:
   *   region: region id.
   */
  app.directive('region', ['$rootScope', '$timeout', 'debug',
    function ($rootScope, $timeout, debug) {
      return {
        restrict: 'E',
        scope: {
          region: '=',
          showProgress: '='
        },
        templateUrl: 'app/shared/region/region.html',
        link: function (scope) {
          // To get smooth transitions between slides, slides consist of two arrays, that are switched between.
          // The current array consist of the channels that are in the current rotation, and the other array
          //   contains future slides.
          scope.channels = [
            {},
            {}
          ];
          scope.channelKeys = [
            [],
            []
          ];

          scope.slideIndex = null;
          scope.channelIndex = null;
          scope.displayIndex = 0;
          scope.running = false;

          // Used by progress bar
          scope.progressBoxElements = 0;
          scope.progressBoxElementsIndex = 0;

          var timeout = null;
          var fadeTime = 1000;
          scope.slidesUpdated = false;
          var channelKey = -1;

          /**
           * Returns true if the slide is scheduled to be shown now.
           *
           * @param slide
           * @returns {boolean}
           */
          var slideScheduled = function slideScheduled(slide) {
            var now = new Date().getTime() / 1000;
            var from = slide.schedule_from;
            var to = slide.schedule_to;

            var fromSet = from && from !== 0;
            var toSet = to && to !== 0;

            if (fromSet && !toSet) {
              return from < now;
            }

            if (fromSet && toSet) {
              return from < to && from < now && to > now;
            }

            if (!fromSet && toSet) {
              return to > now;
            }

            return true;
          };

          /**
           * Reset the progress bar.
           */
          var resetProgressBox = function resetProgressBox() {
            scope.progressBoxElements = 0;
            scope.progressBoxElementsIndex = 0;

            scope.channelKeys[scope.displayIndex].forEach(function (channelKey) {
              var c = scope.channels[scope.displayIndex][channelKey];
              c.forEach(function (element) {
                if (slideScheduled(element)) {
                  scope.progressBoxElements++;
                  element.isScheduled = true;
                }
              });
            });
          };

          /**
           * Sets the progress bar style.
           *
           * @param duration
           */
          var startProgressBar = function startProgressBar(duration) {
            scope.progressBarStyle = {
              "overflow": "hidden",
              "-webkit-transition": "width " + duration + "s linear",
              "-moz-transition": "width " + duration + "s linear",
              "-o-transition": "width " + duration + "s linear",
              "transition": "width " + duration + "s linear",
              "width": "100%"
            };
          };

          /**
           * Resets the progress bar style.
           */
          var resetProgressBar = function resetProgressBar() {
            scope.progressBarStyle = {
              "width": "0"
            };
          };

          /**
           * Set the next slide, and call displaySlide.
           */
          var nextSlide = function nextSlide() {
            scope.slideIndex++;

            var otherDisplayIndex = (scope.displayIndex + 1) % 2;

            // If overlapping current channel length
            if (scope.slideIndex >= scope.channels[scope.displayIndex][scope.channelIndex].length) {
              channelKey++;
              // If more channels remain to be shown, go to next channel.
              if (channelKey < scope.channelKeys[scope.displayIndex].length) {
                scope.channelIndex = scope.channelKeys[scope.displayIndex][channelKey];
              }
              else {
                scope.slideIndex = -1;
                channelKey = 0;

                if (scope.slidesUpdated) {
                  scope.channels[scope.displayIndex] = JSON.parse(JSON.stringify(scope.channels[otherDisplayIndex]));
                  scope.channelKeys[scope.displayIndex] = Object.keys(scope.channels[scope.displayIndex]);

                  scope.displayIndex = otherDisplayIndex;

                  scope.slidesUpdated = false;
                }

                scope.channelIndex = scope.channelKeys[scope.displayIndex][channelKey];

                // Reset progress box
                resetProgressBox();
              }

              scope.slideIndex = 0;
            }

            // If slides array is empty, wait 5 seconds, try again.
            if (scope.channels[scope.displayIndex][scope.channelIndex].length <= 0) {
              $timeout.cancel(timeout);
              timeout = $timeout(nextSlide, 5000);
              return;
            }

            // Ignore if outside of schedule.
            var currentSlide = scope.channels[scope.displayIndex][scope.channelIndex][scope.slideIndex];

            if (!slideScheduled(currentSlide)) {
              // Adjust number of scheduled slides.
              if (currentSlide.isScheduled) {
                currentSlide.isScheduled = false;
                scope.progressBoxElements--;
              }

              // Check if there are any slides scheduled.
              var scheduleEmpty = true;
              scope.channels[scope.displayIndex][scope.channelIndex].forEach(function (element) {
                if (slideScheduled(element)) {
                  scheduleEmpty = false;
                }
              });

              if (!scheduleEmpty) {
                nextSlide();
              } else {
                // If no slide scheduled, go to end of array, wait 5 second, try again.
                scope.slideIndex = scope.channels[scope.displayIndex][scope.channelIndex].length;
                $timeout.cancel(timeout);
                $timeout(function () {
                  nextSlide();
                }, 5000);
              }
            }
            else {
              // Adjust number of scheduled slides.
              if (!currentSlide.isScheduled) {
                currentSlide.isScheduled = true;
                scope.progressBoxElements++;
              }

              displaySlide();
            }
          };

          /**
           * Handler for Offline.down event.
           */
          var mediaLoadNotConnectedError = function mediaLoadNotConnectedError() {
            $timeout.cancel(timeout);
            Offline.off('down');
            nextSlide();
            Offline.check();
          };

          /**
           * Display the current slide.
           * Call next slide.
           *
           * Include 2 seconds in timeout for fade in/outs.
           */
          var displaySlide = function () {
            $timeout.cancel(timeout);
            Offline.off('down');

            scope.progressBoxElementsIndex++;

            resetProgressBar();

            var slide = scope.channels[scope.displayIndex][scope.channelIndex][scope.slideIndex];

            // Handle empty slides array.
            if (slide === undefined) {
              // Wait five seconds and try again.
              $timeout(function () {
                displaySlide();
              }, 5000);

              return;
            }

            // Handle video input or regular slide.
            if (slide.media_type === 'video') {
              if (slide.media.length <= 0) {
                nextSlide();
              }

              // Check to make sure the video can download, else go to next slide.
              if (Offline.state === 'down') {
                nextSlide();
                Offline.check();

                return;
              }

              Offline.on('down', mediaLoadNotConnectedError);

              Offline.check();

              timeout = $timeout(function () {
                if (!slide.videojs) {
                  slide.videojs = videojs('videoPlayer' + slide.uniqueId, {
                    "controls": false,
                    "autoplay": false,
                    "preload": "none"
                  });
                }
                slide.videojs.off();
                slide.videojs.load();

                // When the video is done, load next slide.
                slide.videojs.one('ended', function () {
                  slide.videojs.off();
                  scope.$apply(function () {
                    nextSlide();
                  });
                });

                slide.videojs.one('error', function () {
                  scope.$apply(function () {
                    nextSlide();
                  });
                });

                slide.videojs.on('progress', function () {
                  if (slide.videojs.duration() > 0) {
                    Offline.off('down');
                    slide.videojs.off('progress');

                    var dur = slide.videojs.duration();

                    scope.$apply(function () {
                      // Set the progressbar animation.
                      startProgressBar(dur);
                    });
                  }
                });

                slide.videojs.ready(function () {
                  slide.videojs.play();
                });
              }, fadeTime);
            }
            else {
              // Set the progress bar animation.
              $timeout(function () {
                var dur = slide.duration;

                startProgressBar(dur);
              }, fadeTime);

              // Wait for slide duration, then show next slide.
              // + 2 seconds to account for fade in/outs.
              timeout = $timeout(function () {
                nextSlide();
              }, (slide.duration) * 1000 + fadeTime * 2);
            }
          };

          /**
           * Set the next slides to show.
           * @param data
           */
          var updateSlideShow = function updateSlideShow(data) {
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;
            var id = "" + data.id;

            scope.channels[otherDisplayIndex][id] = data.slides;
            scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
            scope.slidesUpdated = true;
          };

          // Content has arrived from the middleware.
          $rootScope.$on('addChannel', function (event, channel) {
            if (channel === null) {
              return;
            }

            // Check if channel should not be added to region.
            // If it should not be in region and is already,
            //   remove it from the region.
            if (channel.regions.indexOf(scope.region) === -1) {
              var otherDisplayIndex = (scope.displayIndex + 1) % 2;
              var id = "" + channel.data.id;

              if (scope.channels[otherDisplayIndex].hasOwnProperty(id)) {
                debug.info("Removing channel " + channel.data.id + " from region " + scope.region);

                delete scope.channels[otherDisplayIndex][id];
                scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
                scope.slidesUpdated = true;
              }

              return;
            }

            debug.info("Adding channel " + channel.data.id + " to region " + scope.region);

            // The show is running simply update the slides.
            if (scope.running) {
              updateSlideShow(channel.data);
            }
            else {
              // The show was not running, so update the slides and start the show.
              scope.$apply(function () {
                scope.running = true;

                var id = "" + channel.data.id;
                scope.channels[0][id] = channel.data.slides;
                scope.channels[1][id] = channel.data.slides;

                scope.channelKeys[0] = Object.keys(scope.channels[0]);
                scope.channelKeys[1] = Object.keys(scope.channels[1]);

                channelKey = 0;
                scope.channelIndex = scope.channelKeys[0][channelKey];

                // Reset progress box
                resetProgressBox();

                // Make sure the slides have been loaded. Then start the show.
                $timeout(function () {
                  scope.slideIndex = -1;

                  scope.running = true;
                  nextSlide();
                }, 1000);
              });
            }
          });

          // Remove the channel from the next display array.
          $rootScope.$on('removeChannel', function (event, channel) {
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;
            var id = "" + channel.id;

            if (scope.channels[otherDisplayIndex].hasOwnProperty(id)) {
              delete scope.channels[otherDisplayIndex][id];
              scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
              scope.slidesUpdated = true;
            }
          });
        }
      }
    }
  ]);
}).call(this);


