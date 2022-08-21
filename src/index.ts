import * as request  from 'request-promise'

import { Storage } from './lib/storage'
import { logger }  from './lib/logger'
import { QDesktopSignal, QPoint } from './lib/q-signal'
import { minimalConfig, readConfig, mergeDeep } from './lib/utility'

import { applicationConfig } from './constants'
import { Actions, AppletConfig, Geometry, RootConfig, Signal, OAuth2ProxyRequestOpts, OptionResponse, Authorization } from './types'

const defaultOAuth2ProxyUrl = process.env.oAuth2ProxyBaseUrlDefault ||
  applicationConfig.oAuth2ProxyBaseUrlDefault

const defaultPollingInterval: number = 60000 * 5 // 5 min in millis
const maxSignalLogSize = 100

/**
 * The base class for apps that run on the Q Desktop
 */
class QDesktopApp {
  configured: boolean = false

  pollingBusy: boolean = false
  paused: boolean = false
  devMode: boolean = false

  pollingInterval = defaultPollingInterval
  oAuth2ProxyBaseUrlDefault = defaultOAuth2ProxyUrl

  signalLog = []
  errorState
  rootConfig: RootConfig
  config: AppletConfig

  extensionId: string
  geometry: Geometry
  authorization?: Authorization

  store: Storage

  private _configPromise: {
    promise: Promise<boolean>
    resolve: (boolean) => void
  }

  private _pollInterval

  constructor() {
    logger.info('CONSTRUCTING APPLET')

    process.on('SIGINT', async (message) => {
      logger.info("Got SIGINT, handling shutdown...")
      await this.shutdown()
      process.exit()
    })

    process.on('disconnect', async (message) => {
      logger.info("Got DISCONNECT, handling shutdown...")
      await this.shutdown()
      process.exit()
    })

    process.on('exit', async (message) => {
      logger.info("Got EXIT, handling shutdown...")
      await this.shutdown()
      process.exit()
    })

    process.on('message', (m) => this.handleMessage(JSON.parse(m as string)))

    try {
      this.processConfig()
    } catch (error) {
      logger.error(`Error while processing config: ${error}`)
      throw error
    }
    logger.debug("Constructor finished.")

    if (this.devMode) {
      logger.info("Starting in dev mode...")
      this.start()
    }
  }

  /**
   * Process the config JSON, placing the relevant parts where they belong
   * @param {*} config 
   */
  async processConfig(config?: RootConfig) {
    this.configured = false
    this.rootConfig = Object.freeze(minimalConfig(config ? config : readConfig(logger))) as RootConfig
    logger.debug("Constructing app with ROOT config: " + JSON.stringify(this.rootConfig))

    this.devMode = !!this.rootConfig.devMode

    this.extensionId = this.rootConfig.extensionId
    const applet = this.rootConfig.applet || {}
    this.config = Object.freeze(mergeDeep({}, applet.defaults || {}, applet.user || {}))

    this.authorization = Object.freeze(this.rootConfig.authorization || {})
    const geometry = this.rootConfig.geometry || {
      height: 1,
      width: 1,
      origin: {
        x: 1,
        y: 1,
      }
    }
    this.geometry = Object.freeze(geometry)

    let storageLocation = this.rootConfig.storageLocation || 'local-storage'
    this.store = new Storage(storageLocation)

    try {
      await this.applyConfig()
      this.markConfigured()
      return true
    } catch (error) {
      logger.error(`Error while running applyConfig() against instance ${error}`)
      throw error
    }
  }

  /**
   * Postprocess the configuration for internal needs of the app. This must
   * return a truthy value or throw an error.
   */
  async applyConfig() {
    return true
  }

  async handleMessage(message: any) {
    logger.info("CHILD Received JSON message: " + JSON.stringify(message))
    const data = message.data || {}
    const type = data?.type
    logger.info("Message type: " + type)
    switch (type) {
      case 'CONFIGURE': {
        logger.info("Reconfiguring: " + JSON.stringify(data.configuration))
        const newConfig = Object.freeze(data.configuration)
        this.processConfig(newConfig)
        .then((_) => {
          logger.info("Configuration was successful")
          const result = JSON.stringify({
            status: 'success',
            data: {
              type: 'CONFIGURATION_RESULT',
              result: newConfig + ''
            }
          })
          logger.info("Sending result: " + result)
          process.send(result)
        }).catch((error) => {
          logger.error("Configuration had error: " + error)
          const result = JSON.stringify({
            status: 'error',
            data: {
              type: 'CONFIGURATION_RESULT',
            },
            message: error + ''
          })
          logger.info("Sending result: " + result)
          process.send(result)
        })
        break
      }
      case 'FLASH': {
        logger.info("Got FLASH")
        this.handleFlash()
        break
      }
      case 'OPTIONS': {
        logger.info("CHILD Handling " + type)
        const options = await this.options(data?.fieldName, data?.search)
        logger.info("CHILD returned options.")
        const response = {
          status: 'success',
          data: {
            type: 'OPTIONS',
            options: options
          }
        }
        process.send(JSON.stringify(response))
        break
      }
      case 'PAUSE': {
        logger.info("Got PAUSE")
        this.paused = true
        break
      }
      case 'POLL': {
        logger.info("Got POLL")
        this.poll(true)
        break
      }
      case 'START': {
        logger.info("Got START")
        if (this.paused) {
          this.paused = false
          this.poll()
        } else {
          this.start()
        }
        break
      }
      default: {
        logger.error("Don't know how to handle JSON message of type: '" + type + "'")
      }
    }
  }

