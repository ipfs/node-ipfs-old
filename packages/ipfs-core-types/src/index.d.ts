import { API as RootAPI } from './root'
import { API as BitswapAPI } from './bitswap'
import { API as BlockAPI } from './block'
import { API as BootstrapAPI } from './bootstrap'
import { API as ConfigAPI } from './config'
import { API as DAGAPI } from './dag'
import { API as DHTAPI } from './dht'
import { API as DiagAPI } from './diag'
import { API as FilesAPI } from './files'
import { API as KeyAPI } from './key'
import { API as LogAPI } from './log'
import { API as NameAPI } from './name'
import { API as ObjectAPI } from './object'
import { API as PinAPI } from './pin'
import { API as PubsubAPI } from './pubsub'
import { Refs, Local } from './refs'
import { API as RepoAPI } from './repo'
import { API as StatsAPI } from './stats'
import { API as SwarmAPI } from './swarm'
import { AbortOptions, Await, AwaitIterable } from './utils'

interface RefsAPI extends Refs {
  local: Local
}

export interface IPFS<OptionExtension = {}> extends RootAPI<OptionExtension> {
  bitswap: BitswapAPI<OptionExtension>
  block: BlockAPI<OptionExtension>
  bootstrap: BootstrapAPI<OptionExtension>
  config: ConfigAPI<OptionExtension>
  dag: DAGAPI<OptionExtension>
  dht: DHTAPI<OptionExtension>
  diag: DiagAPI<OptionExtension>
  files: FilesAPI<OptionExtension>
  key: KeyAPI<OptionExtension>
  log: LogAPI<OptionExtension>
  name: NameAPI<OptionExtension>
  object: ObjectAPI<OptionExtension>
  pin: PinAPI<OptionExtension>
  pubsub: PubsubAPI<OptionExtension>
  refs: RefsAPI
  repo: RepoAPI<OptionExtension>
  stats: StatsAPI<OptionExtension>
  swarm: SwarmAPI<OptionExtension>
}

export type {
  AbortOptions,
  Await,
  AwaitIterable
}
