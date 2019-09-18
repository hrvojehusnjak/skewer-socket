import http from 'http'
import querystring from 'querystring'

import axios, { AxiosPromise, AxiosResponse } from 'axios'
import express from 'express'
import socketio from 'socket.io'

const STREAM_INTERVAL = 20000
const baseUrl = 'https://baconipsum.com/api/?'
const types = ['all-meat', 'meat-and-filler']

function randomizeUrlParams (baseUrl: string, types: string[]): string {
  const type: string = types[Math.round(Math.random())]
  const sentences: number = Math.floor(Math.random() * 100)
  return baseUrl + querystring.stringify({ type, sentences })
}

async function getIpsumTexts (link: string): Promise<string[]> {
  const textPromise: AxiosPromise = axios.get(link)
  const baconIpsumRes: AxiosResponse[] = await axios.all([textPromise, textPromise])
  return baconIpsumRes.map((res) => res.data[0])
}

async function streamComparisons (socket: SocketIO.Socket, ticker: any) {
  const link: string = randomizeUrlParams(baseUrl, types)
  const texts: string[] = await getIpsumTexts(link)
  console.log('link', link)
  console.log(texts[0])
  socket.emit('ticker', texts)
}

async function trackTicker (socket: SocketIO.Socket, ticker: any) {
  await streamComparisons(socket, ticker)
  const timer = setInterval(async () => {
    await streamComparisons(socket, ticker)
  }, STREAM_INTERVAL)
  socket.on('disconnect', () => {
    clearInterval(timer)
  })
}

const app = express()
app.set('port', process.env.PORT || 3800)
const server = http.createServer(app)

const io = socketio.listen(server)
server.listen(app.get('port'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

io.sockets.on('connection', (socket) => {
  console.log('socket connected')
  socket.on('ticker', async (ticker) => {
    console.log('woohoo ticker', ticker)
    await trackTicker(socket, ticker)
  })
})
