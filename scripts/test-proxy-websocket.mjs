// Exercise the actual running standalone proxy with a delayed local upstream.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import WebSocket, {WebSocketServer} from 'ws';
const proxy = new URL(process.argv[2] ?? 'ws://127.0.0.1:8860/');
if (!['127.0.0.1','localhost','[::1]'].includes(proxy.hostname)) throw Error('Local proxy required');
const server=createServer();
const upstream=new WebSocketServer({noServer:true});
server.on('upgrade',(req,socket,head)=>setTimeout(()=>{
  if (!socket.destroyed) upstream.handleUpgrade(req,socket,head,ws=>upstream.emit('connection',ws));
},200));
upstream.on('connection',ws=>ws.on('message',(data,isBinary)=>ws.send(data,{binary:isBinary})));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
proxy.searchParams.set('target',`ws://127.0.0.1:${server.address().port}`);
const client=new WebSocket(proxy);
try {
  const received=[];
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Initial frames lost or altered before upstream opened')),4000);
    client.on('error',e=>{clearTimeout(timer);reject(e)});
    client.on('message',(data,binary)=>{
      received.push({data:Buffer.from(data),binary});
      if(received.length===3){clearTimeout(timer);resolve();}
    });
    client.on('open',()=>{client.send(Buffer.from([0,255,8,14]));client.send('ping');client.send(' { "preserve": true } ');});
  });
  assert.deepEqual(received,[{data:Buffer.from([0,255,8,14]),binary:true},{data:Buffer.from('ping'),binary:false},{data:Buffer.from(' { "preserve": true } '),binary:false}]);
  console.log('PASS: initial frames queued in order; binary/text bytes preserved.');
}finally{client.terminate();for(const ws of upstream.clients)ws.terminate();upstream.close();await new Promise(resolve=>server.close(resolve));}
