/**
 * @file
 * Contains the itkRegion module.
 */

/**
 * Setup the module.
 */
(function () {
  'use strict';

  var app;
  app = angular.module("itkRegion", []);

  /**
   * region directive.
   *
   * html parameters:
   *   region (integer): region id.
   *   show-progress (boolean): should the progress bar/box be displayed?
   */
  app.directive('region', ['$rootScope', '$timeout', 'itkLogFactory',
    function ($rootScope, $timeout, itkLogFactory) {
      return {
        restrict: 'E',
        scope: {
          regionId: '=',
          showProgress: '=',
          scale: '='
        },
        templateUrl: 'app/shared/region/region.html',
        link: function (scope) {
          // To get smooth transitions between slides, channels consist of two arrays, that are switched between.
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
          scope.slidesUpdated = false;

          var timeout = null;
          var fadeTime = 1000;
          var channelKey = -1;

          // Used by progress bar
          scope.progressBoxElements = 0;
          scope.progressBoxElementsIndex = 0;

          /**
           * Sets the progress bar style.
           *
           * @param duration
           *   How many seconds should the animation take?
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
           * Reset the progress bar.
           */
          var resetProgressBox = function resetProgressBox() {
            scope.progressBoxElements = 0;
            scope.progressBoxElementsIndex = 0;

            scope.channelKeys[scope.displayIndex].forEach(function (channelKey) {
              var channel = scope.channels[scope.displayIndex][channelKey];
              if (channel.isScheduled) {
                channel.slides.forEach(function (element) {
                  if (element.isScheduled) {
                    scope.progressBoxElements++;
                  }
                });
              }
            });
          };

          /**
           * Is the slide scheduled to be shown?
           *
           * Returns true if the slide is scheduled to be shown now.
           *
           * @param slide
           * @returns {boolean}
           */
          var isSlideScheduled = function slideScheduled(slide) {
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
           * Is the channel published to be shown now?
           *
           * @param channel
           *   The channel to evaluate.
           * @returns {boolean}
           */
          var isChannelPublished = function channelPublished(channel) {
            var now = (new Date()).getTime() / 1000;
            var publishFrom = channel.publish_from;
            var publishTo = channel.publish_to;

            if (!publishFrom && !publishTo) {
              return true;
            }

            if (publishFrom && now > publishFrom && (!publishTo || now < publishTo)) {
              return true;
            }

            return !publishFrom && now < publishTo;
          };

          /**
           * Is the channel scheduled to be shown now?
           *
           * @param channel
           *   The channel to evaluate.
           * @returns {boolean}
           */
          var isChannelScheduled = function channelScheduled(channel) {
            // If no schedule repeat is set, it should be shown all the time.
            if (!channel.schedule_repeat) {
              itkLogFactory.info("Channel scheduling: !channel.schedule_repeat");
              return true;
            }

            var now = new Date();
            var nowDay = now.getDay();
            var nowHour = now.getHours();

            var hourFrom = channel.schedule_repeat_from;
            var hourTo = channel.schedule_repeat_to;
            var days = channel.schedule_repeat_days;

            // If all 3 parameters are not set return.
            if (!hourFrom && !hourTo && days.length === 0) {
              itkLogFactory.info("Channel scheduling: !hourFrom && !hourTo && !days");
              return true;
            }

            // Should it be shown today?
            var repeatToday = false;
            for (var i = 0; i < days.length; i++) {
              if (days[i].id === nowDay) {
                repeatToday = true;
                break;
              }
            }

            // Is it within scheduled hours?
            if (repeatToday) {
              itkLogFactory.info("Channel scheduling: repeatToday");
              if (hourFrom > hourTo) {
                itkLogFactory.info("Channel scheduling: hourFrom > hourTo");
                return false;
              }

              itkLogFactory.info("Channel scheduling: nowHour >= hourFrom && nowHour < hourTo");
              return nowHour >= hourFrom && nowHour < hourTo;
            }

            itkLogFactory.info('Channel scheduling: schedule false');
            return false;
          };

          /**
           * Update which channels are scheduled to be shown.
           */
          var updateChannelsScheduled = function updateChannelsScheduled() {
            scope.channelKeys[scope.displayIndex].forEach(function (channelKey) {
              var channel = scope.channels[scope.displayIndex][channelKey];
              channel.isScheduled = isChannelPublished(channel) && isChannelScheduled(channel);
            });
          };

          /**
           * Update which slides are scheduled to be shown.
           */
          var updateSlidesScheduled = function updateSlidesScheduled() {
            scope.channelKeys[scope.displayIndex].forEach(function (channelKey) {
              var channel = scope.channels[scope.displayIndex][channelKey];

              channel.slides.forEach(function (slide) {
                slide.isScheduled = isSlideScheduled(slide);
              });
            });
          };

          /**
           * Check if there are any slides that are scheduled.
           *
           * Todo: Remove forEach since the return from them does not apply to the surrounding function, but only the anonymous inner function.
           */
          var slidesRemainToBeShown = function slidesRemainToBeShown() {
            // Check if there are any slides scheduled in the current channel.
            scope.channels[scope.displayIndex][scope.channelIndex].slides.forEach(function (element) {
              if (element.isScheduled) {
                return true;
              }
            });

            for (var i = channelKey; i < scope.channelKeys[scope.displayIndex].length; i++) {
              var channelIndex = scope.channelKeys[scope.displayIndex][i];
              var channel = scope.channels[scope.displayIndex][channelIndex];

              if (channel.isScheduled) {
                // Check if there are any slides scheduled in the current channel.
                channel.slides.forEach(function (element) {
                  if (element.isScheduled) {
                    return true;
                  }
                });
              }
            }

            return false;
          };

          /**
           * Restart the show.
           *
           * Restart the show from the start of the current channels array,
           *   or if there have been changes, go to the other channels array.
           */
          var restartShow = function restartShow() {
            itkLogFactory.info("restart show");
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;

            scope.slideIndex = -1;
            channelKey = 0;

            // Swap to updated channel array, if there have been changes to channels.
            if (scope.slidesUpdated) {
              scope.channels[scope.displayIndex] = angular.copy(scope.channels[otherDisplayIndex]);
              scope.channelKeys[scope.displayIndex] = Object.keys(scope.channels[scope.displayIndex]);

              scope.displayIndex = otherDisplayIndex;

              scope.slidesUpdated = false;
            }

            scope.channelIndex = scope.channelKeys[scope.displayIndex][channelKey];

            // Mark channels and slides that should not be show as isScheduled = false
            updateChannelsScheduled();
            updateSlidesScheduled();

            // Reset progress box
            resetProgressBox();

            nextSlide();
          };

          /**
           * Calls nextChannel.
           *
           * @TODO: Find way to avoid this call from nextChannel().
           */
          var goToNextChannel = function goToNextChannel() {
            nextChannel();
          };

          /**
           * Go to next channel
           *
           * Switch to the next channel or cycle to the first. S
           */
          var nextChannel = function nextChannel() {
            itkLogFactory.info("next channel");

            channelKey++;

            // If more channels remain to be shown, go to next channel.
            if (channelKey < scope.channelKeys[scope.displayIndex].length) {
              var nextChannelIndex = scope.channelKeys[scope.displayIndex][channelKey];
              var nextChannel = scope.channels[scope.displayIndex][nextChannelIndex];
              if (nextChannel.isScheduled) {
                scope.channelIndex = nextChannelIndex;
                scope.slideIndex = -1;

                nextSlide();
              }
              else {
                $timeout.cancel(timeout);
                $timeout(function() {
                  goToNextChannel();
                }, 100);
              }
            }
            // Else restart the show.
            else {
              restartShow();
            }
          };

          /**
           * Set the next slide, and call displaySlide.
           */
          var nextSlide = function nextSlide() {
            itkLogFactory.info("next slide");

            var nextSlideIndex = scope.slideIndex + 1;

            // If overlapping current channel.slides length
            if (nextSlideIndex >= scope.channels[scope.displayIndex][scope.channelIndex].slides.length) {
              nextChannel();
              return;
            }

            // If slides array is empty, wait 5 seconds, try again.
            if (scope.channels[scope.displayIndex][scope.channelIndex] === undefined || scope.channels[scope.displayIndex][scope.channelIndex].slides.length <= 0) {
              $timeout.cancel(timeout);
              timeout = $timeout(nextSlide, 5000);
              return;
            }

            // Get current slide.
            var currentSlide = scope.channels[scope.displayIndex][scope.channelIndex].slides[nextSlideIndex];

            // If slide is not scheduled,
            //   make sure a slide is scheduled, to be shown, then go to next slide.
            //   else wait 5 seconds and then go to next slide.
            // This is to avoid fast loop over slides that are not scheduled,
            //   when no slide are scheduled.
            if (!currentSlide.isScheduled) {
              if (slidesRemainToBeShown()) {
                itkLogFactory.info('Slide schedule: slides remain.');
                nextSlide();
              }
              else {
                itkLogFactory.info('Slide schedule: slides do not remain');
                // If no slide scheduled, wait 5 seconds, then restart show.
                $timeout.cancel(timeout);
                $timeout(function () {
                  restartShow();
                }, 5000);
              }
            }
            // If the slide is scheduled, show it.
            else {
              scope.slideIndex = nextSlideIndex;
              displaySlide();
            }
          };

          /**
           * Handler for Offline.down event.
           */
          var mediaLoadNotConnectedError = function mediaLoadNotConnectedError() {
            itkLogFactory.info("Offline (while playing video) - jumping to next slide.");
            Offline.off('down');
            $timeout.cancel(timeout);
            $timeout(function () {
              nextSlide();
              Offline.check();
            }, 1000);
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

            var slide = scope.channels[scope.displayIndex][scope.channelIndex].slides[scope.slideIndex];

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
                itkLogFactory.info("Offline (before playing video) - jumping to next slide.");
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
                    itkLogFactory.info("Video ended.");
                    nextSlide();
                  });
                });

                slide.videojs.one('error', function (event) {
                  itkLogFactory.error("Error (while playing video).", event);
                  $timeout(function () {
                      scope.$apply(function () {
                        nextSlide();
                      });
                    },
                    1000);
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
           * Update which slides to show next.
           * @param data
           */
          var updateSlideShow = function updateSlideShow(data) {
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;
            var id = "" + data.id;

            scope.channels[otherDisplayIndex][id] = angular.copy(data);
            scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
            scope.slidesUpdated = true;
          };

          // Event handler for 'addChannel' event.
          // Content has arrived from the middleware.
          $rootScope.$on('addChannel', function handleAddChannel(event, channel) {
            if (channel === null) {
              return;
            }

            // Check if channel should not be added to region.
            // If it should not be in region and is already,
            //   remove it from the region.
            if (channel.regions.indexOf(scope.regionId) === -1) {
              var otherDisplayIndex = (scope.displayIndex + 1) % 2;
              var id = "" + channel.data.id;

              if (scope.channels[otherDisplayIndex].hasOwnProperty(id)) {
                itkLogFactory.info("Removing channel " + channel.data.id + " from region " + scope.regionId);

                delete scope.channels[otherDisplayIndex][id];
                scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
                scope.slidesUpdated = true;
              }

              return;
            }

            itkLogFactory.info("Adding channel " + channel.data.id + " to region " + scope.regionId);

            // The show is running simply update the slides.
            if (scope.running) {
              updateSlideShow(channel.data);
            }
            else {
              // The show was not running, so update the slides and start the show.
              scope.$apply(function () {
                scope.running = true;

                // Insert channel into both arrays.
                var id = "" + channel.data.id;
                scope.channels[0][id] = angular.copy(channel.data);
                scope.channels[1][id] = angular.copy(channel.data);

                // Update key arrays
                scope.channelKeys[0] = Object.keys(scope.channels[0]);
                scope.channelKeys[1] = Object.keys(scope.channels[1]);

                // Select first channel.
                channelKey = 0;
                scope.channelIndex = scope.channelKeys[0][channelKey];

                // Update which channels should be viewed.
                updateChannelsScheduled();
                updateSlidesScheduled();

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

          // Event handler for 'removeChannel' event.
          // Remove the channel from the next display array.
          $rootScope.$on('removeChannel', function removeChannelEvent(event, channel) {
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;
            var id = "" + channel.id;

            // If the channel is in the array, remove it.
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
