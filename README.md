Indholdskanalen Client
======

## Introduction
This is a javascript client for Indholdskanalen.

## Directory structure
<pre>
app/         - contains the angular code and templates.

app/pages/   - code and templates related to a "page" in the angular app

app/shared/  - code and templates that are reused across "pages"

assets/      - contain external libraries, css, images

index.html   - entry point for the app.

logout.html  - deletes the cookie and reloads page.
</pre>

## Flow
<pre>
1. The index.html loads all resources starts the indexController.
2. The indexController starts the socket.js which sets up the connection with the middleware.
     * if there exists a token in the cookie the connection is resumed with this token.
     * else the activation page is shown where the screen is activated
3. After the screen is activated, it receives the data for the screen (template and options),
   and the channels for the given screen.
4. The screen template is loaded from the backend. This contains a number of regions.
5. Each region has an id.
6. When a channel is received it is emitted with the 'addChannel' event.
7. Each region receives this event. If the channel.region matches the region the channel is added. If not it is removed if it exists.
8. Each region contains a number of channels that are looped. Each channel contains a number of slides which are displayed one at a time.
</pre>

## FAQ

### Large files do not get cached in the browser
Browsers have a max cache file size set. 

E.g. Firefox has the "browser.cache.disk.max_entry_size" that can be changed to increase the limit on file sizes that are cached.

Likewise, there is a parameter for increasing total cache size.

So if this is an issue, look into how to set these parameters.
