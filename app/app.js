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

    'itkRegion',
    'itkDebug',
    'itkDateComponent'
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

    // Install raven.
    Raven.config('https://3fe788f3238540d1992baa3e37fcd0ff@app.getsentry.com/41232', {
      // pass along the version of your application
      release: '1.0.0'

      // we highly recommend restricting exceptions to a domain in order to filter out clutter
      //whitelistUrls: ['example.com/scripts/']
    }).install();


    $provide.decorator("$exceptionHandler", ['$delegate', function ($delegate) {
      return function (exception, cause) {
        $delegate(exception, cause);
        Raven.captureException(exception);
      };
    }]);
  });
