# Kodi Driver for NEEO

This is meant as a platform for "easy" customization and experimentation.

Based on the [driver](https://github.com/nklerk/neeo_driver-kodi) by **Niels de Klerk**

Kodi has a lot of features to cram into the NEEO remote. Whether you want a huge NEEO recipe with discrete buttons for every single Kodi action or a just simple recipe for music alone, it quickly gets tricky to navigate all the possibilities.
This driver aims to make it easier to try out different options and features.

Ultimately I hope to include several "devices" tailored for different profiles.

This driver is so far being tested with Nvidia Shield and OSMC Vero 2 devices.

## status

Widgets and buttons: Should be functionally complete. Just needs testing and tweaking.
Keymap: The code may be complete. I have only bothered to add the cursor keys. Adding more should be trivial.
Sensors: Images, labels switches and sliders are working. Currently I have just implemented those needed to try the new media player widget.
Directories: Basic functionality is working, and it's now quite easy to extend.
Image cache: It works, but it's not perfect. Just disable it if you have any issues.
Wake-on-LAN: The code should work, but I haven't really tested this.

### Improvements and Features

* Persistent configuration storage
* In-memory on-demand image resizing and caching web service
* Configuration is defined in a single file
* Buttons and commands are defined in a single file
* Keymap is in a single file (AKA Content-aware commands)

### Changes

* Changed out mDNS and WoL packages to align with existing neeo-sdk dependencies
* Lots of debugging info using debug channels
* Dual-transport API client
* Compartmentalized code for easier experimentation

### Caveats and Known Issues

* I don't have a PVR solution, so TV/Radio/PVR stuff is mostly guesswork on my part.
* Buttons included in button groups/widgets are implicitly added as discrete buttons, using their identifiers rather than label.
* This is really just a hack

### Wishlist

* More robust API connections (error handling, queueing, http/ws fallback etc.) - This is less of an issue after I added HTTP.
* Better image handling (NEEO seems to refuse loading some images)
* Smarter image scaling to avoid cropping
* Maybe UDP keystroke events for lower latency https://kodi.wiki/view/EventServer
* Probe function to test for correct API settings
* Update discovery text in case of wrong API settings
* Maybe a simple web GUI for customization
* Stop communication when recipes are inactive
* Separate devices for different profiles (Remote-only music player/radio etc.)
* More keymap entries

## HOWTO

The [original instructions](https://github.com/nklerk/neeo_driver-kodi/blob/master/README.md#getting-started) are still valid (mostly)

### Configuration

* Important settings are all in `lib/Config.js`
* Input mapping is done in `lib/kodiCommands.js`
* Keymap in in `lib/kodiCommands.js`
* Basic directory/library mapping is in `lib/KodiBrowserTree.js`

### Customization

Edit lib/kodiCommands.js to change input mapping. It defines 4 lists:
* commands: The master list of available commands. Copy the IDs you want to the "buttons" list below, to have them show up in NEEO.
* keymap: This translates commands depending on the active window in Kodi.
* button_groups: This lists the button groups (widgets) to be included in the driver. Comment out the ones you don't want.
* buttons:  This lists the individual buttons to be included in the driver. Copy IDs from "commands" to include the ones you want.

### Hacking

The driver outputs a lot of debugging info using the `debug` system. Each class has its own debug context plus a separate one for data.
For all debug info minus data, use `DEBUG=neeo-driver-kodi:*,-*:data`
The CLI and HTTP interfaces also expose some useful data.
A few NPM scripts are provided:
* showConfig - Dumps the contents of the configstore
* clearConfig - Clears the configstore
* discover - Runs the discovery process on its own
* cli - Attempt at an interactive debugging CLI
* web - Runs the HTTP interface on its own

#### Dependencies

* axios - HTTP client - Via NEEO
* bluebird - Promises implementation - Via NEEO
* bonjour - Zeroconf/mDNS - Via NEEO
* configstore - Persistent configuration storage
* debug - Debugging - Via NEEO
* dotProp - Dot-notation shortcut - Via configstore
* express - Web framework - Via NEEO
* neeo-sdk
* netmask - IP calculations
* receptacle - In-memory cache
* var_dump - Debugging
* wake_on_lan - WoL implementation
* ws - Websockets implementation
