# TS Das Keyboard Applet API
The API for creating Applets that will run inside the Das Keyboard Q Desktop
environment.

# Installation
This module is installed via npm or yarn

```shell
npm i ts-daskeyboard-applet
```
---
# Getting Started
## Import the Q Applet API

![Import the library](assets/import.svg)

## Define your class
Define a class which extends `DesktopApp`, and expose a `run` method which returns a promise of type `Signal`

![Define your class](assets/define.svg)

## Instantiate it
At the bottom of your main file, remember to instantiate the class

![Instantiate your class](assets/instantiate.svg)

---

# DesktopApp functions
## run()
The `run()` method is the primary extension point. This method will be
  invoked at regular intervals. This method should do some work, and then
  return a Signal object.

If you throw an `Error` in this method, the extension host will transmit a signal to the Q Desktop with your error message in the body.

### Creating a signal within a callback function
There are cases when your `run()` function may have to use a callback. In that case, you can either return a promise or you can call the `signal()` function yourself.

---    

## applyConfig()
To read app configuration after initial processing, or after a configuration change, implement the `applyConfig` method. It will be called automatically whenever configuration id updated.

During this phase, you can also validate input. If you receive an invalid value, you can throw an `Error` with a relevant message.

*Important*: This method may fire automatically before user configuration is registered. Do not throw errors for missing values that may be provided later.

---

## Shutdown
If you need to perform any work before the Applet is closed, implement the `shutdown()` function. This function is called automatically before the app is stopped.

---

## Constructor
Do not use the constructor for any functionality or state that is related to the applet's configuration. The configuration may change as the applet is running. To update the applet's state based on configuration, extend the [`applyConfig()`](#applyConfig) method.

---

## options
`options()` is called with `fieldId` and `search` values when the app is presenting dropdown options from the questions in your `package.json`. Implement this method to provide a list of valid options for the specified field and search text.

---

# Creating Signals
Your applet communicates with the Das Keyboard Signal Center by returning
`Signal` objects. A `Signal` object includes a 2-D array of `Point` objects,
along with other optional information to be displayed when the zone is activated.

![Return a signal](assets/signals.svg)

## Signal options
The `Signal` class takes the following options in its constructor:

- `points`: A 2-D array of `Point` objects.
- `name`: Will be displayed as the title of any signal dialog.
- `message`: Detailed message that will be displayed within a signal dialog.
- `isMuted`: Boolean value. If set to `false`, the signal will invoke an on-screen notification.
- `action`: The action of the signal, typically `DRAW`. This is the default. Possible values are:
  - `DRAW`: Light a key until the signal is dismissed.
  - `ERROR`: The signal will relay an error message to the host service.
  - `FLASH`: The signal will cause the key(s) to flash.
- `errors`: In the case of an `ERROR` action, `errors` should contain an
  array of error messages.
- `link`: an object with a `url` and optional `label` to be shown in the dialog

## The Point Class
Each `Point` represents a single key and takes in a color in hex and optionally the effect to use on the key.

# Applet Configuration
The applet is configured with the following member variables:

## this.geometry
The geometry configuration is stored in an object on the base class. it can be read as a field or you can inspect the applet's geometry with these functions:
- `this.getWidth()`
- `this.getHeight()`
- `this.getOriginX()`
- `this.getOriginY()`

## this.authorization
Currently we support authorization by API Key or Basic Authentication. The authorization object is populated on the base class once configured.

## this.config
The config object is for any values that are specific to the application. This object is built by merging the default configuration values that are supplied in `package.json` with any user-supplied values that were input during applet installation.

## this.store
The `store` object is an instance of [node-localstorage](https://www.npmjs.com/package/node-localstorage). When running within the Q Desktop App, the storage file is located in the `~/.quio` directory. When
running from a command line, a file `local-storage.json` will be created. You should not commit a `local-storage.json` file to the repo, because it will be ignored unless running from a command line.

# Logging
Applets use the [winston](https://github.com/winstonjs/winston) logging system. Log files can be found in `~/.quio/v2/applet.log.json`. When running from a command line, logging will output to the console.

# Running an Applet in dev mode
You can run an applet in `dev mode` by invoking it via node, using the following syntax:

```shell
node <script name> dev '{ <config> }'
```

The config object is a combination of all of the configuration variables 
described in Applet Configuration. The format of the config object is:

- If you don't specify the geometry, the default is a 1x1 applet on the `Esc` key.

- You must have the Q Desktop application running in order for the keyboard to respond to any signals.

## Basic example:
`node index.js dev '{"applet":{"user": {"symbol": "AAPL"}}}'`

This will invoke the script at `index.js` , and the value of 
`this.config.symbol` will be `"AAPL"`.

## Specifying a geometry:
```shell
node index.js dev '{"applet":{"user": {"zoneId": "TXZ211"}}, "geometry": {"width": 4, "height": 1, "origin": {"x": 1, "y": 1}}}'
```

This example configures a `config.zoneId` of `"TXZ211"` and a geometry with `width: 4`, `height: 1`, origin of `(1,1)`.

## Specifying authorization:
```shell
node index.js dev '{"authorization": { "apiKey": "8f652e62a922ca351521ea0b89199de1067d3204" }}'
```

This example configures the applet such that `this.authorization.apiKey` has a valid value.

# Factory Reset
## Reset via the command line
- Quit the Q Desktop App
- Run the following commands: 
  ```shell
  rm -rf ~/.quio/v2/q_extensions
  rm -rf ~/.quio/v2/q_storage
  ```
- Restart the Q Desktop App
  
