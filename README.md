Indholdskanalen Client
======

## Introduction
This is a javascript client for Indholdskanalen.

## FAQ

### Large files do not get cached in the browser
Browsers have a max cache file size set. 

E.g. Firefox has the "browser.cache.disk.max_entry_size" that can be changed to increase the limit on file sizes that are cached.

Likewise, there is a parameter for increasing total cache size.

So if this is an issue, look into how to set these parameters.