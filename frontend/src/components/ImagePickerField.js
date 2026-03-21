import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    Modal,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../config/theme';

/**
 * ImagePickerField
 *
 * Reusable image picker with:
 *  - No crop screen (allowsEditing: false)
 *  - Standard 4:3 aspect ratio display
 *  - Tap-to-fullscreen preview modal
 *  - "Before Photo" / "After Photo" labels via `label` prop
 *  - Empty state placeholder
 *  - Camera + Gallery buttons
 *
 * Props:
 *  image        – URI string or null
 *  onImagePicked – (uri) => void
 *  onRemove     – () => void
 *  label        – text shown above image (e.g. "Before Photo")
 *  disabled     – bool
 */
const ImagePickerField = ({ image, onImagePicked, onRemove, label, disabled }) => {
    const [fullscreen, setFullscreen] = useState(false);

    const requestPermissions = async () => {
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return camStatus === 'granted' && libStatus === 'granted';
    };

    const takePhoto = async () => {
        if (disabled) return;
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'We need access to camera and photos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,  // No crop screen
            quality: 0.65,
        });

        if (!result.canceled) {
            onImagePicked(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        if (disabled) return;
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission denied', 'We need access to photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,  // No crop screen
            quality: 0.65,
        });

        if (!result.canceled) {
            onImagePicked(result.assets[0].uri);
        }
    };

    return (
        <View style={styles.wrapper}>
            {/* Label */}
            {label ? (
                <Text style={styles.label}>{label}</Text>
            ) : null}

            {image ? (
                <View style={styles.imageContainer}>
                    {/* Tap image to fullscreen */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setFullscreen(true)}
                        style={styles.imageTouchable}
                    >
                        <Image
                            source={{ uri: image }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        {/* Expand hint */}
                        <View style={styles.expandHint}>
                            <Ionicons name="expand-outline" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    {/* Remove + Change buttons */}
                    {!disabled && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.changeBtn} onPress={takePhoto}>
                                <Ionicons name="camera-outline" size={14} color={COLORS.secondary} />
                                <Text style={styles.changeBtnText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                                <Ionicons name="image-outline" size={14} color={COLORS.secondary} />
                                <Text style={styles.changeBtnText}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
                                <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                                <Text style={styles.removeBtnText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            ) : (
                /* Empty state + picker buttons */
                <View>
                    <View style={styles.placeholder}>
                        <Ionicons name="image-outline" size={32} color={COLORS.disabled} />
                        <Text style={styles.placeholderText}>No photo uploaded</Text>
                    </View>

                    {!disabled && (
                        <View style={styles.btnRow}>
                            <TouchableOpacity style={styles.btn} onPress={takePhoto}>
                                <Ionicons name="camera-outline" size={16} color="#fff" />
                                <Text style={styles.btnText}>Take Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={pickImage}>
                                <Ionicons name="image-outline" size={16} color="#fff" />
                                <Text style={styles.btnText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Fullscreen preview modal */}
            <Modal visible={fullscreen} transparent animationType="fade">
                <View style={styles.fsOverlay}>
                    <Image
                        source={{ uri: image }}
                        style={styles.fsImage}
                        resizeMode="contain"
                    />
                    <TouchableOpacity
                        style={styles.fsClose}
                        onPress={() => setFullscreen(false)}
                    >
                        <Ionicons name="close-circle" size={36} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },

    // ── Image display ────────────────────────────────────────────
    imageContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: COLORS.surface,
    },
    imageTouchable: {
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        aspectRatio: 4 / 3,
    },
    expandHint: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 6,
        padding: 4,
    },

    // ── Action buttons under image ───────────────────────────────
    actionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    changeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.secondary,
    },
    removeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.danger,
        marginLeft: 'auto',
    },
    removeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.danger,
    },

    // ── Empty state ──────────────────────────────────────────────
    placeholder: {
        height: 180,
        width: '100%',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: COLORS.border,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: SPACING.sm,
    },
    placeholderText: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },

    // ── Picker buttons ───────────────────────────────────────────
    btnRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: SPACING.sm,
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.secondary,
        paddingVertical: 10,
        borderRadius: RADIUS.sm,
    },
    secondaryBtn: {
        backgroundColor: COLORS.textSecondary,
    },
    btnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },

    // ── Fullscreen modal ─────────────────────────────────────────
    fsOverlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fsImage: {
        width: '100%',
        height: '100%',
    },
    fsClose: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
});

export default ImagePickerField;
