'use strict';

const { Server } = require('socket.io');

function attach_sockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    // TODO: join rooms, handle events, etc.
  });

  return io;
}

module.exports = { attach_sockets };