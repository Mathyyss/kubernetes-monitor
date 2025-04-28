const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');
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
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    if (pathname === '/api/pods') {
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
    } else if (pathname.startsWith('/api/logs/')) {
        // Format attendu: /api/logs/{namespace}/{podName}/{containerName}?previous=true&index=0
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length !== 5) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('URL incorrecte pour les logs');
            return;
        }
        
        const namespace = parts[2];
        const podName = parts[3];
        const containerName = parts[4];
        const queryParams = parsedUrl.query;
        
        let command = `kubectl logs -n ${namespace} ${podName} -c ${containerName}`;
        
        // Si previous=true, on récupère les logs du conteneur précédent
        if (queryParams.previous === 'true') {
            command += ' --previous';
            
            // Si un index spécifique est fourni et supérieur à 0, nous devons utiliser une approche différente
            // car kubectl ne supporte pas nativement l'accès à des logs de redémarrages spécifiques autres que le dernier
            if (queryParams.index && parseInt(queryParams.index) > 0) {
                const index = parseInt(queryParams.index);
                // On peut utiliser kubectl get pod -o yaml pour obtenir plus d'informations
                // et traiter cela côté client, mais pour l'instant on informe juste l'utilisateur
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`Note: Kubernetes ne permet d'accéder qu'au dernier conteneur précédent. Affichage des logs du dernier conteneur précédent pour ${containerName}.`);
                return;
            }
        }
        
        exec(command, {maxBuffer: 50 * 1024 * 1024}, (error, stdout, stderr) => {
            if (error) {
                console.error('Erreur logs:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Erreur lors de la récupération des logs: ${stderr || error.message}`);
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(stdout || 'Aucun log disponible');
        });
    } else if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(__dirname, 'frontend', 'index.html');
        serveFile(res, filePath, 'text/html');
    } else if (pathname.endsWith('.css')) {
        const filePath = path.join(__dirname, 'frontend', pathname);
        serveFile(res, filePath, 'text/css');
    } else if (pathname.endsWith('.js')) {
        const filePath = path.join(__dirname, 'frontend', pathname);
        serveFile(res, filePath, 'application/javascript');
    } else {
        res.writeHead(404);
        res.end('404 Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});