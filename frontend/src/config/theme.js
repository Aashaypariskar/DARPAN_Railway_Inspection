export const COLORS = {
    primary: '#1E3A8A',
    primaryLight: '#EFF6FF',
    secondary: '#2563EB',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    success: '#10B981',
    successLight: '#D1FAE5',
    muted: '#94A3B8',
    mutedLight: '#F1F5F9',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#94A3B8',
    border: '#E5E7EB',
    placeholder: '#6B7280',
    disabled: '#D1D5DB',
    white: '#FFFFFF',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
};

// Button standard heights
export const BUTTON = {
    heightMd: 48,
    heightSm: 36,
    radius: 10,
};

// Header standard
export const HEADER = {
    height: 56,
    fontSize: 18,
};

// Status → COLORS helper
export const STATUS_COLOR = {
    complete: COLORS.success,
    inProgress: COLORS.warning,
    defect: COLORS.danger,
    pending: COLORS.muted,
};
