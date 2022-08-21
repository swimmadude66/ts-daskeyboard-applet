import * as  assert from 'assert'
import * as q from '../src'

class TestApplet extends q.DesktopApp {
  foo: string
  constructor() {
    super()
    this.foo = 'bar'
    this.extensionId = Math.random() * 1000000 + ''
  }

  async run() {
    return (new q.Signal({
      points: [
        [new q.Point('#FF0000', q.Effects.BLINK)]
      ]
    }))
  }
}


describe('QDesktopSignal', () => {
  describe('#constructor()', () => {
    it('should return a valid instance', () => {
      const signal = new q.Signal({
        points: [
          [new q.Point('#FFFFFF')]
        ]
      })
      assert.equal(signal.points.length, 1)
    })

    it('should hold a data attribute', () => {
      const signal = new q.Signal({
        points: [
          [new q.Point('#FFFFFF')]
        ],
        data: {
          action: {
            url: 'http://foo.bar',
            label: 'Adjust your things'
          }
        }
      })
      assert.ok(signal.data.action.url)
      assert.ok(signal.data.action.label)
    })
  })

  it('should produce an error signal', () => {
    const signal = q.Signal.error({
      messages: 'foo'
    } as any)
    assert.ok(signal)
    assert.equal('ERROR', signal.action)
  })

  it('should delete a signal', async function () {
    this.timeout(5000)
    const signal = new q.Signal({
      origin: {
        x: 5,
        y: 5
      },
      points: [
        [new q.Point('#FF0000')]
      ],
    })

    return q.Signal.send(signal).then(result => {
      console.log("##### Sent signal, got response: ")
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          return q.Signal.delete(result.body.id)
          .then(result => {
            resolve()
          }).catch(error => {
            reject(error)
          })
        }, 2000)
      })
    })
  })
})

describe('QDesktopApplet', async () => {
  let mainTest = await buildApp()

  let geometryTest = new TestApplet()
  geometryTest.geometry = {
    width: 5,
    height: 6,
    origin: {
      x: 6,
      y: 7
    }
  }

  describe('#constructor()', () => {
    it('should return a valid instance', () => {
      assert.equal(mainTest.foo, 'bar')
    })

    it('should have a oAuth2ProxyBaseUrlDefault', () => {
      assert.ok(mainTest.oAuth2ProxyBaseUrlDefault)
    })
  })
  describe('#run()', () => {
    it('should be able to run', () => {
      return mainTest.run().then((signal) => {
        console.log("Got signal: " + JSON.stringify(signal))
        assert.ok(signal, 'Did not return a truthy signal.')
        assert(signal.points.length === 1, 'Signal did not return the correct number of points.')
      }).catch(error => assert.fail(error))
    })
  })
  describe('#flash()', () => {
    it('should flash', () => {
      const mainTestLast = mainTest.signalLog[0]
      return mainTest.handleFlash()
      .then(result => {
        assert.equal(result, mainTestLast)
      })
      .catch(error => {
        assert.fail(error)
      })
    })
  })

  describe('#getWidth()', () => {
    it('should know its width', () => {
      assert.ok(mainTest.getWidth())
      assert(5 == geometryTest.getWidth())
    })
  })

  describe('#getHeight()', () => {
    it('should know its height', () => {
      assert.ok(mainTest.getHeight())
      assert(6 == geometryTest.getHeight())
    })
  })
  describe('#getOriginX()', () => {
    it('should know its X origin', () => {
      assert(0 == mainTest.getOriginX() || mainTest.getOriginX())
      assert(6 == geometryTest.getOriginX())
    })
  })
  describe('#getOriginY()', () => {
    it('should know its Y origin', () => {
      assert.ok(0 == mainTest.getOriginY() || mainTest.getOriginY())
      assert(7 == geometryTest.getOriginY())
    })
  })
  describe('#signal()', () => {
    it('should signal', async () => {
      const test = await buildApp()
      const signal = new q.Signal({
        points: [
          [new q.Point('#00FF00')]
        ],
        link: {
          url: 'http://foo.bar',
          label: 'Click here.',
        }
      })
      return test.signal(signal).then(result => {
        assert.ok(result)
        assert.ok(signal.id)
        assert(test.signalLog.length)
        assert(test.signalLog[0].result)
        assert.equal(200, test.signalLog[0].result.statusCode)

        assert(test.signalLog[0].signal)
        assert.equal(signal.id, test.signalLog[0].signal.id)
      }).catch(error => assert.fail(error))
    })
  })
  describe('#signalError()', () => {
    it('should signalError', () => {
      return mainTest.signalError(['foo', 'bar']).then(result => {
        assert.ok(result)
      }).catch(error => assert.fail(error))
    })
  })
  describe('#processConfig()', () => {
    it('should gracefully handle an empty config', async () => {
      let test = new TestApplet()
      return test.processConfig({}).then(() => {
        assert.ok(test)
        assert.ok(test.config)
        assert.ok(test.geometry)
        assert.notEqual(null, test.geometry.height)
        assert.notEqual(null, test.geometry.width)
        assert.notEqual(null, test.geometry.origin.x)
        assert.notEqual(null, test.geometry.origin.y)
        assert.ok(test.authorization)
      })
    })

    it('should gracefully handle null config', async () => {
      let test = new TestApplet()
      return test.processConfig(null).then(() => {
        assert.ok(test)
        assert.ok(test.config)
        assert.ok(test.geometry)
        assert.ok(test.authorization)
      })
    })

    it('should gracefully handle no config', async () => {
      let test = new TestApplet()
      return test.processConfig().then(() => {
        assert.ok(test)
        assert.ok(test.config)
        assert.ok(test.geometry)
        assert.ok(test.authorization)
      })
    })
  })
})

// describe('Oauth2ProxyRequest', () => {
//   beforeEach(() => {
//     this.proxy = new q.Oauth2ProxyRequest({
//       apiKey: apiKey
//     })
//   })
//   it('should getOauth2ProxyToken', async () => {

//     return this.proxy.getOauth2ProxyToken().then(result => {
//       assert.ok(result.access_token)
//       assert.ok(result)
//     }).catch(err => assert.fail(err))
//   })

//   it('should getOauth2ProxyClientPayload', async () => {
//     return this.proxy.getOauth2ProxyClientPayload().then(result => {
//       assert.ok(result)
//     }).catch(err => assert.fail(err))
//   })
// })

async function buildApp() {
  const test = new TestApplet()
  await test.processConfig({
    devMode: true
  })

  return test
}