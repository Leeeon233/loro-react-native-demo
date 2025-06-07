/**
 * Loro CRDT Collaborative Drawing Demo
 * Beautiful drawing canvas with real-time collaboration
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { LoroDoc, LoroValue, loroValueToJsValue } from 'loro-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette for drawing
const COLORS = [
  '#000000', // Black
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FFA07A', // Light Salmon
  '#20B2AA', // Light Sea Green
  '#9370DB', // Medium Purple
];

// Brush sizes
const BRUSH_SIZES = [
  { size: 2, label: 'Fine' },
  { size: 5, label: 'Medium' },
  { size: 10, label: 'Thick' },
  { size: 15, label: 'Bold' },
];

interface DrawingData {
  id: string;
  signature: string;
  color: string;
  timestamp: number;
  userId: string;
}

function App(): React.JSX.Element {
  const canvasRef = useRef<any>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedBrushSize, setSelectedBrushSize] = useState(BRUSH_SIZES[1]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentUserId] = useState(`user_${Date.now()}`);

  // TODO: Initialize Loro document for real-time collaboration
  const loroDoc = useRef(new LoroDoc()).current;
  const [collaborators, setCollaborators] = useState<string[]>([currentUserId]);

  useEffect(() => {
    // TODO: Set up Loro CRDT subscription for real-time updates
    // loroDoc.subscribe((events) => {
    //   // Handle remote drawing updates
    //   handleRemoteDrawingUpdates(events);
    // });

    // TODO: Initialize WebSocket or other real-time connection
    // setupRealtimeConnection();

    return () => {
      // TODO: Cleanup connections
    };
  }, []);

  const handleSignature = (signature: string) => {
    console.log('Drawing completed:', signature);

    // TODO: Store drawing in Loro CRDT
    // const drawingsMap = loroDoc.getMap('drawings');
    // const drawingData: DrawingData = {
    //   id: `drawing_${Date.now()}`,
    //   signature,
    //   color: selectedColor,
    //   timestamp: Date.now(),
    //   userId: currentUserId,
    // };
    // drawingsMap.set(drawingData.id, drawingData);

    setIsDrawing(false);
  };

  const handleBegin = () => {
    setIsDrawing(true);
  };

  const handleEnd = () => {
    if (canvasRef.current) {
      canvasRef.current.readSignature();
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear the entire canvas?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            if (canvasRef.current) {
              canvasRef.current.clearSignature();
            }
            // TODO: Clear Loro document
            // const drawingsMap = loroDoc.getMap('drawings');
            // drawingsMap.clear();
          },
        },
      ]
    );
  };

  const handleUndo = () => {
    // TODO: Implement undo functionality with Loro
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    // Use SignatureCanvas API to change color without clearing canvas
    if (canvasRef.current) {
      canvasRef.current.changePenColor(color);
    }
  };

  const handleBrushSizeSelect = (brush: typeof BRUSH_SIZES[0]) => {
    setSelectedBrushSize(brush);
    // Use SignatureCanvas API to change brush size without clearing canvas
    if (canvasRef.current) {
      const minWidth = brush.size * 0.5;
      const maxWidth = brush.size;
      canvasRef.current.changePenSize(minWidth, maxWidth);
    }
  };

  const ColorPicker = () => (
    <View style={styles.colorPicker}>
      <Text style={styles.toolLabel}>Colors</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
        <View style={styles.colorRow}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColorButton,
              ]}
              onPress={() => handleColorSelect(color)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const BrushSizePicker = () => (
    <View style={styles.brushSizePicker}>
      <Text style={styles.toolLabel}>Brush Size</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.brushSizeRow}>
          {BRUSH_SIZES.map((brush) => (
            <TouchableOpacity
              key={brush.size}
              style={[
                styles.brushSizeButton,
                selectedBrushSize.size === brush.size && styles.selectedBrushSizeButton,
              ]}
              onPress={() => handleBrushSizeSelect(brush)}
            >
              <View
                style={[
                  styles.brushPreview,
                  {
                    width: brush.size + 10,
                    height: brush.size + 10,
                    backgroundColor: selectedColor,
                  },
                ]}
              />
              <Text style={styles.brushSizeLabel}>{brush.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const ToolBar = () => (
    <View style={styles.toolbar}>
      <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
        <Text style={styles.undoButtonText}>⟲</Text>
        <Text style={styles.undoButtonLabel}>Undo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
        <Text style={styles.clearButtonIcon}>✕</Text>
        <Text style={styles.clearButtonLabel}>Clear</Text>
      </TouchableOpacity>
    </View>
  );

  const canvasStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      border-radius: 12px;
      background-color: white;
    }
    .m-signature-pad--body {
      border: none;
      border-radius: 12px;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      width: ${screenWidth - 32}px;
      height: ${screenHeight * 0.6}px;
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Loro Collaborative Canvas</Text>
        <Text style={styles.subtitle}>Draw together in real-time</Text>
      </View>

      {/* Drawing Canvas */}
      <View style={styles.canvasContainer}>
        <SignatureCanvas
          ref={canvasRef}
          onOK={handleSignature}
          onBegin={handleBegin}
          onEnd={handleEnd}
          autoClear={false}
          descriptionText=""
          penColor={selectedColor}
          minWidth={selectedBrushSize.size * 0.5}
          maxWidth={selectedBrushSize.size}
          webStyle={canvasStyle}
          backgroundColor="rgba(255,255,255,1)"
        />

        {/* Drawing indicator */}
        {isDrawing && (
          <View style={styles.drawingIndicator}>
            <Text style={styles.drawingIndicatorText}>✏️ Drawing...</Text>
          </View>
        )}
      </View>

      {/* Tools Panel */}
      <View style={styles.toolsPanel}>
        <ColorPicker />
        <BrushSizePicker />
        <ToolBar />
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Ready to draw • Color: {selectedColor} • Size: {selectedBrushSize.label}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  onlineText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  drawingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1000,
  },
  drawingIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  toolsPanel: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  colorPicker: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  colorScrollView: {
    paddingVertical: 8, // Add padding to prevent border clipping
  },
  toolLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4, // Extra padding to prevent clipping
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 16, // Increased margin for better spacing
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorButton: {
    borderColor: '#007AFF',
    borderWidth: 4, // Thicker border for better visibility
    // Remove transform to prevent clipping issues
  },
  brushSizePicker: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  brushSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brushSizeButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBrushSizeButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  brushPreview: {
    borderRadius: 50,
    marginBottom: 4,
  },
  brushSizeLabel: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  undoButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 20,
    marginRight: 8,
  },
  undoButtonLabel: {
    color: '#495057',
    fontWeight: '500',
    fontSize: 14,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7d7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  clearButtonIcon: {
    color: '#e53e3e',
    fontWeight: '700',
    fontSize: 16,
    marginRight: 6,
  },
  clearButtonLabel: {
    color: '#c53030',
    fontWeight: '500',
    fontSize: 14,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusBar: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default App;
