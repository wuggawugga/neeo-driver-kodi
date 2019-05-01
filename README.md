# Kodi Driver for NEEO

Based on the driver by **Niels de Klerk** [Github](https://github.com/nklerk/)

This driver will discover Kodi instances via mDNS and create NEEO devices for each one.
This is currently done in two stages, either run the driver twice or use discover script first.

# Changes

* Switched mDNS library to bonjour to align with neeo-sdk
* Removed auth, since it's not needed for websocket or TCP transports
* Removed MAC code, since it's not needed
* Added persistent storage
* Moved most of the output to debug instead of console

# Improvements and Features

* All the input mapping is in a single file, to make customizing straightforward.

# Caveats and Known Issues

* PVR functions are mostly guesswork
* Buttons included in button groups/widgets are implicitly listed as separate buttons, using their identifies rather than labels

# TODO

* Add probe function to test for correct API settings
* Update discovery text in case of wrong API settings
