import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

export const getLogs = async (req: Request, res: Response) => {
    try {
        const { type = 'combined', lines = 1000 } = req.query;
        const logFile = type === 'error' ? 'error.log' : 'combined.log';
        const logPath = path.join('logs', logFile);

        // Read the log file
        const fileContent = await fs.readFile(logPath, 'utf-8');
        
        // Parse log entries (one per line)
        const logs = fileContent
            .trim()
            .split('\n')
            .slice(-Number(lines)) // Get last n lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return { message: line, timestamp: new Date().toISOString(), level: 'unknown' };
                }
            });

        // If HTML format is requested
        if (req.headers.accept?.includes('text/html')) {
            const htmlLogs = generateHtmlLogs(logs);
            res.send(htmlLogs);
        } else {
            res.json(logs);
        }
    } catch (error) {
        res.status(500).json({ 
            error: 'Failed to retrieve logs',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

function generateHtmlLogs(logs: any[]): string {
    const colorMap: { [key: string]: string } = {
        error: '#ff4444',
        warn: '#ffbb33',
        info: '#00C851',
        debug: '#33b5e5'
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Application Logs</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .log-entry { margin: 10px 0; padding: 10px; border-radius: 4px; }
            .timestamp { color: #666; }
            .level { font-weight: bold; }
            .message { margin-left: 10px; }
            .controls { margin-bottom: 20px; }
            .filter { margin: 0 10px; }
        </style>
        <script>
            function filterLogs() {
                const level = document.getElementById('levelFilter').value;
                const search = document.getElementById('searchFilter').value.toLowerCase();
                
                document.querySelectorAll('.log-entry').forEach(entry => {
                    const matchesLevel = level === 'all' || entry.getAttribute('data-level') === level;
                    const matchesSearch = !search || entry.textContent.toLowerCase().includes(search);
                    entry.style.display = matchesLevel && matchesSearch ? 'block' : 'none';
                });
            }
        </script>
    </head>
    <body>
        <div class="controls">
            <select id="levelFilter" onchange="filterLogs()" class="filter">
                <option value="all">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
            </select>
            <input type="text" id="searchFilter" onkeyup="filterLogs()" 
                placeholder="Search logs..." class="filter">
        </div>
        ${logs.map(log => `
            <div class="log-entry" data-level="${log.level}" 
                style="background-color: ${colorMap[log.level] || '#f8f9fa'}22">
                <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="level" style="color: ${colorMap[log.level] || '#666'}">
                    [${log.level.toUpperCase()}]
                </span>
                <span class="message">${log.message}</span>
                ${log.context ? `<pre>${JSON.stringify(log.context, null, 2)}</pre>` : ''}
            </div>
        `).join('')}
    </body>
    </html>
    `;
    return html;
}