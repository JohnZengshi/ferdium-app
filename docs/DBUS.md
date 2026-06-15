# D-Bus interface

Aitalk exposes an inter-process communication on Linux systems via [D-Bus](https://www.freedesktop.org/wiki/Software/dbus/).
This allows integrating Aitalk with your desktop environment by displaying the number of unread notifications in a status area and muting or unmuting notations.

## Desktop integration

As an example integration, the [`docs/dbus`](dbus) folder contains a module for status bars written in Python.
To run the example, you'll need Python 3.11 and the [`dbus-next`](https://pypi.org/project/dbus-next/) PyPI package.

The integration uses the [`ferdium-dbus-py`](https://github.com/victorbnl/ferdium-dbus-py) client library, which is an asynchronous wrapper over the D-Bus interface.
It illustrates multiple advanced concepts, such as asynchronous communication with Aitalk via `asyncio` and polling the session D-Bus to see if Aitalk is running.

The [`ferdium_bar.py`](dbus/ferdium_bar.py) implements a bar module to use with status bars such as waybar or polybar. See `ferdium_bar.py --help` and `ferdium_bar.py unread --help` for further indications on how to use it.

## Low-level API

The low-level API exposed over D-Bus is documented in [`org.aitalk.Aitalk.xml`](dbus/org.aitalk.Aitalk.xml) with standard D-Bus introspection syntax.

Aitalk will take ownership of the bus name `org.aitalk.Aitalk` and expose and object implementing the `org.aitalk.Aitalk` interface at the object path `/org/aitalk`.
