/**
 * @file
 * Directive to insert html for a slide.
 *
 * @param ik-id: the id of the slide.
 * @param ik-width: the width of the slide.
 */
ikApp.directive('ikSlide', function() {
  "use strict";

  return {
    restrict: 'E',
    scope: true,
    link: function(scope, element, attrs) {
      scope.templateURL = '';

      // Observe for changes to the ik-id attribute. Setup slide when ik-id is set.
      attrs.$observe('ikIndex', function(val) {
        if (!val) {
          return;
        }

        scope.ikSlide = scope.slides[val];

        if (!scope.ikSlide) {
          return;
        }

        // Only show first image in array.
        if (scope.ikSlide.media_type === 'image' && scope.ikSlide.media.length >= 0) {
          scope.ikSlide.currentImage = scope.ikSlide.media[0];
        }
        else if (scope.ikSlide.media_type === 'video') {
          // Set current video variable to path to video files.
          scope.ikSlide.currentVideo = {
            "mp4": scope.ikSlide.media[0].mp4,
            "ogg": scope.ikSlide.media[0].ogg,
            "webm": scope.ikSlide.media[0].webm
          };
        }

        // Setup the inline styling
        scope.theStyle = {
          width: "100%",
          height: "100%",
          fontsize: scope.ikSlide.options.fontsize + "px"
        };
      });
    },
    template: '<div data-ng-include="" src="ikSlide.template_path"></div>'
  };
});
