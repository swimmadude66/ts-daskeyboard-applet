import { Logger } from './logger'

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: unknown): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item))
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target: unknown, ...sources: unknown[]) {
  if (!(sources ?? []).length) {
    return target
  }
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source as Record<string, unknown>) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, {
          [key]: {}
        })
        mergeDeep(target[key], source[key])
      } else {
        Object.assign(target, {
          [key]: source[key]
        })
      }
    }
  }

  return mergeDeep(target, ...sources)
}

/**
 * Read the configuration from command line arguments. The first command line 
 * argument should be a JSON string.
 */
 export function readConfig(logger: Logger) {
  logger.debug(`I have ${process.argv.length} arguments: ` + JSON.stringify(process.argv))
  if (process.argv.length > 2) {
    try {
      const arg3 = process.argv[2]
      let config
      if (arg3.toUpperCase() === 'DEV') {
        logger.info("Configuring in dev mode...")
        if (process.argv.length > 3 && process.argv[3].startsWith('{')) {
          config = JSON.parse(process.argv[3])
          logger.info("Parsed dev config as: " + JSON.stringify(config))
        } else {
          logger.info("Generating minimal dev config.")
          config = minimalConfig()
        }
        logger.info("Generated dev configuration: " + config)
        config.devMode = true
      } else {
        config = JSON.parse(arg3)
      }
      return config
    } catch (error) {
      logger.error("Could not parse config as JSON: " + process.argv[2])
      return minimalConfig({})
    }
  } else {
    return minimalConfig()
  }
}

/**
 * Ensure a config object has the minimum requirements
 * @param {*} config 
 */
export function minimalConfig(config: Record<string, unknown> = {}) {
  config.applet = config.applet || {}
  config.defaults = config.defaults || {}

  return config
}