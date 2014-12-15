/**
 * @file
 * Contains the slide directive.
 */

"use strict";

/**
 * Directive to insert html for a slide.
 *
 * @param ik-id: the id of the slide.
 * @param ik-width: the width of the slide.
 */
ikApp.directive('ikSlide', ['cssInjector',
  function(cssInjector) {
    return {
      restrict: 'E',
      scope: {
        ikSlide: '=',
        ikArrayId: '=',
        ikIndex: '=',
        ikShow: '='
      },
      link: function(scope, element, attrs) {
        // Last time the slide was refreshed.
        var lastRefresh = 0;

        // Return af new refreshed source, with a 30 seconds interval.
        scope.ikSlide.getRefreshedSource = function() {
          if (scope.ikShow) {
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
        attrs.$observe('ikArrayId', function(val) {
          if (!val) {
            return;
          }

          // Generate unique id for slide.
          scope.ikSlide.uniqueId = scope.ikArrayId + '-' + scope.ikIndex;
        });

        // Observe for changes to the ik-id attribute. Setup slide when ik-id is set.
        attrs.$observe('ikSlide', function(val) {
          if (!val) {
            return;
          }

          // Only show first image in array.
          if (scope.ikSlide.media_type === 'image' && scope.ikSlide.media.length >= 0) {
            scope.ikSlide.currentImage = scope.ikSlide.media[0].image;
          }
          else if (scope.ikSlide.media_type === 'video') {
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
            fontsize: scope.ikSlide.options.fontsize + "px"
          };

          // Inject stylesheet.
          cssInjector.add(scope.ikSlide.css_path);
        });

        // Cleanup videojs when slide is removed.
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
