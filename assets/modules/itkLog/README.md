# ITK Logger module
version (1): 1.0.0

## Setup
* Include stacktrace.js (https://github.com/stacktracejs/stacktrace.js) to the site. Tested with 0.6.4.
* Include the itkLog.js in the site.
* Add "itkLog" to the global window.config object.

## Log all js errors
Add the following config to the global window.config variable:

<pre>
  "itkLog": {
    "version": "1",
    "errorCallback": null,
    "logToConsole": true,
    "logLevel": "all"
  }
</pre>

## Log levels
Available log levels

* all
* error
* none
