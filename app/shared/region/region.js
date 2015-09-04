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
           * Handle video error.
           *
           * @param event
           *   If defined it's a normal error event else it's offline down.
           */
          var videoErrorHandling = function videoErrorHandling(event) {
            if (event !== undefined) {
              // Normal javascript error event.
              event.target.removeEventListener(event.type, videoErrorHandling);
              itkLog.error('Network connection.', event);
            }
            else {
              itkLog.error('Unknown video network connection error.');
            }
            Offline.off('down');

            // Go to the next slide.
            nextSlide();
          };

          /**
           * Go to next rss news.
           * @param slide
           */
          var rssTimeout = function(slide) {
            timeout = $timeout(function () {
              if (slide.rss.rssEntry + 1 >= slide.options.rss_number) {
                nextSlide();
              }
              else {
                slide.rss.rssEntry++;
                timeout = rssTimeout(slide);
              }
            }, slide.options.rss_duration * 1000);
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

            // Handle rss slide_type, video media_type or image media_type.
            if (slide.slide_type === 'rss') {
              itkLog.info('Getting rss feed' + slide.options.source);
              // Get the feed
              $http.jsonp(
                '//ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=' + slide.options.rss_number + '&callback=JSON_CALLBACK&output=xml&q=' +
                encodeURIComponent(slide.options.source))
                .success(function(data) {
                  // Make sure we do not have an error result from googleapis
                  if (data.responseStatus !== 200) {
                    itkLog.error(data.responseDetails, data.responseStatus);
                    if (slide.rss && slide.rss.feed && slide.rss.feed.entries && slide.rss.feed.entries.length > 0) {
                      slide.rss.rssEntry = 0;
                      timeout = rssTimeout(slide);
                    }
                    else {
                      // Go to next slide.
                      $timeout(nextSlide, 5000);
                    }
                    return;
                  }

                  var xmlString = data.responseData.xmlString;
                  slide.rss = {feed: {entries:[]}};
                  slide.rss.rssEntry = 0;

                  slide.rss.feed.title = $sce.trustAsHtml($(xmlString).find('channel > title').text());

                  $(xmlString).find('channel > item').each(function() {
                    var entry = $(this);

                    var news = {};

                    news.title = $sce.trustAsHtml(entry.find('title').text());
                    news.description = $sce.trustAsHtml(entry.find('description').text());
                    news.date = new Date(entry.find('pubDate').text());

                    slide.rss.feed.entries.push(news);
                  });

                  timeout = rssTimeout(slide);

                  // Set the progress bar animation.
                  var dur = slide.options.rss_duration * slide.options.rss_number - 1;
                  startProgressBar(dur);
                })
                .error(function (message) {
                  itkLog.error(message);
                  if (slide.rss.feed && slide.rss.feed.entries && slide.rss.feed.entries.length > 0) {
                    slide.rss.rssEntry = 0;
                    timeout = rssTimeout(slide);
                  }
                  else {
                    // Go to next slide.
                    $timeout(nextSlide, 5000);
                  }
                });
            }
            else if (slide.media_type === 'video') {
              // If media is empty go to the next slide.
              if (slide.media.length <= 0) {
                nextSlide();
              }

              // Check if there is an internet connection.
              Offline.on('down', videoErrorHandling);
              Offline.check();
              if (Offline.state === 'down') {
                videoErrorHandling(undefined);
                return;
              }

              // Get hold of the video element.
              var video = document.getElementById('videoPlayer-' + slide.uniqueId);

              // Update video.
              updateVideoSources(video, false);

              // Add error handling.
              video.addEventListener('error', videoErrorHandling);

              // Reset video position to prevent flicker from latest playback.
              try {
                // Load video to ensure playback after possible errors from last playback. If not called
                // the video will not play.
                video.load();
                video.currentTime = 0;
              }
              catch (error) {
                itkLog.info('Video content might not be loaded, so reset current time not possible');

                // Use the error handling to get next slide.
                videoErrorHandling(undefined);
              }

              // Fade timeout to ensure video don't start before it's displayed.
              timeout = $timeout(function () {
                // Create interval to get video duration (ready state larger than one is meta-data loaded).
                var interval = $interval(function() {
                  if (video.readyState > 0) {
                    var duration = Math.round(video.duration);
                    startProgressBar(duration);

                    // Metadata/duration found stop the interval.
                    $interval.cancel(interval);
                  }
                }, 500);

                // Go to the next slide when video playback has ended.
                video.onended = function ended(event) {
                  itkLog.info("Video playback ended.", event);
                  $timeout(function () {
                    scope.$apply(function () {
                      // Remove error handling.
                      video.removeEventListener('error', videoErrorHandling);
                      Offline.off('down');

                      // Remove video src.
                      updateVideoSources(video, true);

                      // Go to the next slide.
                      nextSlide();
                    });
                  },
                  1000);
                };

                // Play the video.
                video.play();
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
           * Helper function to update source for video.
           *
           * This is due to a memory leak problem in chrome.
           *
           * @param video
           *   The video element.
           * @param reset
           *   If true src is unloaded else src is set from data-src.
           */
          var updateVideoSources = function updateVideoSources(video, reset) {
            // Due to memory leak in chrome we change the src attribute.
            var sources = video.getElementsByTagName('source');
            for (var i = 0; i < sources.length; i++) {
              if (reset) {
                // @see http://www.attuts.com/aw-snap-solution-video-tag-dispose-method/ about the pause and load.
                video.pause();
                sources[i].setAttribute('src', '');
                video.load();
              }
              else {
                sources[i].setAttribute('src', sources[i].getAttribute('data-src'));
              }
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
                scope.running = true;

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
