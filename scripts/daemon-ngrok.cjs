const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function getNgrokUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:4040/api/tunnels', res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.tunnels && json.tunnels.length > 0) {
            resolve(json.tunnels[0].public_url);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  let url = await getNgrokUrl();
  if (url) {
    console.log('NGROK_ACTIVE:' + url);
    return;
  }

  console.log('Starting ngrok with host-header rewrite...');
  const outLog = fs.openSync('C:/Users/sagla/OneDrive/Belgeler/MD3E for web/ngrok_out.log', 'w');
  const errLog = fs.openSync('C:/Users/sagla/OneDrive/Belgeler/MD3E for web/ngrok_err.log', 'w');

  const proc = spawn('ngrok', ['http', '127.0.0.1:3000', '--host-header=rewrite', '--log=stdout'], {
    detached: true,
    stdio: ['ignore', outLog, errLog]
  });
  proc.unref();

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    url = await getNgrokUrl();
    if (url) {
      console.log('NGROK_ACTIVE:' + url);
      return;
    }
  }

  const errData = fs.readFileSync('C:/Users/sagla/OneDrive/Belgeler/MD3E for web/ngrok_err.log', 'utf8');
  console.log('ERR_LOG:', errData);
})();
