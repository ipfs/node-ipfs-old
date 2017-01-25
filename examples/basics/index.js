'use strict'

const fs = require('fs')
const os = require('os')
const series = require('async/series')
const IPFS = require('../../src/core') // replace this by line below
// const IPFS = require('ipfs')

/*
 * Create a new IPFS instance, using default repo (fs) on default path (~/.ipfs)
 */
const node = new IPFS(os.tmpDir() + '/' + new Date().toString())

const fileToAdd = {
  path: 'hello.txt',
  content: fs.createReadStream('./hello.txt')
}

let fileMultihash

series([
  /*
   * Display version of js-ipfs
   */
  (cb) => {
    node.version((err, version) => {
      if (err) { return cb(err) }

      console.log('IPFS Version:', version.version)
      cb()
    })
  },
  /*
   * Initialize the repo for this node
   */
  (cb) => node.init({ emptyRepo: true, bits: 2048 }, cb),
  /*
   * Load the repo config into the IPFS node
   */
  (cb) => node.load(cb),
  /*
   * Take the node online (bitswap, network and so on)
   */
  (cb) => node.goOnline(cb),
  /*
   * Add a file to IPFS - Complete Files API on:
   * https://github.com/ipfs/interface-ipfs-core/tree/master/API/files
   */
  (cb) => {
    if (node.isOnline()) {
      console.log('\nNode is now ready and online')
    }

    node.files.add(fileToAdd, (err, result) => {
      if (err) { return cb(err) }

      console.log('\nAdded file:')
      console.log(result[0])
      fileMultihash = result[0].hash
      cb()
    })
  },
  /*
   * Awesome we've added a file so let's retrieve and
   * display its contents from IPFS
   */
  (cb) => {
    node.files.cat(fileMultihash, (err, stream) => {
      if (err) { return cb(err) }

      console.log('\nFile content:')
      stream.pipe(process.stdout)
      stream.on('end', process.exit)
    })
  }
], (err) => {
  if (err) {
    return console.log(err)
  }
  console.log('Success!')
})
