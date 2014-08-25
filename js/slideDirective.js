/**
 * Directive to insert html for a slide.
 * @param ik-id: the id of the slide.
 * @param ik-width: the width of the slide.
 */
ikApp.directive('ikSlide', function() {
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
        scope.ikSlide.options.image = window.config.backend.address + scope.ikSlide.options.image;

        // Setup the inline styling
        scope.theStyle = {
          width: "100%",
          height: "100%",
          fontsize: scope.ikSlide.options.fontsize + "px"
        }

        scope.templateURL = '/ik-templates/' + scope.ikSlide.template + '/' + scope.ikSlide.template + '.html';
      });
    },
    template: '<div data-ng-include="" src="templateURL"></div>'
  }
});
