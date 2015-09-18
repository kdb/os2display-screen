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
  app.directive('region', ['$rootScope', '$timeout', '$interval', 'itkLog', '$http', '$sce',
    function ($rootScope, $timeout, $interval, itkLog, $http, $sce) {
      return {
        restrict: 'E',
        scope: {
          regionId: '=',
          showProgress: '=',
          scale: '='
        },
        templateUrl: 'app/shared/region/region.html?' + window.config.version,
        link: function (scope) {
          $rootScope.$broadcast('regionInfo', {
            "id": scope.regionId,
            "scheduledSlides": 0
          });

          // To get smooth transitions between slides, channels consist of two arrays, that are switched between.
          // The current array consist of the channels that are in the current rotation, and the other array
          //   contains future slides.
          scope.channels = [
            {},
            {}
          ];
          // Since channels are set by keys, we need arrays of the keys, that we can cycle between.
          scope.channelKeys = [
            [],
            []
          ];
          var channelKey = -1;

          scope.slideIndex = null;
          scope.channelIndex = null;
          scope.displayIndex = 0;
          scope.running = false;
          scope.slidesUpdated = false;

          var timeout = null;
          var fadeTime = 1000;

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
           * Reset the progress box.
           */
          var resetProgressBox = function resetProgressBox() {
            itkLog.info('resetProgressBox');
            scope.progressBoxElements = 0;
            scope.progressBoxElementsIndex = 0;

            var numberOfScheduledSlides = 0;

            for (var i = 0; i < scope.channelKeys[scope.displayIndex].length; i++) {
              var channelKey = scope.channelKeys[scope.displayIndex][i];
              var channel = scope.channels[scope.displayIndex][channelKey];

              if (channel.isScheduled) {
                for (var j = 0; j < channel.slides.length; j++) {
                  var slide = channel.slides[j];
                  if (slide.isScheduled) {
                    numberOfScheduledSlides++;
                  }
                }
              }
            }

            scope.progressBoxElements = numberOfScheduledSlides;

            $rootScope.$broadcast('regionInfo', {
              "id": scope.regionId,
              "scheduledSlides": numberOfScheduledSlides
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
          var isSlideScheduled = function isSlideScheduled(slide) {
            var now = Math.round((new Date()).getTime() / 1000);
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
          var isChannelPublished = function isChannelPublished(channel) {
            var now = Math.round((new Date()).getTime() / 1000);
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
          var isChannelScheduled = function isChannelScheduled(channel) {
            // If no schedule repeat is set, it should be shown all the time.
            if (!channel.schedule_repeat) {
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
              if (hourFrom > hourTo) {
                return false;
              }

              return nowHour >= hourFrom && nowHour < hourTo;
            }

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
           */
          var slidesRemainToBeShown = function slidesRemainToBeShown() {
            var element;

            // Check all channels to see if there are slides to show.
            for (var i = 0; i < scope.channelKeys[scope.displayIndex].length; i++) {
              var channelIndex = scope.channelKeys[scope.displayIndex][i];
              var channel = scope.channels[scope.displayIndex][channelIndex];

              if (channel.isScheduled) {
                // Check if there are any slides scheduled in the current channel.
                for (var k = 0; k < channel.slides.length; k++) {
                  element = channel.slides[k];

                  if (element.isScheduled) {
                    return true;
                  }
                }
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
            itkLog.info("restart show");
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;

            scope.slideIndex = -1;
            channelKey = -1;

            // Swap to updated channel array, if there have been changes to channels.
            if (scope.slidesUpdated) {
              scope.channels[scope.displayIndex] = angular.copy(scope.channels[otherDisplayIndex]);
              scope.channelKeys[scope.displayIndex] = Object.keys(scope.channels[scope.displayIndex]);

              scope.displayIndex = otherDisplayIndex;

              scope.slidesUpdated = false;
            }

            // Mark channels and slides that should not be show as isScheduled = false
            updateChannelsScheduled();
            updateSlidesScheduled();

            // Reset progress box
            resetProgressBox();

            // If no slides are to be displayed, wait 5 seconds and restart.
            if (!slidesRemainToBeShown()) {
              $timeout.cancel(timeout);
              timeout = $timeout(goRestartShow, 5000);
            }
            else {
              // Show next slide.
              nextChannel();
            }
          };

          /**
           * Calls restartShow.
           *
           * @TODO: Find way to avoid this call from restartShow().
           */
          var goRestartShow = function goRestartShow() {
            restartShow();
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
            itkLog.info("next channel");

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
                $timeout(goToNextChannel, 100);
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
            itkLog.info("next slide");

            var nextSlideIndex = scope.slideIndex + 1;

            // If overlapping current channel.slides length
            if (!scope.channels[scope.displayIndex][scope.channelIndex] || nextSlideIndex >= scope.channels[scope.displayIndex][scope.channelIndex].slides.length) {
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
            scope.slideIndex = nextSlideIndex;
            var currentSlide = scope.channels[scope.displayIndex][scope.channelIndex].slides[scope.slideIndex];

            // If slide is not scheduled,
            //   make sure a slide is scheduled, to be shown, then go to next slide.
            //   else wait 5 seconds and then go to next slide.
            // This is to avoid fast loop over slides that are not scheduled,
            //   when no slide are scheduled.
            if (!currentSlide.isScheduled) {
              if (slidesRemainToBeShown()) {
                itkLog.info('Slide schedule: slides remain.');
                nextSlide();
              }
              else {
                itkLog.info('Slide schedule: slides do not remain');
                // If no slide scheduled, wait 5 seconds, then restart show.
                $timeout.cancel(timeout);
                $timeout(function () {
                  restartShow();
                }, 5000);
              }
            }
            // If the slide is scheduled, show it.
            else {
              displaySlide();
            }
          };

          /**
           * Display the current slide.
           */
          var displaySlide = function () {
            // To be sure to be sure that the timeout is completed from the last slide.
            $timeout.cancel(timeout);

            // Reset the UI elements (Slide counter display x/y and progress bar.
            resetProgressBar();
            scope.progressBoxElementsIndex++;

            var slide = scope.channels[scope.displayIndex][scope.channelIndex].slides[scope.slideIndex];
            if (slide === undefined) {
              itkLog.info('No slides yet... waiting 5 seconds');

              // Wait five seconds and try again.
              $timeout(function () {
                displaySlide();
              }, 5000);
              return;
            }

            // Call the run function for the given slide_type.
            if (window.slideFunctions[slide.js_script_id]) {
              window.slideFunctions[slide.js_script_id].run(slide, nextSlide, $http, $timeout, $interval, $sce, itkLog, startProgressBar, fadeTime);
            } else {
              // If no slide_type is set, call the 'null' slide_type. See app/shared/slide/nullSlide.js
              // Used for backwards compatibility for temp created before the slide_type field was introduced.
              window.slideFunctions['null'].run(slide, nextSlide, $http, $timeout, $interval, $sce, itkLog, startProgressBar, fadeTime);
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
                itkLog.info("Removing channel " + channel.data.id + " from region " + scope.regionId);

                delete scope.channels[otherDisplayIndex][id];
                scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
                scope.slidesUpdated = true;
              }

              return;
            }

            itkLog.info("Adding channel " + channel.data.id + " to region " + scope.regionId);

            // The show is running simply update the slides.
            if (scope.running) {
              updateSlideShow(channel.data);
            }
            else {
              // The show was not running, so update the slides and start the show.
              scope.$apply(function () {
                // Insert channel into both arrays.
                var id = "" + channel.data.id;
                scope.channels[0][id] = angular.copy(channel.data);
                scope.channels[1][id] = angular.copy(channel.data);

                // Update key arrays
                scope.channelKeys[0] = Object.keys(scope.channels[0]);
                scope.channelKeys[1] = Object.keys(scope.channels[1]);

                // Select first channel.
                channelKey = -1;

                // Make sure the slides have been loaded. Then start the show.
                $timeout(function () {
                  scope.slideIndex = -1;
                  scope.running = true;

                  // Mark channels and slides that should not be show as isScheduled = false
                  updateChannelsScheduled();
                  updateSlidesScheduled();

                  // Reset progress box
                  resetProgressBox();

                  nextChannel();
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
