import fs from 'node:fs';
import express from 'express';
import actuator from 'express-actuator';
import bodyParser from 'body-parser';
import cors from 'cors';
import config from './load-config.js';

import * as accountApp from './app-account.js';
import * as syncApp from './app-sync.js';
import * as goCardlessApp from './app-gocardless/app-gocardless.js';
import * as simpleFinApp from './app-simplefin/app-simplefin.js';
import * as secretApp from './app-secrets.js';
import * as apiApp from './app-api.js';

const app = express();

process.on('unhandledRejection', (reason) => {
  console.log('Rejection:', reason);
});

app.set('trust proxy', true);
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.raw({ type: 'application/actual-sync', limit: '20mb' }));
app.use(bodyParser.raw({ type: 'application/encrypted-file', limit: '50mb' }));

app.use('/sync', syncApp.handlers);
app.use('/account', accountApp.handlers);
app.use('/gocardless', goCardlessApp.handlers);
app.use('/simplefin', simpleFinApp.handlers);
app.use('/secret', secretApp.handlers);
app.use('/api', apiApp.handlers);

app.get('/mode', (req, res) => {
  res.send(config.mode);
});

app.use(actuator()); // Provides /health, /metrics, /info

// The web frontend
app.use((req, res, next) => {
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.use(express.static(config.webRoot, { index: false }));

app.get('/*', (req, res) => res.sendFile(config.webRoot + '/index.html'));

function parseHTTPSConfig(value) {
  if (value.startsWith('-----BEGIN')) {
    return value;
  }
  return fs.readFileSync(value);
}

export default async function run() {
  if (!fs.existsSync(config.serverFiles)) {
    fs.mkdirSync(config.serverFiles);
  }

  if (!fs.existsSync(config.apiFiles)) {
    fs.mkdirSync(config.apiFiles);
  }

  if (!fs.existsSync(config.userFiles)) {
    fs.mkdirSync(config.userFiles);
  }

  if (config.https) {
    const https = await import('node:https');
    const httpsOptions = {
      ...config.https,
      key: parseHTTPSConfig(config.https.key),
      cert: parseHTTPSConfig(config.https.cert),
    };
    https.createServer(httpsOptions, app).listen(config.port, config.hostname);
  } else {
    app.listen(config.port, config.hostname);
  }
  console.log('Listening on ' + config.hostname + ':' + config.port + '...');
}
