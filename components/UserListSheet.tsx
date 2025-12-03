import { ThemedText } from '@/components/themed-text';
import { UserListItem, UserListItemData } from '@/components/UserListItem';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SNAP_POINT = SCREEN_HEIGHT * 0.25;

export interface UserListSheetProps {
    users: UserListItemData[];
    loading: boolean;
    visible: boolean;
    onClose: () => void;
}

export function UserListSheet({ users, loading, visible, onClose }: UserListSheetProps) {
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
            if (e.translationY > 0) translateY.value = e.translationY;
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

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={closeSheet}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} onPress={closeSheet} activeOpacity={1} />

                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor }]}>
                            <View style={styles.handleBar} />
                            {loading ? (
                                <ActivityIndicator style={{ marginTop: 20 }} />
                            ) : (
                                <FlatList
                                    data={users}
                                    style={{ margin: 10 }}
                                    renderItem={({ item }) => <UserListItem item={item} />}
                                    keyExtractor={(item) => item.user_id}
                                    ListEmptyComponent={<ThemedText style={styles.center}>No users found.</ThemedText>}
                                />
                            )}
                        </Animated.View>
                    </GestureDetector>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    center: { justifyContent: 'center', alignItems: 'center', padding: 15, },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.8,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingBottom: 20,
        overflow: 'hidden',
    },
    handleBar: {
        width: 38,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 10,
    }
});
