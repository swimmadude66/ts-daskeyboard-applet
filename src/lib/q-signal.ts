import * as request from 'request-promise'
import { Actions, ActionValue, Effects, IQPoint, Link, Origin, Signal, SignalOpts } from '../types'
import { logger } from './logger'

import { applicationConfig } from '../constants'
const backendUrl = applicationConfig.desktopBackendUrl
const signalEndpoint = backendUrl + '/api/2.0/signals'

const signalHeaders = {
  "Content-Type": "application/json"
}

/**
 * Class representing a single point to be sent to the device
 * @param {string} color - The hexadecimal RGB color to activate, e.g. '#FFCCDD'
 * @param {string} effect - The effect to activate. Enumerated in Effects. 
 *   Default is empty.
 */
export class QPoint implements IQPoint {
  constructor(public color: string, public effect = Effects.SET_COLOR) { }
}


/**
 * A signal to be sent to the Q-Desktop
 */
export class QDesktopSignal {
  /**
   * id of the signal. negative if it originated from localhost
   */
  id: number
  points: QPoint[][] = [[]]
  action: Actions = Actions.DRAW
  name: string = 'Q Desktop'
  message: string = ''
  data: any
  link: Link
  isMuted: boolean = true
  extensionId: string
  errors: string[]
  origin: Origin = {x: 0, y: 0}

  /**
   * 
   * @param {QPoint[][]} points A 2D array of QPoints expressing the signal
   * @param {*} options A JSON list of options
   */
  constructor(opts: SignalOpts) {
    Object.assign(this, opts)
  }

  static error(messages: string[] | {messages: string []}) {
    /* For background compatibility with the version 2.10.12
    * This version was taking an object in param: {
      applet: ..,
      messages: ..
    }
    */
    let errors = (messages as string[])
    if(messages && 'messages' in messages){
      errors = messages.messages
    }
    if (!Array.isArray(errors)) {
      errors = [errors]
    }
  
    return new QDesktopSignal({
      points: [
        []
      ],
      action: Actions.ERROR,
      errors,
    })
  }

  static async send(signal: Signal) {
    const actionValue: ActionValue[] = []
    const rows = signal.points
    rows.forEach((columns, y) => {
      columns.forEach((point, x) => {
        actionValue.push({
          zoneId: `${signal.origin.x + x},${signal.origin.y + y}`,
          effect: point.effect,
          color: point.color
        })
      })
    })
  
    const body = {
      action: signal.action,
      actionValue: JSON.stringify(actionValue),
      clientName: signal.extensionId,
      data: signal.data,
      link: signal.link,
      errors: signal.errors,
      isMuted: signal.isMuted,
      message: signal.message,
      name: signal.name,
      pid: "Q_MATRIX",
    }
  
    logger.debug("Posting to local service:" + JSON.stringify(body))
  
    return request.post({
      uri: signalEndpoint,
      headers: signalHeaders,
      body: body,
      json: true,
      resolveWithFullResponse: true
    }).then((response) => {
      logger.debug('Signal service responded with status: ' +
        response.statusCode)
      return response
    }).catch((err) => {
      const error = err.error
      if (error.code === 'ECONNREFUSED') {
        logger.error(`Error: failed to connect to ${signalEndpoint}, make sure` +
          ` the Das Keyboard Q software  is running`)
      } else {
        logger.error('Error sending signal ' + error)
      }
    })
  }

  static async delete(signal: QDesktopSignal | number | string) {
    const signalId = (signal instanceof QDesktopSignal ? signal.id : signal)
    return request.delete(`${signalEndpoint}/${signalId}`)
  }
}
