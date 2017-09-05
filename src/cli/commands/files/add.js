'use strict'

const fs = require('fs')
const path = require('path')
const glob = require('glob')
const sortBy = require('lodash.sortby')
const pull = require('pull-stream')
const paramap = require('pull-paramap')
const zip = require('pull-zip')
const toPull = require('stream-to-pull-stream')
const mh = require('multihashes')
const utils = require('../../utils')
const print = require('../../utils').print

const WRAPPER = 'wrapper/'

function checkPath (inPath, recursive) {
  // This function is to check for the following possible inputs
  // 1) "." add the cwd but throw error for no recursion flag
  // 2) "." -r return the cwd
  // 3) "/some/path" but throw error for no recursion
  // 4) "/some/path" -r
  // 5) No path, throw err
  // 6) filename.type return the cwd + filename

  if (!inPath) {
    throw new Error('Error: Argument \'path\' is required')
  }

  // Strips trailing slash from path.
  inPath = inPath.replace(/\/$/, '')

  if (inPath === '.') {
    inPath = process.cwd()
  }

  if (fs.statSync(inPath).isDirectory() && recursive === false) {
    throw new Error(`Error: ${inPath} is a directory, use the '-r' flag to specify directories`)
  }

  return inPath
}

function addPipeline (index, addStream, list, argv) {
  const {
    wrapWithDirectory,
    quiet,
    quieter,
    silent
  } = argv

  pull(
    zip(
      pull.values(list),
      pull(
        pull.values(list),
        paramap(fs.stat.bind(fs), 50)
      )
    ),
    pull.map((pair) => ({
      path: pair[0],
      isDirectory: pair[1].isDirectory()
    })),
    pull.filter((file) => !file.isDirectory),
    pull.map((file) => ({
      path: file.path.substring(index, file.path.length),
      originalPath: file.path
    })),
    pull.map((file) => ({
      path: wrapWithDirectory ? path.join(WRAPPER, file.path) : file.path,
      content: fs.createReadStream(file.originalPath)
    })),
    addStream,
    pull.map((file) => ({
      hash: file.hash,
      path: wrapWithDirectory ? file.path.substring(WRAPPER.length) : file.path
    })),
    pull.collect((err, added) => {
      if (err) {
        throw err
      }

      if (silent) return
      if (quieter) return print(added.pop().hash)

      sortBy(added, 'path')
        .reverse()
        .map((file) => {
          const log = [ 'added', file.hash ]

          if (!quiet && file.path.length > 0) log.push(file.path)

          return log.join(' ')
        })
        .forEach((msg) => print(msg))
    })
  )
}

module.exports = {
  command: 'add <file>',

  describe: 'Add a file to IPFS using the UnixFS data format',

  builder: {
    recursive: {
      alias: 'r',
      type: 'boolean',
      default: false
    },
    trickle: {
      alias: 't',
      type: 'boolean',
      default: false,
      describe: 'Use the trickle DAG builder'
    },
    'wrap-with-directory': {
      alias: 'w',
      type: 'boolean',
      default: false
    },
    'enable-sharding-experiment': {
      type: 'boolean',
      default: false
    },
    'shard-split-threshold': {
      type: 'integer',
      default: 1000
    },
    'raw-leaves': {
      type: 'boolean',
      default: undefined,
      describe: 'Use raw blocks for leaf nodes. (experimental)'
    },
    'cid-version': {
      type: 'integer',
      describe: 'Cid version. Non-zero value will change default of \'raw-leaves\' to true. (experimental)'
    },
    quiet: {
      alias: 'q',
      type: 'boolean',
      default: false,
      describe: 'Write minimal output'
    },
    quieter: {
      alias: 'Q',
      type: 'boolean',
      default: false,
      describe: 'Write only final hash'
    },
    silent: {
      type: 'boolean',
      default: false,
      describe: 'Write no output'
    },
    hash: {
      type: 'string',
      choices: [undefined].concat(Object.keys(mh.names)),
      describe: 'Hash function to use. Will set Cid version to 1 if used. (experimental)'
    }
  },

  handler (argv) {
    const inPath = checkPath(argv.file, argv.recursive)
    const index = inPath.lastIndexOf('/') + 1
    const options = {
      strategy: argv.trickle ? 'trickle' : 'balanced',
      shardSplitThreshold: argv.enableShardingExperiment ? argv.shardSplitThreshold : Infinity,
      cidVersion: argv.cidVersion,
      rawLeaves: argv.rawLeaves,
      hashAlg: argv.hash
    }

    // Temporary restriction on raw-leaves:
    // When cid-version=1 then raw-leaves MUST be present and false.
    //
    // This is because raw-leaves is not yet implemented in js-ipfs,
    // and go-ipfs changes the value of raw-leaves to true when
    // cid-version > 0 unless explicitly set to false.
    //
    // This retains feature parity without having to implement raw-leaves.
    if (argv.cidVersion > 0 && argv.rawLeaves !== false) {
      throw new Error('Implied argument raw-leaves must be passed and set to false when cid-version is > 0')
    }

    if (argv.rawLeaves) {
      throw new Error('Not implemented: raw-leaves')
    }

    if (argv.enableShardingExperiment && utils.isDaemonOn()) {
      throw new Error('Error: Enabling the sharding experiment should be done on the daemon')
    }
    const ipfs = argv.ipfs

    // TODO: revist when interface-ipfs-core exposes pull-streams
    let createAddStream = (cb) => {
      ipfs.files.createAddStream(options, (err, stream) => {
        cb(err, err ? null : toPull.transform(stream))
      })
    }

    if (typeof ipfs.files.createAddPullStream === 'function') {
      createAddStream = (cb) => {
        cb(null, ipfs.files.createAddPullStream(options))
      }
    }

    createAddStream((err, addStream) => {
      if (err) {
        throw err
      }

      glob(path.join(inPath, '/**/*'), (err, list) => {
        if (err) {
          throw err
        }
        if (list.length === 0) {
          list = [inPath]
        }

        addPipeline(index, addStream, list, argv)
      })
    })
  }
}
