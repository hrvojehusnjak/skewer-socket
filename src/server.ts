import http from 'http'
import path from 'path'
import querystring from 'querystring'

import axios, { AxiosResponse } from 'axios'
import express from 'express'
import socketio from 'socket.io'

// Jaccard index is a statistic used for gauging the similarity and diversity of sets
// const require because module has no types file
const jaccard = require('jaccard')

const STREAM_INTERVAL =  5000
const baseUrl = 'https://baconipsum.com/api/?'
const types = ['all-meat', 'meat-and-filler']

let texts: string []
let emitPortion: string[]
let similarity: number
trackTicker()

function randomizeUrlParams (baseUrl: string, types: string[]): string {
  const type: string = types[Math.round(Math.random())]
  const sentences: number = Math.floor(Math.random() * 100)
  return baseUrl + querystring.stringify({ type, sentences })
}

async function getIpsumTexts (link: string): Promise<string[]> {
  const baconIpsumRes: AxiosResponse[] = await axios.all([axios.get(link), axios.get(link)])
  return baconIpsumRes.map((res) => res.data[0])
}

function skewer (text: string): string[] {
  const replaceVowels: string = text.replace(/[aeiou]/gi, (letter) => '[]')
  const replaceConsonants: string = replaceVowels
    .replace(/[bcdfghjklmnpqrstvwxyz]/gi, (letter) => 'o')
  const makeSkewers: string[] = replaceConsonants
    .split(' ')
    .map((word) => {
      if (word.endsWith(',')) {
        return '---{' + word.slice(0, -1) + '--,'
      }
      if (word.endsWith('.')) {
        return '---{' + word.slice(0, -1) + '--.'
      }
      return '---{' + word + '--'
    })

  return makeSkewers
}

async function streamComparisons () {
  let skewerTextSets: string[][] = []
  const link: string = randomizeUrlParams(baseUrl, types)
  if (!texts || !texts.length) {
    texts = await getIpsumTexts(link)
  }
  if (texts[0].length < 100 || texts[1].length < 100) {
    texts = await getIpsumTexts(link)
  }
  emitPortion = texts.map((text) => text.split(' ').slice(0, 99).join(' '))
  texts = texts.map((text) => text.split(' ').slice(99).join(' '))
  skewerTextSets = emitPortion
    .map((text) => skewer(text))
    .map((skewerText) => Array.from(new Set(skewerText)))
  similarity = jaccard.index(skewerTextSets[0], skewerTextSets[1])
  io.emit('text', JSON.stringify({ texts: emitPortion, jaccard: similarity }))
}

async function trackTicker () {
  await streamComparisons()
  setInterval(async () => {
    await streamComparisons()
  }, STREAM_INTERVAL)
}

const app = express()
app.set('port', process.env.PORT || 3800)
app.use(express.static(path.join(__dirname, '../public')))
const server = http.createServer(app)

const io = socketio.listen(server)
server.listen(app.get('port'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

io.sockets.on('connection', async (socket) => {
  socket.emit('text', JSON.stringify({ texts: emitPortion, jaccard: similarity }))
})
