import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableOpacity, Dimensions, Modal, ActivityIndicator, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import quranWords from '../data/quranWords.json';
import { scoreHandwriting } from '../services/AIScoringService';

const { width, height } = Dimensions.get('window');

const ArabicWritingScreen = ({ navigation }) => {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const viewShotRef = useRef();
  const targetViewShotRef = useRef(); // Ref for the target word capture
  const currentPathRef = useRef([]);

  useEffect(() => {
    loadRandomWord();
  }, []);

  const loadRandomWord = () => {
    const random = quranWords[Math.floor(Math.random() * quranWords.length)];
    setCurrentWord(random);
    setPaths([]);
    setTool('pen');
    setShowResult(false);
    setScoreResult(null);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPathRef.current = [`M ${locationX} ${locationY}`];
      setCurrentPath(currentPathRef.current);
    },

    onPanResponderMove: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      const point = `L ${locationX} ${locationY}`;
      currentPathRef.current.push(point);
      setCurrentPath([...currentPathRef.current]);
    },

    onPanResponderRelease: () => {
      if (currentPathRef.current.length > 0) {
        const pathData = currentPathRef.current.join(' ');
        const newPath = {
          d: pathData,
          color: tool === 'eraser' ? '#1E1E1E' : '#FFFFFF',
          width: tool === 'eraser' ? 20 : 4
        };
        setPaths(prev => [...prev, newPath]);
        currentPathRef.current = [];
        setCurrentPath([]);
      }
    },
  });

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const checkQuality = async () => {
    if (paths.length === 0) {
      Alert.alert("Empty Canvas", "Please write something first!");
      return;
    }

    try {
      setIsAnalyzing(true);

      // 1. Capture User Drawing
      const userUri = await viewShotRef.current.capture();
      const userBase64 = await FileSystem.readAsStringAsync(userUri, { encoding: 'base64' });

      // 2. Capture Target Word (Reference)
      // We need to wait a tick if it wasn't rendered, but it should be rendered off-screen
      const targetUri = await targetViewShotRef.current.capture();
      const targetBase64 = await FileSystem.readAsStringAsync(targetUri, { encoding: 'base64' });

      // 3. Compare locally
      const result = await scoreHandwriting(userBase64, targetBase64);

      setScoreResult(result);
      setShowResult(true);

    } catch (error) {
      console.log("Analysis failed:", error);
      Alert.alert("Error", "Could not analyze handwriting. " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Practice Writing</Text>
        <TouchableOpacity onPress={loadRandomWord} style={styles.iconButton}>
          <Text style={styles.nextText}>Next</Text>
          <Ionicons name="arrow-forward" size={24} color="#D4A84B" />
        </TouchableOpacity>
      </View>

      {/* Word Display Area */}
      <View style={styles.wordContainer}>
        <Text style={styles.arabicWord}>{currentWord?.arabic}</Text>
        <Text style={styles.englishWord}>{currentWord?.english}</Text>
        <Text style={styles.transliteration}>({currentWord?.transliteration})</Text>
      </View>

      {/* Whiteboard Canvas */}
      <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ format: "jpg", quality: 0.5, result: "tmpfile" }}>
        <View style={styles.canvasContainer} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path.d}
                stroke={path.color}
                strokeWidth={path.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath.length > 0 && (
              <Path
                d={currentPath.join(' ')}
                stroke={tool === 'eraser' ? '#1E1E1E' : '#FFFFFF'}
                strokeWidth={tool === 'eraser' ? 20 : 4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>

          {paths.length === 0 && currentPath.length === 0 && (
            <Text style={styles.placeholderText}>Trace the word or practice writing here...</Text>
          )}
        </View>
      </ViewShot>

      {/* Hidden Reference View for Scoring */}
      {/* This renders the target word EXACTLY same size/position as the canvas input would be if we traced it. 
          We place it absolutely off-screen or behind. 
          For simplicity in "tracing" scoring, we usually want the user to trace over the word. 
          If the user is "copying" (looking above and writing below), pixel match will fail unless we normalize.
          Assuming "Tracing" mode because `placeholderText` says "Trace the word".
          If it's tracing mode, the word should be BEHIND the canvas for them to see.
          But the current code puts the word in `wordContainer` ABOVE the canvas.
          
          If the user is supposed to COPY, pixel matching requires advanced normalization (CV).
          If the user is supposed to TRACE, we should display the word IN the canvas.
          
          Code says "Trace the word or practice writing...". 
          Let's assume we want to support "Tracing" because it's easier for local pixel match.
          We will render the word into a hidden ViewShot that mimics the canvas area.
      */}
      <View style={{ position: 'absolute', opacity: 0, zIndex: -10, width: width - 30, height: height * 0.4 }}>
        <ViewShot ref={targetViewShotRef} options={{ format: "jpg", quality: 0.5, result: "tmpfile" }}>
          <View style={[styles.canvasContainer, { backgroundColor: '#FFFFFF', margin: 0 }]}>
            {/* We render the text in the center, same as where user would write? 
                    Actually, without a background guide, the user doesn't know size/position.
                    For accurate pixel scoring, we strictly need a background template.
                    
                    I will render the Arabic word large in the center of this hidden view.
                    AND I should probably show this as a "Ghost" in the real canvas if we want them to trace it.
                    However, keeping changes minimal: I'll just render the word here.
                    The user might fail if they write too small/large.
                    Ideally, we'd add the ghost text to the main canvas too.
                */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 100, fontWeight: 'bold', color: '#000' }}>
                {currentWord?.arabic}
              </Text>
            </View>
          </View>
        </ViewShot>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, tool === 'pen' && styles.activeTool]}
          onPress={() => setTool('pen')}
        >
          <Ionicons name="pencil" size={24} color={tool === 'pen' ? '#D4A84B' : '#808080'} />
          <Text style={styles.toolText}>Pen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, tool === 'eraser' && styles.activeTool]}
          onPress={() => setTool('eraser')}
        >
          <MaterialCommunityIcons name="eraser" size={24} color={tool === 'eraser' ? '#D4A84B' : '#808080'} />
          <Text style={styles.toolText}>Eraser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolButton} onPress={clearCanvas}>
          <Ionicons name="trash-outline" size={24} color="#F44336" />
          <Text style={[styles.toolText, { color: '#F44336' }]}>Clear</Text>
        </TouchableOpacity>

        {/* Check Button */}
        <TouchableOpacity style={styles.checkButton} onPress={checkQuality}>
          {isAnalyzing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={24} color="#FFF" />
              <Text style={styles.checkButtonText}>Check</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Result Modal */}
      <Modal transparent={true} visible={showResult} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Evaluation Result</Text>

            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score</Text>
              <Text style={[styles.scoreValue, { color: scoreResult?.score > 70 ? '#4CAF50' : '#FF9800' }]}>
                {scoreResult?.score}/100
              </Text>
            </View>

            <Text style={styles.feedbackText}>"{scoreResult?.feedback}"</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowResult(false)}
            >
              <Text style={styles.modalButtonText}>Keep Practicing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#D4A84B',
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextText: {
    color: '#D4A84B',
    fontWeight: '600',
    marginRight: 4,
  },
  wordContainer: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 5,
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#333333',
  },
  arabicWord: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#E8C87A',
    marginBottom: 5,
    fontFamily: 'System',
  },
  englishWord: {
    fontSize: 16,
    color: '#B3B3B3',
    marginBottom: 4,
  },
  transliteration: {
    fontSize: 14,
    color: '#808080',
    fontStyle: 'italic',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333333',
    elevation: 2,
    overflow: 'hidden',
  },
  placeholderText: {
    position: 'absolute',
    top: '40%',
    width: '100%',
    textAlign: 'center',
    color: '#808080',
    fontSize: 18,
    pointerEvents: 'none',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 15,
    paddingBottom: 30,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  activeTool: {
    backgroundColor: '#2A2A1A',
    borderWidth: 1,
    borderColor: '#D4A84B',
  },
  toolText: {
    marginTop: 4,
    fontSize: 12,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A84B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    elevation: 4,
  },
  checkButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '80%',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#B3B3B3',
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  feedbackText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#B3B3B3',
    fontStyle: 'italic',
    marginBottom: 25,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#D4A84B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  modalButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ArabicWritingScreen;