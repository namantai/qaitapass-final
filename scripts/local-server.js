import http from 'node:http';
import {LocalNetwork} from '../src/network.js';
// Read-only status endpoint. Development writes run only through the local CLI demo.
const network = new LocalNetwork();
const port = Number(process.env.PORT || 8040);
http.createServer(async (req,res) => {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/status') return res.end(JSON.stringify(network.chainStatus()));
    if (req.method === 'GET' && url.pathname.startsWith('/passport/')) return res.end(JSON.stringify(network.read(decodeURIComponent(url.pathname.split('/')[2]))));
    res.writeHead(404); return res.end(JSON.stringify({error:'Not found'}));
  } catch (error) { res.writeHead(400); return res.end(JSON.stringify({error:error.message})); }
}).listen(port,'127.0.0.1',()=>console.log(`Local QaitaPass demo network: http://127.0.0.1:${port}`));
