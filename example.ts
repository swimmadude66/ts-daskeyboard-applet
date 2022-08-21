import {logger, DesktopApp, Point, Effects, Signal} from './src'

export class QExample extends DesktopApp {

  async run() {
    // we always return a 2D array of points, but we only need
    // one row in this case.
    let points = [
      [
        // blinking red light
        new Point('#FF0000', Effects.BLINK),
        // solid green light
        new Point('#00FF00'),
        // blue light with 'breathe' effect
        new Point('#0000FF', Effects.BREATHE)
      ]
    ]

    // config.extensionId identifies what extension is providing
    // the signal
    const signal = new Signal({ points: points})
    logger.info("Sending signal: " + JSON.stringify(signal))
    return signal
  }
}

const example = new QExample();