window.config = {
  // Used to activate screen (rest API) and load resources.
  resource: {
    server: '//indholdskanalen.vm/',
    uri: 'proxy'
  },
  // Used by web-socket.
  ws: {
    server: 'https://indholdskanalen.vm/'
  },
  // Backend to connect to.
  backend: {
    address: 'https://service.indholdskanalen.vm/'
  },
  // If cookie is secure it's only send over https.
  cookie: {
    secure: false
  }
}
