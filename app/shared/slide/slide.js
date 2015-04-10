/**
 * @file
 * Contains the slide directive.
 */

/**
 * Directive to insert html for a slide.
 *
 * html parameters
 *   ik-slide (object): The slide to display (This is the variable name used in the
 *     templates, so to change this name would require that names throughout
 *     the backend and templates folder should also be changed).
 *   show (boolean): Should the slide be visible?
 *   ---- used for creation unique slide-id ----
 *   array-id (integer): The which displayIndex does this slide belong to?
 *   channel-id (integer): What channel does the slide belong to?
 *   index (integer): Which index in the channel does that slide have?
 *   region (integer): Which region does the slide belong to?
 *   ---- used for creation unique slide-id ----
 */
angular.module('ikApp').directive('slide', ['cssInjector',
  function(cssInjector) {
    'use strict';

    return {
      restrict: 'E',
      scope: {
        ikSlide: '=',
        show: '=',
        arrayId: '=',
        channelId: '=',
        index: '=',
        regionId: '=',
        scale: '='
      },
      link: function(scope, element, attrs) {
        // Last time the slide was refreshed.
        var lastRefresh = 0;

        // Return af new refreshed source, with a 30 seconds interval.
        scope.ikSlide.getRefreshedSource = function() {
          if (scope.show) {
            var date = (new Date()).getTime();
            if (date - lastRefresh > 30000) {
              lastRefresh = date;
            }
          }

          // Make sure path parameters are not overridden.
          if (scope.ikSlide.options.source.indexOf('?') > 0) {
            return scope.ikSlide.options.source + "&ikrefresh=" + lastRefresh;
          }
          else {
            return scope.ikSlide.options.source + "?ikrefresh=" + lastRefresh;
          }
        };

        // Observe for changes to ik-array-id attribute. Set unique id.
        attrs.$observe('arrayId', function(val) {
          if (!val) {
            return;
          }

          // Generate unique id for ikSlide.
          scope.ikSlide.uniqueId = '' + scope.regionId + '-' + scope.arrayId + '-' + scope.channelId + '-' + scope.index;
        });

        // Observe for changes to the ikSlide attribute. Setup ikSlide when set.
        attrs.$observe('ikSlide', function(val) {
          if (!val) {
            return;
          }

          // Only show first image in array.
          if (scope.ikSlide.media_type === 'image' && scope.ikSlide.media.length > 0) {
            scope.ikSlide.currentImage = scope.ikSlide.media[0].image;
          }
          else if (scope.ikSlide.media_type === 'video' && scope.ikSlide.media.length > 0) {
            // Set current video variable to path to video files.
            scope.ikSlide.currentVideo = {
              "mp4": scope.ikSlide.media[0].mp4,
              "ogg": scope.ikSlide.media[0].ogv,
              "webm": scope.ikSlide.media[0].webm
            };
          }

          // Set currentLogo.
          scope.ikSlide.currentLogo = scope.ikSlide.logo;

          // Setup the inline styling
          scope.theStyle = {
            width: "100%",
            height: "100%",
            fontsize: scope.ikSlide.options.fontsize * (scope.scale ? scope.scale : 1.0)+ "px"
          };

          if (scope.ikSlide.options.responsive_fontsize) {
            scope.theStyle.responsiveFontsize = scope.ikSlide.options.responsive_fontsize * (scope.scale ? scope.scale : 1.0)+ "vw";
          }

          // Inject stylesheet.
          cssInjector.add(scope.ikSlide.css_path);
        });

        // Cleanup videojs when ikSlide is removed.
        scope.$on('$destroy', function() {
          if (scope.ikSlide.videojs) {
            scope.ikSlide.videojs.dispose();
          }
        });
      },
      template: '<div data-ng-include="" src="ikSlide.template_path"></div>'
    };
  }
]);
