# ITK Logger module
version 1.0.0

## Setup
* Include stacktrace.js (https://github.com/stacktracejs/stacktrace.js) to the site. Tested with 0.6.4.
* Change relevant values in itkLogConfig.js.
* Include first itkLogConfig.js and then itkLog.js in your website.

## Log all js errors
Add the following config to the module.

<pre>
.config(function($provide) {
  'use strict';

  $provide.decorator("$exceptionHandler", ['$delegate', function ($delegate) {
    return function (exception, cause) {
      $delegate(exception, cause);
    };
  }]);
});
</pre>

## Log levels
Available log levels

* all
* error
* none
