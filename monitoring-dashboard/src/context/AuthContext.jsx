import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(undefined);
    const [token, setToken] = useState(undefined);

    useEffect(() => {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!rawUser || !token) {
            setUser(null);
            return;
        }

        try {
            const parsed = JSON.parse(rawUser);

            let normalizedRole = null;

            if (typeof parsed.role === "string") {
                normalizedRole = parsed.role;
            } else if (parsed.role?.role_name) {
                normalizedRole = parsed.role.role_name;
            } else if (parsed.role_name) {
                normalizedRole = parsed.role_name;
            } else if (parsed.roles?.length) {
                normalizedRole = parsed.roles[0]?.role_name;
            }

            setUser({ ...parsed, normalizedRole });
        } catch (e) {
            console.error("Auth init error:", e);
            setUser(null);
        }
    }, []);

    const login = (userData, token) => {
        let normalizedRole = null;

        if (typeof userData.role === "string") {
            normalizedRole = userData.role;
        } else if (userData.role?.role_name) {
            normalizedRole = userData.role.role_name;
        } else if (userData.role_name) {
            normalizedRole = userData.role_name;
        } else if (userData.roles?.length) {
            normalizedRole = userData.roles[0]?.role_name;
        }

        const finalUser = { ...userData, normalizedRole };

        localStorage.setItem("user", JSON.stringify(finalUser));
        localStorage.setItem("token", token);

        setUser(finalUser);
    };

    const logout = () => {
        localStorage.clear();
        setToken(null);
        setUser(null);
        window.location.href = "/login";
    };

    const ROLE_LEVELS = {
        'SUPER_ADMIN': 100,
        'ADMIN': 80,
        'AUDITOR': 40,
        'INSPECTOR': 20,
        'GUEST': 0
    };

    const isAdmin = user?.normalizedRole?.toUpperCase().includes('ADMIN');
    const roleLevel = ROLE_LEVELS[user?.normalizedRole?.toUpperCase()] || 0;
    const canManageUsers = roleLevel >= ROLE_LEVELS['ADMIN'];

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAdmin,
            canManageUsers,
            login,
            logout,
            loading: user === undefined
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
