/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Cursor, EphemeralEventTrigger, EphemeralStore, EventTriggerKind, LoroDoc, LoroValue, loroValueToJsValue, Side, UpdateOptions } from 'loro-react-native';
import WebSocketClient, { base64ToUint8Array } from './websocket-client';

const { width, height } = Dimensions.get('window');

// Highlight interface
interface Highlight {
  start: number;
  end: number;
  color: string;
  id: string;
}

const document = new LoroDoc();
const ephemeralStore = new EphemeralStore(30000n);
const client = new WebSocketClient();
client.connect();

function App(): React.JSX.Element {
  const [content, setContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [docSize, setDocSize] = useState(0);
  const [highlights, setHighlights] = useState<Highlight | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textInputRef = useRef<TextInput>(null);
  const text = document.getText('text');

  useEffect(() => {
    client.on('doc', (msg) => {
      //@ts-ignore
      document.import_(base64ToUint8Array(msg.update));
    })
    client.on('ephemeral', (msg) => {
      //@ts-ignore
      ephemeralStore.apply(base64ToUint8Array(msg.update));
    })
    // Subscribe to document changes
    const unsubscribe = document.subscribe(text.id(), (e) => {
      const newContent = text.toString();
      setContent(newContent);
      setDocSize(newContent.length);
    });

    const docUpdateSub = document.subscribeLocalUpdate((update) => {
      client.sendDoc("demo", new Uint8Array(update));
    })

    const ephemeralUpdateSub = ephemeralStore.subscribeLocalUpdate({
      onEphemeralUpdate: (update) => {
        client.sendEphemeral("demo", new Uint8Array(update))
      }
    })

    const ephemeralSub = ephemeralStore.subscribe(
      {
        onEphemeralEvent: (event) => {
          if (event.by !== EphemeralEventTrigger.Import) return;
          const changeIds = event.added.concat(event.updated);
          const remote = changeIds[0];
          const remoteEphemeral = ephemeralStore.get(remote);
          if (!remoteEphemeral) return;
          const remoteValue = loroValueToJsValue(remoteEphemeral)
          const startCursor = Cursor.decode(remoteValue["start"])
          const endCursor = Cursor.decode(remoteValue["end"])
          const start = document.getCursorPos(startCursor).current.pos;
          const end = document.getCursorPos(endCursor).current.pos;
          setRemoteHighlight(start, end)
        }
      }
    );

    return () => {
      unsubscribe.unsubscribe();
      docUpdateSub.unsubscribe();
      ephemeralSub.unsubscribe();
      ephemeralUpdateSub.unsubscribe();
      client.removeAllListeners();
    }
  }, [document, text]);

  const handleTextChange = (newText: string) => {
    // @ts-ignore
    text.update(newText, UpdateOptions.defaults());
    document.commit();
    // Update highlights when text changes
    // updateHighlightsAfterTextChange(currentContent, newText);
  };

  // Function to add highlight
  const setRemoteHighlight = (start: number, end: number) => {
    console.log("setRemoteHighlight", start, end);
    const color = Platform.OS === 'android' ? '#ffeb3b' : '#ff0000';
    if (start >= end || start < 0 || end > content.length) {
      setHighlights(null);
      return
    };

    const newHighlight: Highlight = {
      id: `highlight_${Date.now()}_${Math.random()}`,
      start,
      end,
      color,
    };

    setHighlights(newHighlight);
  };

  // Function to render text with highlights
  const renderHighlightedText = () => {
    if (highlights === null || content.length === 0) {
      return <Text style={styles.hiddenText}>{content}</Text>;
    }

    const segments = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [highlights];

    sortedHighlights.forEach((highlight) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        segments.push({
          text: content.slice(lastIndex, highlight.start),
          highlighted: false,
          color: undefined,
          key: `text_${lastIndex}_${highlight.start}`,
        });
      }

      // Add highlighted text
      segments.push({
        text: content.slice(highlight.start, highlight.end),
        highlighted: true,
        color: highlight.color,
        key: `highlight_${highlight.id}`,
      });

      lastIndex = Math.max(lastIndex, highlight.end);
    });

    // Add remaining text
    if (lastIndex < content.length) {
      segments.push({
        text: content.slice(lastIndex),
        highlighted: false,
        color: undefined,
        key: `text_${lastIndex}_end`,
      });
    }

    return (
      <Text style={styles.hiddenText}>
        {segments.map((segment) => (
          <Text
            key={segment.key}
            style={[
              segment.highlighted && { backgroundColor: segment.color }
            ]}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Loro 文本编辑器</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isCollaborative ? '#4CAF50' : '#757575' }]} />
          <Text style={styles.statusText}>
            {isCollaborative ? '协作中' : '离线'}
          </Text>
        </View>
      </View>

      {/* Editor */}
      <View style={styles.editorContainer}>
        <ScrollView style={styles.editorScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.textContainer}>
            {/* Background text with highlights */}
            {renderHighlightedText()}

            {/* Transparent TextInput overlay */}
            <TextInput
              ref={textInputRef}
              style={[styles.editor, styles.transparentEditor]}
              multiline
              value={content}
              onChangeText={handleTextChange}
              onSelectionChange={(e) => {
                const { start, end } = e.nativeEvent.selection;
                setCursorPosition(start);
                setSelection({ start, end });
                const startCursor = text.getCursor(start, Side.Middle)!;
                const endCursor = text.getCursor(end, Side.Middle)!;
                const map = new Map<string, LoroValue>();
                map.set("start", new LoroValue.Binary({
                  value: startCursor.encode()
                }));
                map.set("end", new LoroValue.Binary({
                  value: endCursor.encode()
                }));
                ephemeralStore.set(document.peerId.toString(), {
                  asLoroValue: () => {
                    return new LoroValue.Map({
                      value: map
                    })
                  }
                })
              }}
              placeholder="开始输入你的内容...&#10;&#10;✨ 支持实时协作&#10;📝 自动冲突解决&#10;🔄 离线同步&#10;🎨 支持文本高亮"
              placeholderTextColor="#999"
              textAlignVertical="top"
              scrollEnabled={false}
              selectionColor="#007AFF"
            />
          </View>
        </ScrollView>
      </View>

      {/* Footer Stats */}
      <View style={styles.footer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>字符数</Text>
          <Text style={styles.statValue}>{docSize}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>光标位置</Text>
          <Text style={styles.statValue}>{cursorPosition}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>选择范围</Text>
          <Text style={styles.statValue}>
            {selection.start === selection.end ? '无' : `${selection.start}-${selection.end}`}
          </Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🦜 Loro CRDT 演示 - 支持文本高亮</Text>
        <Text style={styles.infoText}>
          这是一个基于 Loro CRDT 的协作文本编辑器，现在支持文本高亮功能。
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• 🔄 冲突自由的协作编辑</Text>
          <Text style={styles.featureItem}>• 📱 支持离线编辑和同步</Text>
          <Text style={styles.featureItem}>• 🎯 实时光标位置追踪</Text>
          <Text style={styles.featureItem}>• ⚡ 高性能文本操作</Text>
          <Text style={styles.featureItem}>• 🎨 智能文本高亮功能</Text>
        </View>
        <Text style={styles.infoNote}>
          试试选中文本然后点击"高亮选中"按钮，或者使用"演示高亮"来测试功能
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editorScroll: {
    flex: 1,
  },
  textContainer: {
    position: 'relative',
    minHeight: height * 0.4,
  },
  hiddenText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    fontFamily: 'System',
    minHeight: height * 0.4,
    zIndex: 1,
  },
  editor: {
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    fontFamily: 'System',
    minHeight: height * 0.4,
  },
  transparentEditor: {
    position: 'relative',
    backgroundColor: 'transparent',
    color: 'rgba(26, 26, 26, 0.01)', // Almost transparent but not completely
    zIndex: 2,
  },
  highlightControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  highlightButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  selectionButton: {
    backgroundColor: '#2196F3',
  },
  clearButton: {
    backgroundColor: '#FF5722',
  },
  highlightButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledText: {
    color: '#cccccc',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    margin: 20,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  featureList: {
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
    marginBottom: 2,
  },
  infoNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default App;
