# Kodi driver for NEEO

Based on the driver by **Niels de Klerk** [Github](https://github.com/nklerk/)

This driver will discover Kodi instances via mDNS and create NEEO devices for each one.
This is currently done in two stages, either run the driver twice or use discover script first.

# Changes

* Switched mDNS library to bonjour to align with neeo-sdk
* Removed auth stuff, since it's not needed for websocket access
* Added persistent storage

# TODO

* Add probe function to test for correct API settings
* Update discovery text in case of wrong API settings
