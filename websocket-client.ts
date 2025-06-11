import { EventEmitter } from 'eventemitter3';
import { Platform } from 'react-native';

let WebSocketClass = WebSocket;

// Base64 encoding/decoding utilities
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    const len = uint8Array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const uint8Array = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        uint8Array[i] = binary.charCodeAt(i);
    }
    return uint8Array;
}

// Message type definitions
interface PingMessage {
    type: 'ping';
    peerId: string;
    timestamp: number;
}

interface DocMessage {
    type: 'doc';
    docId: string;
    update: string;
    peerId: string;
    timestamp: number;
}

interface EphemeralMessage {
    type: 'ephemeral';
    docId: string;
    update: string;
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

type OutgoingMessage = PingMessage | DocMessage | EphemeralMessage;
type IncomingMessage = PongMessage | ConnectedMessage | DocMessage | EphemeralMessage;

// WebSocket-like interface for compatibility
interface IWebSocket {
    readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    onopen: ((event: any) => void) | null;
    onmessage: ((event: any) => void) | null;
    onclose: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
}

// Client status interface
interface ClientStatus {
    peerId: string;
    clientId: number | null;
    isConnected: boolean;
    readyState: number | null;
    reconnectAttempts: number;
}

// WebSocket states
const WEBSOCKET_STATES = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

function getWebSocketURL(basePort: number = 30026): string {
    if (Platform.OS === 'android') {
        // For Android emulator, use 10.0.2.2 which maps to host machine's localhost
        return `ws://10.0.2.2:${basePort}`;
    } else {
        // For iOS simulator and other platforms, localhost works fine
        return `ws://localhost:${basePort}`;
    }
}

class WebSocketClient extends EventEmitter<{
    pong: (message: PongMessage) => void;
    doc: (message: DocMessage) => void;
    ephemeral: (message: EphemeralMessage) => void;
    connected: () => void;
    disconnected: (code: number, reason: string) => void;
    error: (error: string) => void;
}> {
    private url: string;
    private peerId: string;
    private ws: IWebSocket | null;
    private reconnectAttempts: number;
    private maxReconnectAttempts: number;
    private reconnectInterval: number;
    private heartbeatInterval: NodeJS.Timeout | null;
    private heartbeatIntervalMs: number;
    private isConnected: boolean;
    private clientId: number | null;

    constructor(url: string = getWebSocketURL(), peerId?: string) {
        super();
        this.url = url;
        this.peerId = peerId || this.generatePeerId();
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 3000; // 3 seconds
        this.heartbeatInterval = null;
        this.heartbeatIntervalMs = 30000; // 30 seconds
        this.isConnected = false;
        this.clientId = null;
    }

    private generatePeerId(): string {
        return 'peer_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log(`Connecting to WebSocket server: ${this.url}`);
                this.ws = new WebSocketClass(this.url) as IWebSocket;

                this.ws.onopen = () => {
                    console.log('Connected to WebSocket server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event: any) => {
                    const data = event.data || event;
                    this.handleMessage(data);
                };

                this.ws.onclose = (event: any) => {
                    const code = event.code || 1000;
                    const reason = event.reason || 'Unknown';
                    console.log(`WebSocket connection closed: ${code} - ${reason}`);
                    this.isConnected = false;
                    this.clientId = null;
                    this.stopHeartbeat();
                    this.emit('disconnected', code, reason);
                    this.handleReconnect();
                };

                this.ws.onerror = (error: any) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };

            } catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                reject(error);
            }
        });
    }

    private handleMessage(data: any): void {
        try {
            const messageStr = typeof data === 'string' ? data : data.toString();
            const message: IncomingMessage = JSON.parse(messageStr);
            console.log(`Received message: ${message.type}`);

            switch (message.type) {
                case 'connected':
                    this.clientId = message.clientId;
                    console.log(`Assigned client ID: ${this.clientId}`);
                    break;
                case 'pong':
                    console.log('Received pong from server');
                    this.emit('pong', message);
                    break;
                case 'doc':
                    console.log(`Received doc message for docId: ${message.docId} from peer: ${message.peerId}`);
                    this.emit('doc', message);
                    break;
                case 'ephemeral':
                    console.log(`Received ephemeral message for docId: ${message.docId} from peer: ${message.peerId}`);
                    this.emit('ephemeral', message);
                    break;
                default:
                    console.warn(`Unknown message type: ${(message as any).type}`);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    private startHeartbeat(): void {
        // Send ping immediately
        this.sendPing();

        // Set up periodic heartbeat
        this.heartbeatInterval = setInterval(() => {
            this.sendPing();
        }, this.heartbeatIntervalMs);

        console.log(`Heartbeat started, sending ping every ${this.heartbeatIntervalMs / 1000} seconds`);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('Heartbeat stopped');
        }
    }

    private sendPing(): void {
        if (this.isConnected && this.ws && this.ws.readyState === WEBSOCKET_STATES.OPEN) {
            const pingMessage: PingMessage = {
                type: 'ping',
                peerId: this.peerId,
                timestamp: Date.now()
            };

            this.ws.send(JSON.stringify(pingMessage));
            console.log('Sent ping to server');
        }
    }

    sendDoc(docId: string, update: Uint8Array | number[]): boolean {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WEBSOCKET_STATES.OPEN) {
            console.warn('Cannot send doc message: not connected to server');
            return false;
        }

        if (!docId || !update) {
            console.error('sendDoc: docId and update are required');
            return false;
        }

        // Convert to Uint8Array and then to base64
        let uint8Array: Uint8Array;
        if (update instanceof Uint8Array) {
            uint8Array = update;
        } else if (Array.isArray(update)) {
            uint8Array = new Uint8Array(update);
        } else {
            console.error('sendDoc: update must be Uint8Array or Array');
            return false;
        }

        const docMessage: DocMessage = {
            type: 'doc',
            docId: docId,
            update: uint8ArrayToBase64(uint8Array),
            peerId: this.peerId,
            timestamp: Date.now()
        };

        try {
            this.ws.send(JSON.stringify(docMessage));
            console.log(`Sent doc message for docId: ${docId}`);
            return true;
        } catch (error) {
            console.error('Error sending doc message:', error);
            return false;
        }
    }

    sendEphemeral(docId: string, update: Uint8Array | number[]): boolean {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WEBSOCKET_STATES.OPEN) {
            console.warn('Cannot send ephemeral message: not connected to server');
            return false;
        }

        if (!docId || !update) {
            console.error('sendEphemeral: docId and update are required');
            return false;
        }

        // Convert to Uint8Array and then to base64
        let uint8Array: Uint8Array;
        if (update instanceof Uint8Array) {
            uint8Array = update;
        } else if (Array.isArray(update)) {
            uint8Array = new Uint8Array(update);
        } else {
            console.error('sendEphemeral: update must be Uint8Array or Array');
            return false;
        }

        const ephemeralMessage: EphemeralMessage = {
            type: 'ephemeral',
            docId: docId,
            update: uint8ArrayToBase64(uint8Array),
            peerId: this.peerId,
            timestamp: Date.now()
        };

        try {
            this.ws.send(JSON.stringify(ephemeralMessage));
            console.log(`Sent ephemeral message for docId: ${docId}`);
            return true;
        } catch (error) {
            console.error('Error sending ephemeral message:', error);
            return false;
        }
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval}ms`);

            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error('Reconnection failed:', error);
                });
            }, this.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached. Giving up.');
            this.emit('error', 'maxReconnectAttemptsReached');
        }
    }

    disconnect(): void {
        console.log('Disconnecting from WebSocket server...');
        this.stopHeartbeat();

        if (this.ws && this.ws.readyState === WEBSOCKET_STATES.OPEN) {
            this.ws.close(1000, 'Client initiated disconnect');
        }

        this.isConnected = false;
        this.clientId = null;
    }

    getStatus(): ClientStatus {
        return {
            peerId: this.peerId,
            clientId: this.clientId,
            isConnected: this.isConnected,
            readyState: this.ws ? this.ws.readyState : null,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

export default WebSocketClient;
export type { DocMessage, EphemeralMessage, PongMessage, ConnectedMessage, ClientStatus };
export { uint8ArrayToBase64, base64ToUint8Array }; 