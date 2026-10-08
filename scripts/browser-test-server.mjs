// Windows can assign port6000 to listen(0); Chromium blocks that X11 port.
// Reserve a local HTTP test port outside the browser's restricted port range.
export async function listenBrowserTestServer(server){
  for(let attempt=0;attempt<8;attempt++){
    try{
      await new Promise((resolve,reject)=>{
        const cleanup=()=>{server.off('listening',ready);server.off('error',failed);};
        const ready=()=>{cleanup();resolve();},failed=error=>{cleanup();reject(error);};
        server.once('listening',ready);server.once('error',failed);
        server.listen(20000+Math.floor(Math.random()*40000),'127.0.0.1');
      });return;
    }catch(error){if(error.code!=='EADDRINUSE')throw error;}
  }
  throw new Error('No free local browser test port after eight attempts');
}
