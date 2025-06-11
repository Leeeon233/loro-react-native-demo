import { WebSocket, WebSocketServer as WS } from 'ws';
import http from 'http';

// Message type definitions
interface PingMessage {
    type: 'ping';
    peerId: string;
    timestamp: number;
}

interface DocMessage {
    type: 'doc';
    docId: string;
    update: number[];
    peerId: string;
    timestamp: number;
}

interface EphemeralMessage {
    type: 'ephemeral';
    docId: string;
    update: number[];
    peerId: string;
    timestamp: number;
}

interface PongMessage {
    type: 'pong';
    timestamp: number;
}

interface ConnectedMessage {
    type: 'connected';
    clientId: number;
    timestamp: number;
}

type IncomingMessage = PingMessage | DocMessage | EphemeralMessage;
type OutgoingMessage = PongMessage | ConnectedMessage | DocMessage | EphemeralMessage;

// Client info interface
interface ClientInfo {
    id: number;
    ws: WebSocket;
    ip: string;
    connectedAt: Date;
    lastPing: Date;
}

// Server status interface
interface ServerStatus {
    port: number;
    clientCount: number;
    clients: Array<{
        id: number;
        ip: string;
        connectedAt: Date;
        lastPing: Date;
        readyState: number;
    }>;
}

class WebSocketServer {
    private port: number;
    private clients: Map<number, ClientInfo>;
    private clientIdCounter: number;
    private server: http.Server | null;
    private wss: WS | null;

    constructor(port: number = 8080) {
        this.port = port;
        this.clients = new Map();
        this.clientIdCounter = 0;
        this.server = null;
        this.wss = null;
    }

    start(): void {
        // Create HTTP server first
        this.server = http.createServer();

        // Create WebSocket server
        this.wss = new WS({ server: this.server });

        this.wss!.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
            this.handleNewConnection(ws, request);
        });

        this.server.listen(this.port, () => {
            console.log(`WebSocket server started on port ${this.port}`);
        });

        // Handle server errors
        this.server.on('error', (error: Error) => {
            console.error('Server error:', error);
        });
    }

    private handleNewConnection(ws: WebSocket, request: http.IncomingMessage): void {
        const clientId = ++this.clientIdCounter;
        const clientInfo: ClientInfo = {
            id: clientId,
            ws: ws,
            ip: request.socket.remoteAddress || 'unknown',
            connectedAt: new Date(),
            lastPing: new Date()
        };

        this.clients.set(clientId, clientInfo);
        console.log(`Client ${clientId} connected from ${clientInfo.ip} (Total: ${this.clients.size})`);

        // Set up event handlers for this client
        ws.on('message', (data: Buffer) => {
            this.handleMessage(clientId, data);
        });

        ws.on('close', (code: number, reason: Buffer) => {
            this.handleDisconnection(clientId, code, reason.toString());
        });

        ws.on('error', (error: Error) => {
            this.handleError(clientId, error);
        });

        // Send connection confirmation
        this.sendToClient(clientId, {
            type: 'connected',
            clientId: clientId,
            timestamp: Date.now()
        });
    }

    private handleMessage(clientId: number, data: Buffer): void {
        try {
            const message: IncomingMessage = JSON.parse(data.toString());
            console.log(`Message from client ${clientId}, type: ${message.type}`);

            switch (message.type) {
                case 'ping':
                    this.handlePing(clientId, message);
                    break;
                case 'doc':
                    this.handleDocMessage(clientId, message);
                    break;
                case 'ephemeral':
                    this.handleEphemeralMessage(clientId, message);
                    break;
                default:
                    console.warn(`Unknown message type from client ${clientId}`);
            }
        } catch (error) {
            console.error(`Error parsing message from client ${clientId}:`, error);
        }
    }

    private handlePing(clientId: number, message: PingMessage): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPing = new Date();
            // Send pong response
            this.sendToClient(clientId, {
                type: 'pong',
                timestamp: Date.now()
            });
            console.log(`Ping received from client ${clientId}, sent pong`);
        }
    }

    private handleDocMessage(clientId: number, message: DocMessage): void {
        // Validate doc message structure
        if (!message.docId || !message.update || !message.peerId) {
            console.warn(`Invalid doc message from client ${clientId}: missing required fields`);
            return;
        }

        console.log(`Doc message from client ${clientId}, docId: ${message.docId}, peerId: ${message.peerId}`);

        // Forward to all other clients
        this.forwardToOtherClients(clientId, message);
    }

    private handleEphemeralMessage(clientId: number, message: EphemeralMessage): void {
        // Validate ephemeral message structure
        if (!message.docId || !message.update || !message.peerId) {
            console.warn(`Invalid ephemeral message from client ${clientId}: missing required fields`);
            return;
        }

        console.log(`Ephemeral message from client ${clientId}, docId: ${message.docId}, peerId: ${message.peerId}`);

        // Forward to all other clients
        this.forwardToOtherClients(clientId, message);
    }

    private forwardToOtherClients(senderClientId: number, message: DocMessage | EphemeralMessage): number {
        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((client, clientId) => {
            // Skip the sender
            if (clientId === senderClientId) {
                return;
            }

            if (client.ws.readyState === WebSocket.OPEN) {
                try {
                    client.ws.send(messageStr);
                    sentCount++;
                } catch (error) {
                    console.error(`Error forwarding message to client ${clientId}:`, error);
                    this.clients.delete(clientId);
                }
            }
        });

        console.log(`Forwarded ${message.type} message from client ${senderClientId} to ${sentCount} other clients`);
        return sentCount;
    }

    private handleDisconnection(clientId: number, code: number, reason: string): void {
        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected (Code: ${code}, Reason: ${reason}) (Total: ${this.clients.size})`);
    }

    private handleError(clientId: number, error: Error): void {
        console.error(`Error from client ${clientId}:`, error);
        this.clients.delete(clientId);
    }

    // Send message to specific client
    private sendToClient(clientId: number, message: OutgoingMessage): boolean {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) {
            console.warn(`Cannot send message to client ${clientId}: client not available`);
            return false;
        }

        try {
            client.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error(`Error sending message to client ${clientId}:`, error);
            return false;
        }
    }

    // Get server status
    getStatus(): ServerStatus {
        return {
            port: this.port,
            clientCount: this.clients.size,
            clients: Array.from(this.clients.values()).map(client => ({
                id: client.id,
                ip: client.ip,
                connectedAt: client.connectedAt,
                lastPing: client.lastPing,
                readyState: client.ws.readyState
            }))
        };
    }

    // Stop the server
    stop(): void {
        console.log('Stopping WebSocket server...');

        // Close all client connections
        this.clients.forEach((client, clientId) => {
            client.ws.close(1000, 'Server shutting down');
        });

        // Close the WebSocket server
        if (this.wss) {
            this.wss.close(() => {
                console.log('WebSocket server closed');
            });
        }

        // Close the HTTP server
        if (this.server) {
            this.server.close(() => {
                console.log('HTTP server closed');
            });
        }
    }
}

// Create and start server
const wsServer = new WebSocketServer(30026);
wsServer.start();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    wsServer.stop();
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    wsServer.stop();
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Export the server instance
export default wsServer; 