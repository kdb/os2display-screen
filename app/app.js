/**
 * Defines the Angular Application.
 *
 * Dependency:
 *   A angularJS service to load dynamically CSS files. The original name of this
 *   project was angularDynamicStylesheets.
 */
angular.module('ikApp', [
    'ngAnimate',
    'angular.css.injector',

    'itkLog',

    'itkRegion',
    'itkDateComponent',
    'itkKeypress'
  ]
).config(function ($sceDelegateProvider) {
    'use strict';

    // The administration interface and the client code do not run on the same
    // domain/sub-domain hence we need to whitelist the domains to load slide
    // templates and CSS form the administration domain.
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      // Allow loading from outer templates domain.
      '**'
    ]);
  }).config(function($provide) {
    'use strict';

    $provide.decorator("$exceptionHandler", ['$delegate', function ($delegate) {
      return function (exception, cause) {
        $delegate(exception, cause);
      };
    }]);
  });
