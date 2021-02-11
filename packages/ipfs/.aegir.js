'use strict'

const getPort = require('aegir/utils/get-port')
const { createServer } = require('ipfsd-ctl')
const MockPreloadNode = require('./test/utils/mock-preload-node')
const PinningService = require('./test/utils/mock-pinning-service')
const EchoServer = require('aegir/utils/echo-server')
const webRTCStarSigServer = require('libp2p-webrtc-star/src/sig-server')
const path = require('path')

let preloadNode
let pinningService
let echoServer = new EchoServer()

// the second signalling server is needed for the interface test 'should list peers only once even if they have multiple addresses'
let sigServerA
let sigServerB
let ipfsdServer

const esbuild = {
  inject: [path.join(__dirname, '../../scripts/node-globals.js')],
  plugins: [
    {
      name: 'node built ins',
      setup (build) {
        build.onResolve({ filter: /^stream$/ }, () => {
          return { path: require.resolve('readable-stream') }
        })
      }
    }
  ]
}

module.exports = {
  test: {
    browser :{
      config: {
        assets: '..',
        buildConfig: esbuild
      }
    }
  },
  build: {
    bundlesizeMax: '610kB',
    config: esbuild
  },
  hooks: {
    node: {
      pre: async () => {
        preloadNode = MockPreloadNode.createNode()
        pinningService = await PinningService.start()

        await preloadNode.start(),
        await echoServer.start()
        return {
          env: {
            PINNING_SERVICE_ENDPOINT: pinningService.endpoint,
            PINNING_SERVIEC_KEY: pinningService.token,
            ECHO_SERVER: `http://${echoServer.host}:${echoServer.port}`
          }
        }
      },
      post: async () => {
        await preloadNode.stop()
        await PinningService.stop(pinningService)
        await echoServer.stop()
      }
    },
    browser: {
      pre: async () => {
        preloadNode = MockPreloadNode.createNode()
        pinningService = await PinningService.start()

        await preloadNode.start()
        await echoServer.start()
        const ipfsdPort = await getPort()
        const signalAPort = await getPort()
        const signalBPort = await getPort()
        sigServerA = await webRTCStarSigServer.start({
          host: '127.0.0.1',
          port: signalAPort,
          metrics: false
        })
        sigServerB = await webRTCStarSigServer.start({
          host: '127.0.0.1',
          port: signalBPort,
          metrics: false
        })
        ipfsdServer = await createServer({
          host: '127.0.0.1',
          port: ipfsdPort
        }, {
          type: 'js',
          ipfsModule: require(__dirname),
          ipfsHttpModule: require('ipfs-http-client'),
          ipfsBin: path.join(__dirname, 'src', 'cli.js'),
          ipfsOptions: {
            libp2p: {
              dialer: {
                dialTimeout: 60e3 // increase timeout because travis is slow
              }
            }
          }
        }, {
          go: {
            ipfsBin: require('go-ipfs').path()
          },
          js: {
            ipfsClientModule: require('ipfs-client')
          }
        }).start()

        return {
          env: {
            PINNING_SERVICE_ENDPOINT: pinningService.endpoint,
            PINNING_SERVIEC_KEY: pinningService.token,
            ECHO_SERVER: `http://${echoServer.host}:${echoServer.port}`,
            IPFSD_SERVER: `http://127.0.0.1:${ipfsdPort}`,
            SIGNALA_SERVER: `/ip4/127.0.0.1/tcp/${signalAPort}/ws/p2p-webrtc-star`,
            SIGNALB_SERVER: `/ip4/127.0.0.1/tcp/${signalBPort}/ws/p2p-webrtc-star`
          }
        }
      },
      post: async () => {
        await ipfsdServer.stop()
        await preloadNode.stop()
        await PinningService.stop(pinningService)
        await echoServer.stop()
        await sigServerA.stop()
        await sigServerB.stop()
      }
    }
  }
}