  /**
   * Send a signal to the local Das Keyboard Q Service.
   * @param {Signal} signal 
   */
  async signal(signal: Signal) {
    signal.extensionId = this.extensionId
    if (!this.geometry || !this.geometry.origin) {
      const message = "Geometry is not properly defined:" + this.geometry
      logger.error(message)
      throw new Error(message)
    } else {
      signal.origin = this.geometry.origin
      const height = this.getHeight()
      const width = this.getWidth()

      // trim the points so it can't exceed the geometry
      signal.points = signal.points.slice(0, height)
      const rows = signal.points
      for (let i = 0; i < rows.length; i += 1) {
        rows[i] = rows[i].slice(0, width)
      }

      /*
       * If the signal is an error, populate the applet with RED points
       */
      if (signal.action === 'ERROR') {
        signal.points = []
        for (let i = 0; i < height; i++) {
          const t = []
          for (let j = 0; j < width; j++) {
            t.push(new QPoint('#FF0000'))
          }
          signal.points.push(t)
        }
      }

      return QDesktopSignal.send(signal)
      .then((result) => {
        signal.id = result.body.id

        // add the new signal to the begining of the signal log array
        this.signalLog.unshift({
          signal,
          result,
        })

        // remove the oldest signal logs
        while (this.signalLog.length > maxSignalLogSize) {
          this.signalLog.pop()
        }

        return result
      })
    }
  }

  /**
   * Send error signal to the desktop
   * @param {Array<string>} messages 
   */
  async signalError(messages: string[]) {
    return this.signal(QDesktopSignal.error(messages))
  }

  /**
   * Schedules the run() function at regular intervals. Currently set to a 
   * constant value, but may become dynamic in the future.
   * @param {boolean} force Forces a poll even if paused or busy
   */
  async poll(force: boolean = false) {
    if (!force && this.paused) {
      logger.info('no op for pause')
      // no-op, we are paused
    } else if (!force && this.pollingBusy) {
      logger.info("Skipping run because we are still busy.")
    } else {
      this.pollingBusy = true
      return this.run()
      .then((signal) => {
        this.errorState = null
        this.pollingBusy = false

        if (signal) {
          return this.signal(signal)
        }
      }).catch((error) => {
        this.errorState = error
        logger.error(
          "Applet encountered an uncaught error in its main loop" + error)
        this.signalError([`${error}`])
        this.pollingBusy = false
      })
    }
  }

  /**
   * The entry point for the app. Currently only launches the polling function,
   * but may do other setup items later.
   */
  start() {
    this.paused = false
    this.awaitConfigured()
    .then((_) => {
      if (this._pollInterval) {
        clearInterval(this._pollInterval)
        this._pollInterval = undefined
      }

      this.poll()

      this._pollInterval = setInterval(() => {
        this.poll()
      }, this.pollingInterval)
    })
  }

  private markConfigured() {
    if (this._configPromise) {
      this._configPromise.resolve(true)
      this._configPromise = undefined
    }
    this.configured = true
  }

  private async awaitConfigured() {
    if (this.configured) {
      return true
    }
    if (this._configPromise) {
      return this._configPromise.promise
    }
    let resolve
    const promise = new Promise<boolean>((res) => {
      resolve = res
    })
    this._configPromise = {
      promise,
      resolve
    }

    return promise
  }

  /**
   * This method is called once each polling interval. This is where most
   * of the work should be done.
   */
  async run(): Promise<Signal> | null {
    // Implement this method and do some work here.
    return null
  }


  /**
   * The extension point for any activities that should
   * take place before shutting down.
   */
  async shutdown() {
    return null
  }

  /**
   * Given an (optional) fieldName, return the valid options for that field
   * name. This is used to generate a UI to allow the user to configure the
   * applet. If the applet only has one option, you can ignore the fieldName.
   * @param {string} fieldName the field for which options are being requested
   * @param {string} search search terms, if any 
   * @returns {Object} an array of [{id, value} objects]
   */
  async options(fieldName?: string, search?: string): Promise<OptionResponse[]> {
    return null
  }

