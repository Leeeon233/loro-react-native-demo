import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
} from 'react-native';
import { MockRichTextDoc, RichTextSegment } from './LoroTypes';

interface RichTextEditorProps {
    onClose: () => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ onClose }) => {
    const [document] = useState(() => new MockRichTextDoc());
    const [segments, setSegments] = useState<RichTextSegment[]>([]);
    const [plainText, setPlainText] = useState('');
    const [selectedRange, setSelectedRange] = useState({ start: 0, end: 0 });
    const [showFormatMenu, setShowFormatMenu] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    useEffect(() => {
        const unsubscribe = document.subscribe(() => {
            setSegments(document.getSegments());
            setPlainText(document.getPlainText());
        });

        return unsubscribe;
    }, [document]);

    const handleTextChange = (newText: string) => {
        const currentText = document.getPlainText();
        if (newText.length > currentText.length) {
            // Text inserted
            const insertedText = newText.slice(currentText.length);
            document.insert(segments.length, insertedText);
        } else if (newText.length < currentText.length) {
            // Text deleted
            const deleteCount = currentText.length - newText.length;
            document.delete(segments.length - deleteCount, deleteCount);
        }
    };

    const formatText = (attrs: Partial<RichTextSegment>) => {
        const { start, end } = selectedRange;
        if (start !== end) {
            document.format(0, segments.length, attrs);
        }
        setShowFormatMenu(false);
    };

    const insertSampleRichText = () => {
        document.insert(segments.length, '这是粗体文本', { bold: true });
        document.insert(segments.length, ' 这是斜体文本 ', { italic: true });
        document.insert(segments.length, '这是彩色文本', { color: '#FF5722' });
        document.insert(segments.length, '\n');
    };

    const toggleBold = () => formatText({ bold: true });
    const toggleItalic = () => formatText({ italic: true });
    const setColorRed = () => formatText({ color: '#F44336' });
    const setColorBlue = () => formatText({ color: '#2196F3' });
    const setColorGreen = () => formatText({ color: '#4CAF50' });

    return (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>富文本编辑器</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>关闭</Text>
                    </TouchableOpacity>
                </View>

                {/* Toolbar */}
                <View style={styles.toolbar}>
                    <TouchableOpacity style={styles.toolButton} onPress={toggleBold}>
                        <Text style={[styles.toolButtonText, { fontWeight: 'bold' }]}>B</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolButton} onPress={toggleItalic}>
                        <Text style={[styles.toolButtonText, { fontStyle: 'italic' }]}>I</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: '#F44336' }]}
                        onPress={setColorRed}>
                        <Text style={styles.toolButtonText}>A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: '#2196F3' }]}
                        onPress={setColorBlue}>
                        <Text style={styles.toolButtonText}>A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolButton, { backgroundColor: '#4CAF50' }]}
                        onPress={setColorGreen}>
                        <Text style={styles.toolButtonText}>A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolButton} onPress={insertSampleRichText}>
                        <Text style={styles.toolButtonText}>示例</Text>
                    </TouchableOpacity>
                </View>

                {/* Rich Text Display */}
                <View style={styles.richTextContainer}>
                    <Text style={styles.richTextLabel}>富文本渲染:</Text>
                    <ScrollView style={styles.richTextDisplay}>
                        {segments.map((segment, index) => (
                            <Text
                                key={index}
                                style={[
                                    styles.richTextSegment,
                                    segment.bold && { fontWeight: 'bold' },
                                    segment.italic && { fontStyle: 'italic' },
                                    segment.color && { color: segment.color },
                                    segment.size ? { fontSize: segment.size } : undefined,
                                ]}>
                                {segment.text}
                            </Text>
                        ))}
                    </ScrollView>
                </View>

                {/* Plain Text Editor */}
                <View style={styles.editorContainer}>
                    <Text style={styles.editorLabel}>纯文本编辑:</Text>
                    <TextInput
                        ref={textInputRef}
                        style={styles.editor}
                        multiline
                        value={plainText}
                        onChangeText={handleTextChange}
                        onSelectionChange={(e) =>
                            setSelectedRange({
                                start: e.nativeEvent.selection.start,
                                end: e.nativeEvent.selection.end,
                            })
                        }
                        placeholder="在这里输入文本，然后使用上方工具栏格式化..."
                        textAlignVertical="top"
                    />
                </View>

                {/* Stats */}
                <View style={styles.stats}>
                    <Text style={styles.statText}>段落数: {segments.length}</Text>
                    <Text style={styles.statText}>字符数: {plainText.length}</Text>
                    <Text style={styles.statText}>
                        选择范围: {selectedRange.start}-{selectedRange.end}
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        💡 这个富文本编辑器展示了 Loro CRDT 如何处理复杂的格式化文本。
                        每个文本段落都有独立的样式属性，可以实现冲突自由的协作编辑。
                    </Text>
                </View>
            </View>
        </Modal>
    );
};

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
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    closeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    toolbar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        gap: 8,
    },
    toolButton: {
        width: 40,
        height: 40,
        backgroundColor: '#6c757d',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    richTextContainer: {
        margin: 20,
        marginBottom: 10,
    },
    richTextLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    richTextDisplay: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        minHeight: 100,
        maxHeight: 150,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    richTextSegment: {
        fontSize: 16,
        lineHeight: 24,
    },
    editorContainer: {
        margin: 20,
        marginTop: 10,
        flex: 1,
    },
    editorLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    editor: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        lineHeight: 24,
        color: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#e9ecef',
        flex: 1,
        textAlignVertical: 'top',
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    statText: {
        fontSize: 12,
        color: '#666',
    },
    infoCard: {
        margin: 20,
        padding: 12,
        backgroundColor: '#E8F5E8',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#4CAF50',
    },
    infoText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
});

export default RichTextEditor;