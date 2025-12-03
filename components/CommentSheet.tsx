import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Comments from './Comments';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SNAP_POINT = SCREEN_HEIGHT * 0.25;

export interface CommentSheetProps {
    postId: string;
    visible: boolean;
    onClose: () => void;
}

export function CommentSheet({ postId, visible, onClose }: CommentSheetProps) {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backgroundColor = useThemeColor({}, 'background');

    const closeSheet = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, {}, () => {
            runOnJS(onClose)();
        });
    };

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0);
        }
    }, [visible]);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            // Allow scrolling up inside the sheet, but pan down to close
            if (e.translationY > 0) {
                translateY.value = e.translationY;
            }
        })
        .onEnd((e) => {
            const shouldClose = e.translationY > SNAP_POINT || e.velocityY > 800;
            if (shouldClose) {
                runOnJS(closeSheet)();
            } else {
                translateY.value = withSpring(0);
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    // Prevent sheet from rendering if not visible
    if (!visible) {
        return null;
    }

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={closeSheet}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.overlay}>
                    {/* The backdrop allows closing the sheet by tapping outside */}
                    <TouchableOpacity style={styles.backdrop} onPress={closeSheet} activeOpacity={1} />

                    <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor }]}>
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.handleBarContainer}>
                                <View style={styles.handleBar} />
                            </View>
                        </GestureDetector>
                        <Comments postId={postId} standalone={false} />
                    </Animated.View>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.85, // Give a bit more height for comments
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        overflow: 'hidden',
    },
    handleBarContainer: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    handleBar: {
        width: 38,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
    },
});
