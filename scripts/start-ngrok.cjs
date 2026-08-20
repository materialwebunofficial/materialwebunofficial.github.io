const { spawn } = require('child_process');
const http = require('http');

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
    console.log('PUBLIC_URL:' + url);
    return;
  }

  const ngrokProc = spawn('ngrok', ['http', '3000'], {
    detached: true,
    stdio: 'ignore'
  });
  ngrokProc.unref();

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    url = await getNgrokUrl();
    if (url) {
      console.log('PUBLIC_URL:' + url);
      return;
    }
  }

  console.log('STATUS:COULD_NOT_START');
})();
