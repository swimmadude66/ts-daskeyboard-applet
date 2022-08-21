import * as moment from 'moment'
import * as winston from 'winston'

interface LoggerOps {
  winston: winston.LoggerOptions,
  level?: string
  filename?: string
}

const DEFAULT_LOGGER_OPTS: LoggerOps = {
  winston: {
    level: 'info',
    exitOnError: false
  },
  level: 'info'
}

export class Logger {

  private _logger: winston.Logger

  constructor(opts: LoggerOps = DEFAULT_LOGGER_OPTS) {
    this._logger = winston.createLogger(opts.winston)
    if (opts.filename) {
      this._logger.add(new winston.transports.File({
        filename: opts.filename,
        level: opts.level || 'info',
      }))
    } else {
      this._logger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: opts.level || 'info',
      }))
    }
  }

  debug(message: string) {
    message = moment().format('YYYY-MM-DD hh:mm:ss.ms') + ' ' + message
    this._logger.debug(message)
  }
  
  info(message: string) {
    message = moment().format('YYYY-MM-DD hh:mm:ss.ms') + ' ' + message
    this._logger.info(message)
  }
  
  error(message: string) {
    message = moment().format('YYYY-MM-DD hh:mm:ss.ms') + ' ' + message
    this._logger.error(message)
  }
  
  warn(message: string) {
    message = moment().format('YYYY-MM-DD hh:mm:ss.ms') + ' ' + message
    this._logger.warn(message)
  }
}

export const logger = new Logger()