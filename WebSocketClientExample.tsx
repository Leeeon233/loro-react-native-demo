import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    TextInput,
} from 'react-native';
import WebSocketClient, { DocMessage, EphemeralMessage, ClientStatus } from './websocket-client';

const WebSocketClientExample: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const [docId, setDocId] = useState('test-document');
    const [updateData, setUpdateData] = useState('1,2,3,4,5');

    const wsClient = useRef<WebSocketClient | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Initialize WebSocket client
        wsClient.current = new WebSocketClient('ws://192.168.1.100:30026', 'react-native-peer');

        // Set up event listeners
        wsClient.current.on('connected', () => {
            setIsConnected(true);
            addMessage('✅ Connected to WebSocket server');
            updateStatus();
        });

        wsClient.current.on('disconnected', (code: number, reason: string) => {
            setIsConnected(false);
            addMessage(`❌ Disconnected: ${code} - ${reason}`);
            updateStatus();
        });

        wsClient.current.on('doc', (message: DocMessage) => {
            addMessage(`📄 Doc from ${message.peerId}: ${message.docId} [${message.update.join(',')}]`);
        });

        wsClient.current.on('ephemeral', (message: EphemeralMessage) => {
            addMessage(`⚡ Ephemeral from ${message.peerId}: ${message.docId} [${message.update.join(',')}]`);
        });

        wsClient.current.on('pong', () => {
            addMessage('🏓 Pong received');
        });

        wsClient.current.on('error', (error: any) => {
            addMessage(`❌ Error: ${error.toString()}`);
        });

        wsClient.current.on('maxReconnectAttemptsReached', () => {
            addMessage('❌ Max reconnection attempts reached');
            Alert.alert('Connection Failed', 'Could not reconnect to the server');
        });

        return () => {
            if (wsClient.current) {
                wsClient.current.disconnect();
            }
        };
    }, []);

    const addMessage = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setMessages(prev => [...prev, `[${timestamp}] ${message}`]);
        // Auto scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const updateStatus = () => {
        if (wsClient.current) {
            setClientStatus(wsClient.current.getStatus());
        }
    };

    const handleConnect = async () => {
        if (wsClient.current && !isConnected) {
            try {
                await wsClient.current.connect();
            } catch (error) {
                Alert.alert('Connection Error', String(error));
            }
        }
    };

    const handleDisconnect = () => {
        if (wsClient.current && isConnected) {
            wsClient.current.disconnect();
        }
    };

    const handleSendDoc = () => {
        if (wsClient.current && isConnected) {
            try {
                const data = updateData.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                const uint8Array = new Uint8Array(data);
                const success = wsClient.current.sendDoc(docId, uint8Array);
                if (success) {
                    addMessage(`📤 Sent doc: ${docId} [${data.join(',')}]`);
                } else {
                    addMessage('❌ Failed to send doc message');
                }
            } catch (error) {
                Alert.alert('Send Error', 'Invalid update data format');
            }
        }
    };

    const handleSendEphemeral = () => {
        if (wsClient.current && isConnected) {
            try {
                const data = updateData.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                const uint8Array = new Uint8Array(data);
                const success = wsClient.current.sendEphemeral(docId, uint8Array);
                if (success) {
                    addMessage(`📤 Sent ephemeral: ${docId} [${data.join(',')}]`);
                } else {
                    addMessage('❌ Failed to send ephemeral message');
                }
            } catch (error) {
                Alert.alert('Send Error', 'Invalid update data format');
            }
        }
    };

    const clearMessages = () => {
        setMessages([]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>WebSocket Loro Client</Text>

            {/* Status Section */}
            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Status</Text>
                <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </Text>
                {clientStatus && (
                    <>
                        <Text style={styles.statusText}>Peer ID: {clientStatus.peerId}</Text>
                        <Text style={styles.statusText}>Client ID: {clientStatus.clientId || 'N/A'}</Text>
                        <Text style={styles.statusText}>Reconnect Attempts: {clientStatus.reconnectAttempts}</Text>
                    </>
                )}
            </View>

            {/* Connection Controls */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: isConnected ? '#F44336' : '#4CAF50' }]}
                    onPress={isConnected ? handleDisconnect : handleConnect}
                >
                    <Text style={styles.buttonText}>
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#2196F3' }]}
                    onPress={updateStatus}
                >
                    <Text style={styles.buttonText}>Update Status</Text>
                </TouchableOpacity>
            </View>

            {/* Message Input Section */}
            <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Document ID:</Text>
                <TextInput
                    style={styles.textInput}
                    value={docId}
                    onChangeText={setDocId}
                    placeholder="Enter document ID"
                />

                <Text style={styles.inputLabel}>Update Data (comma separated numbers):</Text>
                <TextInput
                    style={styles.textInput}
                    value={updateData}
                    onChangeText={setUpdateData}
                    placeholder="1,2,3,4,5"
                />
            </View>

            {/* Send Controls */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9800', opacity: isConnected ? 1 : 0.5 }]}
                    onPress={handleSendDoc}
                    disabled={!isConnected}
                >
                    <Text style={styles.buttonText}>Send Doc</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#9C27B0', opacity: isConnected ? 1 : 0.5 }]}
                    onPress={handleSendEphemeral}
                    disabled={!isConnected}
                >
                    <Text style={styles.buttonText}>Send Ephemeral</Text>
                </TouchableOpacity>
            </View>

            {/* Messages Section */}
            <View style={styles.messagesContainer}>
                <View style={styles.messagesHeader}>
                    <Text style={styles.messagesTitle}>Messages</Text>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#607D8B', paddingHorizontal: 12, paddingVertical: 6 }]}
                        onPress={clearMessages}
                    >
                        <Text style={[styles.buttonText, { fontSize: 12 }]}>Clear</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesScrollView}
                    showsVerticalScrollIndicator={true}
                >
                    {messages.map((message, index) => (
                        <Text key={index} style={styles.messageText}>
                            {message}
                        </Text>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    statusContainer: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    statusText: {
        fontSize: 14,
        marginBottom: 4,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    inputContainer: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 8,
        marginBottom: 12,
        fontSize: 14,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    messagesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    messagesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    messagesScrollView: {
        flex: 1,
        padding: 12,
    },
    messageText: {
        fontSize: 12,
        color: '#444',
        marginBottom: 4,
        fontFamily: 'monospace',
    },
});

export default WebSocketClientExample; 