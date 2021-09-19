
import {createWantlist} from './wantlist.js'
import {createWantlistForPeer} from './wantlist-for-peer.js'
import {createUnwant} from './unwant.js'
import {createStat} from './stat.js'

/**
 * @typedef {import('../../types').NetworkService} NetworkService
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('ipfs-core-types/src/utils').AbortOptions} AbortOptions
 */

export class BitswapAPI {
  /**
   * @param {Object} config
   * @param {NetworkService} config.network
   */
  constructor ({ network }) {
    this.wantlist = createWantlist({ network })
    this.wantlistForPeer = createWantlistForPeer({ network })
    this.unwant = createUnwant({ network })
    this.stat = createStat({ network })
  }
}
