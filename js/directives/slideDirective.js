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
        ikSlide: '='
      },
      link: function(scope, element, attrs) {
        // Observe for changes to the ik-id attribute. Setup slide when ik-id is set.
        attrs.$observe('ikSlide', function(val) {
          if (!val) {
            return;
          }

          // Only show first image in array.
          if (scope.ikSlide.media_type === 'image' && scope.ikSlide.media.length >= 0) {
            scope.ikSlide.currentImage = scope.ikSlide.media[0];
          }
          else if (scope.ikSlide.media_type === 'video' && scope.ikSlide.media.length > 0) {
            // Set current video variable to path to video files.
              console.log("debug");
              scope.ikSlide.currentVideo.mp4 = scope.ikSlide.media[0].mp4;
              scope.ikSlide.currentVideo.ogg = scope.ikSlide.media[0].ogv;
              scope.ikSlide.currentVideo.webm = scope.ikSlide.media[0].webm;
          }

          // Setup the inline styling
          scope.theStyle = {
            width: "100%",
            height: "100%",
            fontsize: scope.ikSlide.options.fontsize + "px"
          };

          cssInjector.add(scope.ikSlide.css_path);
        });
      },
      template: '<div data-ng-include="" src="ikSlide.template_path"></div>'
    };
  }
]);
