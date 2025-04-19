const http = require('http');
const fs = require('fs');
const url = require('url');
const { EventEmitter } = require('events');

const port = 3000;
const todosFile = 'todos.json';
const logFile = 'logs.txt';

// Event emitter for logging
const logger = new EventEmitter();

// Function to log messages with timestamps
logger.on('log', (message) => {
    const timestamp = new Date().toISOString();
    fs.appendFile(logFile, `${timestamp} - ${message}\n`, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
});

// Start HTTP server
const server = http.createServer((req, res) => {
    const pasedUrl = url.parse(req.url, true);
    const method = req.method;
    const path = pasedUrl.pathname;

    logger.emit('log', `${method} request for ${path}`);

    if (method === 'GET' && path === '/todos') {
        fs.readFile(todosFile, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read todos file' }));
                return;
            }

            let todos = JSON.parse(data);

            // Status filtering
            const completed = pasedUrl.query.completed;
            if (completed !== undefined) {
                todos = todos.filter(todo => todo.completed === (completed === 'true'));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(todos));
        });
    } else if (method === 'GET' && path.startsWith('/todos/')) {
        const id = parseInt(path.split('/')[2]);

        fs.readFile(todosFile, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read todos file' }));
                return;
            }

            const todos = JSON.parse(data);
            const todo = todos.find(t => t.id === id);

            if (!todo) {
                console.log(`Todo with ID ${id} not found`);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Todo not found' }));
                return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(todo));
        });
    } else if (method === 'POST' && path === '/todos') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            const newTodo = JSON.parse(body);

            fs.readFile(todosFile, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read todos file' }));
                    return;
                }

                const todos = JSON.parse(data);
                // New unique ID generator
                const newId = todos.length > 0 ? todos[todos.length - 1].id + 1 : 1;

                const todo = {
                    id: newId,
                    title: newTodo.title,
                    completed: newTodo.completed
                };

                todos.push(todo);

                fs.writeFile(todosFile, JSON.stringify(todos, null, 2), (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to write to todos file' }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(todo));
                });
            });
        });
    } else if (method === 'PUT' && path.startsWith('/todos/')) {
        const id = parseInt(path.split('/')[2]);
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const updatedTodo = JSON.parse(body);

                fs.readFile(todosFile, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to read todos file' }));
                        return;
                    }

                    const todos = JSON.parse(data);
                    const todoIndex = todos.findIndex(t => t.id === id);

                    if (todoIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Todo not found' }));
                        return;
                    }

                    todos[todoIndex].title = updatedTodo.title ?? todos[todoIndex].title;
                    todos[todoIndex].completed = updatedTodo.completed ?? todos[todoIndex].completed;

                    fs.writeFile(todosFile, JSON.stringify(todos, null, 2), (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to write to todos file' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(todos[todoIndex]));
                    });
                });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON format' }));
            }
        });
    } else if (method === 'DELETE' && path.startsWith('/todos/')) {
        const id = parseInt(path.split('/')[2]);

        fs.readFile(todosFile, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read todos file' }));
                return;
            }

            const todos = JSON.parse(data);
            const todoIndex = todos.findIndex(t => t.id === id);

            if (todoIndex === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Todo not found' }));
                return;
            }

            todos.splice(todoIndex, 1); // remove todo

            fs.writeFile(todosFile, JSON.stringify(todos, null, 2), (err) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to write to todos file' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Todo deleted successfully' }));
            });
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server is running!')
    }
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});



