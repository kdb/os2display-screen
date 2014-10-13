/**
 * Defines the Angular Application.
 *
 * Dependency:
 *   A angularJS service to load dynamically CSS files. The original name of this
 *   project was angularDynamicStylesheets.
 */
var ikApp = angular.module('ikApp', ['ngAnimate', 'angular.css.injector']).config(function($sceDelegateProvider) {
  "use strict";

  // The administration interface and the client code do not run on the same
  // domain/sub-domain hence we need to whitelist the domains to load slide
  // templates and CSS form the administration domain.
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // Allow loading from outer templates domain.
    window.config.backend.address + '**'
  ]);
});
