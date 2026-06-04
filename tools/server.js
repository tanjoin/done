// 簡単なサーバーを作る
const http = require('http');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

class Server {
    constructor(port = 50000) {
        this.port = port;
    }

    start() {
        const server = http.createServer((req, res) => {
            const filePath = path.join(DOCS_DIR, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File not found');
                } else {
                    if (filePath.endsWith('.html')) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                    } else if (filePath.endsWith('.css')) {
                        res.writeHead(200, { 'Content-Type': 'text/css' });
                    } else if (filePath.endsWith('.js')) {
                        res.writeHead(200, { 'Content-Type': 'application/javascript' });
                    } else if (filePath.endsWith('.json')) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                    }
                    res.end(data);
                }
            });
        });

        server.listen(this.port, () => {
            console.log(`Server running at http://localhost:${this.port}/`);
        });
    }
}
module.exports = Server;

if (require.main === module) {
    const port = process.argv[2] || 8080;
    const server = new Server(port);
    server.start();
}