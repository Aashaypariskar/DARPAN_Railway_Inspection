/**
 * designSystem.js
 *
 * Central design system for the inspection app.
 * Re-exports all theme tokens and adds card/button
 * style factories so every module stays consistent.
 *
 * USAGE:
 *   import { COLORS, DS } from '../config/designSystem';
 */
export { COLORS, SPACING, RADIUS, BUTTON, HEADER, STATUS_COLOR } from './theme';

import { COLORS, SPACING, RADIUS, BUTTON } from './theme';
import { StyleSheet } from 'react-native';

/** Reusable card shadow */
const SHADOW = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
};

/** Shared StyleSheet fragments — import DS.card, DS.btnPrimary etc. */
export const DS = StyleSheet.create({
    // ── Cards ───────────────────────────────────────
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: SPACING.lg,
        ...SHADOW,
    },
    cardComplete: {
        backgroundColor: COLORS.successLight,
        borderColor: '#6EE7B7',
        borderWidth: 1,
    },
    cardDefect: {
        backgroundColor: COLORS.dangerLight,
        borderColor: '#FCA5A5',
        borderWidth: 1,
    },

    // ── Buttons ─────────────────────────────────────
    btnPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: BUTTON.heightMd,
        borderRadius: BUTTON.radius,
        backgroundColor: COLORS.secondary,
        gap: SPACING.sm,
    },
    btnPrimaryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    btnSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: BUTTON.heightMd,
        borderRadius: BUTTON.radius,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.secondary,
        gap: SPACING.sm,
    },
    btnSecondaryText: {
        color: COLORS.secondary,
        fontSize: 16,
        fontWeight: '600',
    },
    btnDanger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: BUTTON.heightMd,
        borderRadius: BUTTON.radius,
        backgroundColor: COLORS.danger,
        gap: SPACING.sm,
    },
    btnDangerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    btnDisabled: {
        backgroundColor: COLORS.muted,
    },

    // ── Status badges ────────────────────────────────
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.sm,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    badgeComplete: { backgroundColor: COLORS.success },
    badgeInProgress: { backgroundColor: COLORS.warning },
    badgeDefect: { backgroundColor: COLORS.danger },
    badgePending: { backgroundColor: COLORS.muted },

    // ── Progress bar ─────────────────────────────────
    progressBg: {
        height: 8,
        backgroundColor: COLORS.mutedLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 4,
    },
    progressFillSuccess: {
        backgroundColor: COLORS.success,
    },

    // ── Layout commons ───────────────────────────────
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});
