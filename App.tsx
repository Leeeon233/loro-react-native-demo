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
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import RichTextEditor from './RichTextEditor';
import { MockLoroDoc } from './LoroTypes';

const { width, height } = Dimensions.get('window');

function App(): React.JSX.Element {
  const [document] = useState(() => new MockLoroDoc());
  const [content, setContent] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [docSize, setDocSize] = useState(0);
  const [showRichEditor, setShowRichEditor] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const textInputRef = useRef<TextInput>(null);
  const text = document.getText();

  useEffect(() => {
    // Subscribe to document changes
    const unsubscribe = document.subscribe(() => {
      const newContent = text.toString();
      setContent(newContent);
      setDocSize(newContent.length);

      // Keep history for demonstration
      setHistory(prev => [...prev.slice(-4), newContent]);
    });

    return unsubscribe;
  }, [document, text]);

  const handleTextChange = (newText: string) => {
    const currentContent = text.toString();

    if (newText.length > currentContent.length) {
      // Text was inserted
      const insertPos = findInsertPosition(currentContent, newText);
      const insertedText = newText.slice(insertPos, insertPos + (newText.length - currentContent.length));
      text.insert(insertPos, insertedText);
    } else if (newText.length < currentContent.length) {
      // Text was deleted
      const deletePos = findDeletePosition(currentContent, newText);
      const deleteLen = currentContent.length - newText.length;
      text.delete(deletePos, deleteLen);
    }
  };

  const findInsertPosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i;
      }
    }
    return oldText.length;
  };

  const findDeletePosition = (oldText: string, newText: string): number => {
    for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
      if (oldText[i] !== newText[i]) {
        return i;
      }
    }
    return newText.length;
  };

  const insertSampleText = () => {
    const sampleTexts = [
      'Hello, World!',
      'This is a collaborative text editor.',
      'Loro CRDT makes real-time collaboration easy.',
      'Try editing this text simultaneously with others.',
      '支持中文输入和编辑。',
      '这是一个支持版本控制的文本编辑器。',
    ];
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    text.insert(cursorPosition, randomText + '\n');
  };

  const clearDocument = () => {
    Alert.alert(
      '清除文档',
      '确定要清除所有内容吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            const currentLength = text.length();
            if (currentLength > 0) {
              text.delete(0, currentLength);
            }
          },
        },
      ],
    );
  };

  const exportDocument = () => {
    const data = document.export();
    Alert.alert('导出成功', `文档已导出\n大小: ${data.length} 字节\n字符数: ${docSize}`);
  };

  const simulateCollaboration = () => {
    setIsCollaborative(!isCollaborative);
    if (!isCollaborative) {
      // Simulate remote edits with realistic timing
      setTimeout(() => {
        text.insert(0, '[用户A编辑] ');
      }, 1000);
      setTimeout(() => {
        text.insert(text.length(), ' [用户B添加]');
      }, 2000);
      setTimeout(() => {
        text.insert(Math.floor(text.length() / 2), ' [用户C插入] ');
      }, 3000);
    }
  };

  const showHistoryAlert = () => {
    const historyText = history.length > 0
      ? history.map((h, i) => `版本 ${i + 1}: "${h.slice(0, 30)}${h.length > 30 ? '...' : ''}"`).join('\n')
      : '暂无历史记录';

    Alert.alert('编辑历史', historyText);
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

      {/* Toolbar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolbarScroll}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolButton} onPress={insertSampleText}>
            <Text style={styles.toolButtonText}>插入文本</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={simulateCollaboration}>
            <Text style={styles.toolButtonText}>
              {isCollaborative ? '停止协作' : '开始协作'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toolButton, { backgroundColor: '#FF9800' }]} onPress={() => setShowRichEditor(true)}>
            <Text style={styles.toolButtonText}>富文本</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toolButton, { backgroundColor: '#9C27B0' }]} onPress={showHistoryAlert}>
            <Text style={styles.toolButtonText}>历史</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={exportDocument}>
            <Text style={styles.toolButtonText}>导出</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toolButton, styles.clearButton]} onPress={clearDocument}>
            <Text style={[styles.toolButtonText, styles.clearButtonText]}>清除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Editor */}
      <View style={styles.editorContainer}>
        <ScrollView style={styles.editorScroll} showsVerticalScrollIndicator={false}>
          <TextInput
            ref={textInputRef}
            style={styles.editor}
            multiline
            value={content}
            onChangeText={handleTextChange}
            onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
            placeholder="开始输入你的内容...&#10;&#10;✨ 支持实时协作&#10;📝 自动冲突解决&#10;⏰ 版本历史记录&#10;🔄 离线同步"
            placeholderTextColor="#999"
            textAlignVertical="top"
            scrollEnabled={false}
          />
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
          <Text style={styles.statLabel}>行数</Text>
          <Text style={styles.statValue}>{content.split('\n').length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>历史版本</Text>
          <Text style={styles.statValue}>{history.length}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🦜 Loro CRDT 演示</Text>
        <Text style={styles.infoText}>
          这是一个基于 Loro CRDT 的协作文本编辑器。支持实时协作、版本控制和离线编辑。
        </Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>• 🔄 冲突自由的协作编辑</Text>
          <Text style={styles.featureItem}>• 📱 支持离线编辑和同步</Text>
          <Text style={styles.featureItem}>• ⏰ 完整的版本历史记录</Text>
          <Text style={styles.featureItem}>• 🎨 富文本格式支持</Text>
        </View>
        <Text style={styles.infoNote}>
          点击"开始协作"来模拟多人协作编辑效果
        </Text>
      </View>

      {/* Rich Text Editor Modal */}
      {showRichEditor && (
        <RichTextEditor onClose={() => setShowRichEditor(false)} />
      )}
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
  toolbarScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  toolButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  toolButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  clearButtonText: {
    color: '#ffffff',
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
  editor: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    fontFamily: 'System',
    minHeight: height * 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
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
