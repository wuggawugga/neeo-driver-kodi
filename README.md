# Kodi Driver for NEEO

This is meant as a platform for "easy" customization and experimentation.

Based on the driver by **Niels de Klerk** [Github](https://github.com/nklerk/neeo_driver-kodi)

### Improvements and Features

* Persistent storage
* Image resizing and caching web service
* All input mapping is in a single file, to make customizing straightforward.
* Compartmentalized code for easier experimentation

### Changes

* Switched mDNS library to bonjour to align with neeo-sdk
* Switched WoL library to wake_on_lan
* Moved most of the output to debug instead of console

### Caveats and Known Issues

* PVR functions are mostly missing or just plain guesswork, since I don't have one.
* Buttons included in button groups/widgets are implicitly added as separate buttons, using their identifiers rather than label.
* This is really just a hack

### Wishlist

* Probe function to test for correct API settings
* Update discovery text in case of wrong API settings
* Maybe a simple web GUI for customization
* Stop communication when recipes are inactive
* Smarter image scaling to avoid cropping
* Separate devices for different profiles (Remote-only music player/radio etc.)
* Lyrics text

## HOWTO

The [original instructions](https://github.com/nklerk/neeo_driver-kodi/blob/master/README.md#getting-started) are still valid (mostly)

### Configuration

* Important settings are all in lib/Configstore.js
* Input mapping is done in lib/kodiCommands.js
* Directory/library mapping is in lib/KodiBrowserTree.js

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

* axios - NEEO dependency - HTTP client
* bluebird - NEEO dependency - Promises implementation
* bonjour - NEEO dependency - Zeroconf/mDNS
* configstore - Persistent configuration storage
* debug - NEEO dependency - Debugging
* express - NEEO dependency - Web framework
* neeo-sdk
* netmask - IP calculations
* receptacle - In-memory cache
* var_dump - Debugging
* wake_on_lan - WoL implementation
* ws - Websockets implementation
