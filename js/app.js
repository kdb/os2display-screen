var ikApp = angular.module('ikApp', ['ngAnimate', 'angular.css.injector']).config(function($sceDelegateProvider) {
  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    // Allow loading from outer templates domain.
    window.config.backend.address + '**'
  ]);
});;