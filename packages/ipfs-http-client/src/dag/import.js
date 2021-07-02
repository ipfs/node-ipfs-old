const configure = require('../lib/configure')
const toUrlSearchParams = require('../lib/to-url-search-params')
const abortSignal = require('../lib/abort-signal')
const multipartRequest = require('../lib/multipart-request')
const { AbortController } = require('native-abort-controller')
const { default: CID } = require('cids')

/**
 * @typedef {import('../types').HTTPClientExtraOptions} HTTPClientExtraOptions
 * @typedef {import('ipfs-core-types/src/dag').API<HTTPClientExtraOptions>} DAGAPI
 */

module.exports = configure(api => {
  /**
   * @type {DAGAPI["import"]}
   */
  async function * dagImport (source, options = {}) {
    const controller = new AbortController()
    const signal = abortSignal(controller.signal, options.signal)
    const { headers, body } = await multipartRequest(source, controller, options.headers)

    const res = await api.post('dag/import', {
      timeout: options.timeout,
      signal,
      headers,
      body,
      searchParams: toUrlSearchParams({ pinRoots: options.pinRoots })
    })

    for await (const { BlockCount, Root } of res.ndjson()) {
      if (Root !== undefined) {
        const { Cid, PinErrorMsg } = Root
        yield { root: { cid: new CID(Cid), pinErrorMsg: PinErrorMsg === '' ? undefined : PinErrorMsg } }
      } else {
        yield { blockCount: BlockCount }
      }
    }
  }

  return dagImport
})
