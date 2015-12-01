/**
 * @file
 * Contains the itkRegion module.
 */

/**
 * Setup the module.
 */
(function () {
  'use strict';

  var app = angular.module("itkRegion", []);

  // Create ProgressBar object ot handle the bar.
  function ProgressBar(scope, itkLog) {
    this.scope = scope;
    this.itkLog = itkLog;
  }

  /**
   * Sets the progress bar style.
   *
   * @param duration
   *   How many seconds should the animation take?
   */
  ProgressBar.prototype.start = function start(duration) {
    this.scope.progressBarStyle =  {
      "overflow": "hidden",
      "-webkit-transition": "width " + duration + "s linear",
      "-moz-transition": "width " + duration + "s linear",
      "-o-transition": "width " + duration + "s linear",
      "transition": "width " + duration + "s linear",
      "width": "100%"
    };
  };

  /**
   * Reset the progress box.
   *
   * @return int
   *   The number of slides currently scheduled.
   */
  ProgressBar.prototype.resetBox = function resetBox() {
    var self = this;

    self.itkLog.info('resetProgressBox');
    self.scope.progressBoxElements = 0;
    self.scope.progressBoxElementsIndex = 0;

    var numberOfScheduledSlides = 0;

    for (var i = 0; i < self.scope.channelKeys[self.scope.displayIndex].length; i++) {
      var channelKey = self.scope.channelKeys[self.scope.displayIndex][i];
      var channel = self.scope.channels[self.scope.displayIndex][channelKey];

      if (channel.isScheduled) {
        for (var j = 0; j < channel.slides.length; j++) {
          var slide = channel.slides[j];
          if (slide.isScheduled) {
            numberOfScheduledSlides++;
          }
        }
      }
    }

    self.scope.progressBoxElements = numberOfScheduledSlides;

    return numberOfScheduledSlides;
  };

  /**
   * Set the next slide number in the info box.
   */
  ProgressBar.prototype.next = function next() {
    // Reset the bar.
    this.reset();

    // Update the counter.
    this.scope.progressBoxElementsIndex++;
  };

  /**
   * Resets the progress bar style.
   */
  ProgressBar.prototype.reset = function reset() {
    this.scope.progressBarStyle = {
      "width": "0"
    };
  };


  // Create region function object and use prototype to extend it to optimize
  // memory usage inside the region directive.
  function Region(scope, itkLog, progressBar, $timeout, $rootScope, $http, $interval, $sce) {
    this.scope = scope;
    this.itkLog = itkLog;
    this.progressBar = progressBar;
    this.$timeout = $timeout;
    this.$rootScope = $rootScope;

    this.$http = $http;
    this.$interval = $interval;
    this.$sce = $sce;

    // @TODO: Hardcode fade timeout?
    this.fadeTime = 1000;

    // @TODO: what is a channel key?
    this.channelKey = -1;

    // @TODO: try to get out of this timeout h...!
    this.timeout = null;
  }

  /**
   * Broadcast regionInfo event.
   *
   * @param slideCount
   *   The number of slides that are scheduled.
   */
  Region.prototype.broadcastInfo = function broadcastInfo(slideCount) {
    var self = this;
    self.$rootScope.$broadcast('regionInfo', {
      "id": self.scope.regionId,
      "scheduledSlides": slideCount
    });
  };

  /**
   * Calculated if the slide should be shown now.
   *
   * Stores the result of calculation on the slide object in the property
   * "isScheduled".
   *
   * @param slide
   */
  Region.prototype.isSlideScheduled = function isSlideScheduled(slide) {
    var now = Math.round((new Date()).getTime() / 1000);
    var from = slide.schedule_from;
    var to = slide.schedule_to;

    var fromSet = from && from !== 0;
    var toSet = to && to !== 0;

    if (fromSet && !toSet) {
      slide.isScheduled = from < now;
    }
    else if (fromSet && toSet) {
      slide.isScheduled = from < to && from < now && to > now;
    }
    else if (!fromSet && toSet) {
      slide.isScheduled = to > now;
    }
    else {
      slide.isScheduled = true;
    }
  };

  /**
   * Is the channel scheduled to be shown now?
   *
   * @param channel
   *   The channel to evaluate.
   * @returns {boolean}
   */
  Region.prototype.isChannelScheduled = function isChannelScheduled(channel) {
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
   * Is the channel published to be shown now?
   *
   * @param channel
   *   The channel to evaluate.
   */
  Region.prototype.isChannelPublished = function isChannelPublished(channel) {
    var now = Math.round((new Date()).getTime() / 1000);
    var publishFrom = channel.publish_from;
    var publishTo = channel.publish_to;

    channel.isScheduled = false;
    if (this.isChannelScheduled(channel)) {
      if (!publishFrom && !publishTo) {
        channel.isScheduled = true;
      }
      else if (publishFrom && now > publishFrom && (!publishTo || now < publishTo)) {
        channel.isScheduled = true;
      }
      else {
        channel.isScheduled = !publishFrom && now < publishTo;
      }
    }
  };

  /**
   * Update which channels are scheduled to be shown.
   */
  Region.prototype.updateScheduling = function updateScheduling() {
    var self = this;
    var displayIndex = self.scope.displayIndex;

    self.scope.channelKeys[displayIndex].forEach(function (channelKey, index, array) {
      var channel = self.scope.channels[displayIndex][channelKey];
      self.isChannelPublished(channel);

      channel.slides.forEach(function (slide) {
        self.isSlideScheduled(slide);
      });
    });
  };

  /**
   * Check if there are any slides that are scheduled.
   */
  Region.prototype.slidesRemainToBeShown = function slidesRemainToBeShown() {
    var self = this;
    var element;

    var displayIndex = self.scope.displayIndex;
    var len = self.scope.channelKeys[self.scope.displayIndex].length;

    // Check all channels to see if there are slides to show.
    for (var i = 0; i < len; i++) {
      var channel = self.scope.channels[displayIndex][self.scope.channelKeys[displayIndex][i]];

      if (channel.isScheduled) {
        // Check if there are any slides scheduled in the current channel.
        for (var k = 0; k < channel.slides.length; k++) {
          element = channel.slides[k];

          // @TODO: function is called slide(s), so why return true at first
          //        found slide?
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
  Region.prototype.restartShow = function restartShow() {
    var self = this;

    self.itkLog.info("Restart show");

    // @TODO: The magic of -1 one values?
    self.scope.slideIndex = -1;
    self.channelKey = -1;

    // Swap to updated channel array, if there have been changes to channels.
    if (self.scope.slidesUpdated) {
      // @TODO: Would be nice with comment about this mod magic?
      var otherDisplayIndex = (self.scope.displayIndex + 1) % 2;

      var displayIndex = self.scope.displayIndex;
      var channels = self.scope.channels;
      channels[displayIndex] = angular.copy(channels[otherDisplayIndex]);
      self.scope.channelKeys[displayIndex] = Object.keys(channels[displayIndex]);

      // Update the display index to the new index value.
      self.scope.displayIndex = otherDisplayIndex;

      // Reset update variable as slides have been updated.
      self.scope.slidesUpdated = false;

      // @TODO: Remove the old data in channels[otherDisplayIndex] to free
      //        memory?
    }

    // Mark channels and slides that should not be show right now as they may be
    // scheduled for later. So set isScheduled = false for the slides.
    self.updateScheduling();

    // Reset progress box.
    self.broadcastInfo(self.progressBar.resetBox());

    // If no slides are to be displayed, wait 5 seconds and restart.
    if (!self.slidesRemainToBeShown()) {
      self.$timeout.cancel(self.timeout);
      self.timeout = self.$timeout(self.restartShow, 5000);
    }
    else {
      // Show next slide. @TODO: or is it next channel?
      self.nextChannel();
    }
  };

  /**
   * Go to next channel
   *
   * Switch to the next channel or cycle to the first. S
   */
  Region.prototype.nextChannel = function nextChannel() {
    var self = this;

    // @TODO: Add info about the channel to the log? The message said nothing.
    self.itkLog.info("Next channel");

    self.channelKey++;

    // If more channels remain to be shown, go to next channel.
    var displayIndex = self.scope.displayIndex;
    var channelKeys = self.scope.channelKeys;
    if (self.channelKey < channelKeys[displayIndex].length) {
      var nextChannelIndex = channelKeys[displayIndex][self.channelKey];
      var nextChannel = self.scope.channels[displayIndex][nextChannelIndex];

      if (nextChannel.isScheduled) {
        self.scope.channelIndex = nextChannelIndex;
        self.scope.slideIndex = -1;

        self.nextSlide();
      }
      else {
        self.$timeout.cancel(self.timeout);

        // @TODO: Why the timeout and why 100ms? Is it fast or is it slow? It's
        //       "flash"...
        self.$timeout(nextChannel, 100);
      }
    }
    else {
      self.restartShow();
    }
  };

  /**
   * Set the next slide, and call displaySlide.
   */
  Region.prototype.nextSlide = function nextSlide() {
    var self = this;

    // @TODO: Please add information about what the next slide is.
    self.itkLog.info("Next slide");

    var nextSlideIndex = self.scope.slideIndex + 1;

    var displayIndex = self.scope.displayIndex;
    var channels = self.scope.channels;
    var channelIndex = self.scope.channelIndex;

    // If overlapping current channel.slides length
    if (!channels[displayIndex][channelIndex] || nextSlideIndex >= channels[displayIndex][channelIndex].slides.length) {
      // @TODO: But wait... nextChannel calls nextSlide? Is this safe?
      self.nextChannel();
      return;
    }

    // If slides array is empty, wait 5 seconds, try again.
    if (channels[displayIndex][channelIndex] === undefined || channels[displayIndex][channelIndex].slides.length <= 0) {
      self.$timeout.cancel(self.timeout);

      // @TODO: Why the timeout of 5 sek?
      self.timeout = self.$timeout(self.nextSlide, 5000);
    }
    else {
      // Get current slide.
      self.scope.slideIndex = nextSlideIndex;
      var currentSlide = channels[displayIndex][channelIndex].slides[displayIndex];

      // If slide is not scheduled,
      //   make sure a slide is scheduled, to be shown, then go to next slide.
      //   else wait 5 seconds and then go to next slide.
      // This is to avoid fast loop over slides that are not scheduled,
      //   when no slide are scheduled.
      if (!currentSlide.isScheduled) {
        if (self.slidesRemainToBeShown()) {
          // @TODO: More information on slide missing?
          self.itkLog.info('Slide schedule: slides remain.');
          self.nextSlide();
        }
        else {
          self.itkLog.info('Slide schedule: slides do not remain');

          // If no slide scheduled, wait 5 seconds, then restart show.
          self.$timeout.cancel(self.timeout);
          // @TODO: Why is this not assigned "timeout" as all the others? And why 5 sek?
          self.$timeout(function () {
            self.restartShow();
          }, 5000);
        }
      }
      // If the slide is scheduled, show it.
      else {
        self.displaySlide();
      }
    }
  };

  /**
   * Update which slides to show next.
   *
   * @param data
   *   @TODO: what is data?
   */
  Region.prototype.updateSlideShow = function updateSlideShow(data) {
    var self = this;
    // @TODO: Would be nice with comment about this mod magic? It is also found
    //        in resetShow()
    var otherDisplayIndex = (self.scope.displayIndex + 1) % 2;
    var id = "" + data.id;

    self.scope.channels[otherDisplayIndex][id] = angular.copy(data);
    self.scope.channelKeys[otherDisplayIndex] = Object.keys(self.scope.channels[otherDisplayIndex]);
    self.scope.slidesUpdated = true;
  };

  /**
   * Display the current slide.
   */
  Region.prototype.displaySlide = function displaySlide() {
    var self = this;

    // To be sure to be sure that the timeout is completed from the last slide.
    // @TODO:
    self.$timeout.cancel(self.timeout);

    // Reset the UI elements (Slide counter display x/y and progress bar).
    self.progressBar.next();

    var slide = self.scope.channels[self.scope.displayIndex][self.scope.channelIndex].slides[self.scope.slideIndex];
    if (slide === undefined) {
      self.itkLog.info('No slides yet... waiting 5 seconds');

      // Wait five seconds and try again.
      // @TODO: The magic 5 sek once more and why it this not assigned "timeout"
      //        variable?
      self.$timeout(function () {
       self.displaySlide();
      }, 5000);
      return;
    }

    // Call the run function for the given slide_type.
    window.slideFunctions[slide.js_script_id].run(slide, self);
  };

  /**
   * Region directive.
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

          scope.slideIndex = null;
          scope.channelIndex = null;
          scope.displayIndex = 0;

          // @TODO: Is these used in templates? If not why in scope.
          scope.running = false;
          scope.slidesUpdated = false;

          // Used by progress bar
          scope.progressBoxElements = 0;
          scope.progressBoxElementsIndex = 0;

          var progressBar = new ProgressBar(scope, itkLog);
          var region = new Region(scope, itkLog, progressBar, $timeout, $rootScope, $http, $interval, $sce);

          // @TODO: comment needed.
          region.broadcastInfo(0);

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
              region.updateSlideShow(channel.data);
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
                region.channelKey = -1;

                // Make sure the slides have been loaded. Then start the show.
                // @TODO: Yet another magic timeout value?
                $timeout(function () {
                  scope.slideIndex = -1;
                  scope.running = true;

                  // Mark channels and slides that should not be show as isScheduled = false
                  region.updateScheduling();

                  // Reset progress box
                  region.broadcastInfo(progressBar.resetBox());

                  region.nextChannel();
                }, 1000);
              });
            }
          });

          // Event handler for 'removeChannel' event.
          // Remove the channel from the next display array.
          $rootScope.$on('removeChannel', function removeChannelEvent(event, channel) {
            // @TODO: Would be nice with comment about this mod magic? Use 2 other place as well.
            var otherDisplayIndex = (scope.displayIndex + 1) % 2;
            var id = "" + channel.id;

            // If the channel is in the array, remove it.
            if (scope.channels[otherDisplayIndex].hasOwnProperty(id)) {
              delete scope.channels[otherDisplayIndex][id];
              scope.channelKeys[otherDisplayIndex] = Object.keys(scope.channels[otherDisplayIndex]);
              scope.slidesUpdated = true;
            }
          });
        },
        templateUrl: 'app/shared/region/region.html?' + window.config.version
      };
    }
  ]);
}).call(this);
