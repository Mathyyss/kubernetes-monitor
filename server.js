
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 5000;

// Fonction pour servir un fichier statique
function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Erreur serveur');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

const server = http.createServer((req, res) => {
    if (req.url === '/api/pods') {
        exec('kubectl get pods -A -o json', {maxBuffer: 10 * 1024 *1024}, (error, stdout, stderr) => {
            if (error) {
                console.error('Erreur exec:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erreur récupération pods' }));
                return;
            }
            try {
                const pods = JSON.parse(stdout);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(pods));
            } catch (err) {
                console.error('Erreur parsing JSON:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erreur parsing JSON' }));
            }
        });
    } else if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'frontend', 'index.html');
        serveFile(res, filePath, 'text/html');
    } else if (req.url.endsWith('.css')) {
        const filePath = path.join(__dirname, 'frontend', req.url);
        serveFile(res, filePath, 'text/css');
    } else if (req.url.endsWith('.js')) {
        const filePath = path.join(__dirname, 'frontend', req.url);
        serveFile(res, filePath, 'application/javascript');
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});