  /**
   * Get the applet's configured width.
   * @returns the width
   */
  getWidth(): number {
    return this.geometry.width
  }

  /**
   * Get the applet's configured height.
   * @returns the height
   */
  getHeight(): number {
    return this.geometry.height
  }

  /**
   * Get the applet's configured X origin.
   * @returns the X origin
   */
  getOriginX(): number {
    return this.geometry.origin.x
  }

  /**
   * Get the applet's configured Y origin.
   * @returns the Y origin
   */
  getOriginY(): number {
    return this.geometry.origin.y
  }

  async handleFlash(): Promise<any> {
    const width = this.getWidth()
    const height = this.getHeight()

    const row = new Array<QPoint>(width).fill(new QPoint('#000000'))
    const points = new Array<QPoint[]>(height).fill(row)

    const flash = new QDesktopSignal({
      points: points,
      action: Actions.FLASH,
      isMuted: false,
      origin: {
        x: this.getOriginX(),
        y: this.getOriginY(),
      },
    })

    logger.info("Flashing with signal: " + JSON.stringify(flash))
    return QDesktopSignal.send(flash)
    .then(() => {
      // send the latest signal
      const latestSignalLog = this.signalLog[0]
      if (latestSignalLog) {
        return QDesktopSignal.send(latestSignalLog.signal)
      }
    })
  }


  /**
   * Send a request through an OAuth2 Proxy to protect client key and secret
   * @param {*} proxyRequest 
   * @deprecated will be removed in July 2019, use Oauth2ProxyRequest class method
   * instead : `performOauth2ProxyRequest`
   */
  async oauth2ProxyRequest(proxyRequest: any) {
    const options = {
      method: 'POST',
      uri: this.oAuth2ProxyBaseUrlDefault + `/proxy`,
      body: proxyRequest,
      json: true
    }

    logger.info("Proxying OAuth2 request with options: " +
      JSON.stringify(options))

    return request(options).catch((error) => {
      logger.error(`Error while sending proxy request: ${error}`)
      throw error
    })
  }


}

/**
 * A request to be proxied via an Oauth2 Proxy
 */
export class Oauth2ProxyRequest {
  apiKey: string
  uri: string
  qs: string
  method: string = 'GET'
  contentType: string = 'application/json'
  body: any

  constructor(opts: OAuth2ProxyRequestOpts ) {
    Object.assign(this, opts)
  }

  /**
   * Send a request through an OAuth2 Proxy to protect client key and secret
   */
  async performOauth2ProxyRequest() {
    const options = {
      method: 'POST',
      uri: defaultOAuth2ProxyUrl + `/proxy`,
      body: this,
      json: true
    }

    logger.info("Proxying OAuth2 request with options: " +
      JSON.stringify(options))

    return request(options).catch((error) => {
      logger.error(`Error while sending proxy request: ${error}`)
      throw error
    })
  }

  /**
   * Get an Oauth2 access token from the proxy
   */
  async getOauth2ProxyToken() {
    const options = {
      method: 'GET',
      uri: defaultOAuth2ProxyUrl + `/token`,
      qs: {
        apiKey: this.apiKey
      },
      json: true
    }
    logger.info(`Getting OAuth2 access token from proxy with options: ${JSON.stringify(options)}`)

    return request(options).catch((error) => {
      logger.error(`Error while getting access token from proxy: ${error}`)
      throw error
    })
  }

  /**
   * Refresh an Oauth2 access token from the proxy
   */
  async refreshOauth2AccessToken() {
    const options = {
      method: 'GET',
      uri: defaultOAuth2ProxyUrl + `/refresh_my_access_token`,
      qs: {
        apiKey: this.apiKey
      },
      json: true
    }
    logger.info(`Refreshing OAuth2 access token from proxy with options: ${JSON.stringify(options)}`)

    return request(options).catch((error) => {
      logger.error(`Error while refresshingaccess token from proxy: ${error}`)
      throw error
    })
  }

  /**
   * Get the applet Oauth2 Client payload from the proxy
   */
  async getOauth2ProxyClientPayload() {
    const options = {
      method: 'GET',
      uri: defaultOAuth2ProxyUrl + `/applet_payload`,
      qs: {
        apiKey: this.apiKey
      },
      json: true
    }
    logger.info(`Getting OAuth client payload from proxy with options: ${JSON.stringify(options)}`)

    return request(options).then(body => body.payload).catch((error) => {
      logger.error(`Error while getting OAuth client payload from proxy: ${error}`)
      throw error
    })
  }
}

export {
  applicationConfig as hostConfig,
  logger,
  QDesktopApp as DesktopApp,
  QPoint as Point,
  QDesktopSignal as Signal,
}

export * from './types'