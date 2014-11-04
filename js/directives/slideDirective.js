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
ikApp.directive('ikSlide', ['cssInjector', '$timeout',
  function(cssInjector, $timeout) {
    return {
      restrict: 'E',
      scope: {
        ikSlide: '=',
        ikArrayId: '=',
        ikIndex: '='
      },
      link: function(scope, element, attrs) {
        scope.initializeVideo = function initializeVideo() {
          scope.ikSlide.videojs =videojs('videoPlayer' + scope.ikSlide.uniqueId, {
            "controls": false,
            "autoplay": false,
            "preload": "auto"
          });
        };

        attrs.$observe('ikArrayId', function(val) {
          scope.ikSlide.uniqueId = scope.ikArrayId + '-' + scope.ikIndex + '-' + scope.ikSlide.id;
        });

        // Observe for changes to the ik-id attribute. Setup slide when ik-id is set.
        attrs.$observe('ikSlide', function(val) {
          if (!val) {
            return;
          }

          // Only show first image in array.
          if (scope.ikSlide.media_type === 'image' && scope.ikSlide.media.length >= 0) {
            scope.ikSlide.currentImage = scope.ikSlide.media[0];
          }
          else if (scope.ikSlide.media_type === 'video') {
            // Set current video variable to path to video files.
            scope.ikSlide.currentVideo = {
              "mp4": scope.ikSlide.media.mp4,
              "ogg": scope.ikSlide.media.ogv,
              "webm": scope.ikSlide.media.webm
            };
          }

          scope.ikSlide.currentLogo = scope.ikSlide.logo;

          // Setup the inline styling
          scope.theStyle = {
            width: "100%",
            height: "100%",
            fontsize: scope.ikSlide.options.fontsize + "px"
          };

          cssInjector.add(scope.ikSlide.css_path);

          $timeout(function() {
            if (scope.ikSlide.media_type === 'video' && !scope.ikSlide.videojs) {
              scope.initializeVideo();
            }
          }, 1000);
        });

        scope.$on('$destroy', function() {
          if (scope.videojs) {
            scope.videojs.dispose();
          }
        });
      },
      template: '<div data-ng-include="" src="ikSlide.template_path"></div>'
    };
  }
]);
