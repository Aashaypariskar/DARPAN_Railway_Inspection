import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    const token = localStorage.getItem("token");

    // Wait until AuthContext initializes
    if (user === undefined) return null;

    // Not logged in
    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but not Admin
    if (!user.normalizedRole?.toUpperCase().includes("ADMIN")) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
