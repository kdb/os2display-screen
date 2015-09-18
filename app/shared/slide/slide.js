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
        scope.ikSlide.uniqueId = null;

        // Observe for changes to ik-array-id attribute. Set unique id.
        attrs.$observe('regionId', function(val) {
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

          if (scope.ikSlide.js_path && scope.ikSlide.slide_type && !window.slideFunctions[scope.ikSlide.slide_type]) {
            $.getScript(scope.ikSlide.js_path, function() {
              window.slideFunctions[scope.ikSlide.slide_type].setup(scope.ikSlide, scope);
            });
          } else {
            if (scope.ikSlide.slide_type) {
              window.slideFunctions[scope.ikSlide.slide_type].setup(scope.ikSlide, scope);
            }
            else {
              window.slideFunctions['null'].setup(scope.ikSlide, scope);
            }
          }

          // Inject stylesheet.
          cssInjector.add(scope.ikSlide.css_path);
        });
      },
      template: '<div data-ng-include="ikSlide.template_path"></div>'
    };
  }
]);
