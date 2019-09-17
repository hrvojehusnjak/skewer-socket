import express from 'express'
import http from 'http'
import socketio from 'socket.io'

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
})
