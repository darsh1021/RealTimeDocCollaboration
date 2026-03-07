import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    // Check if user object is valid (has _id)
                    if (parsedUser && parsedUser._id) {
                        setUser(parsedUser);
                    } else {
                        // Legacy/Invalid user data found (missing _id), clear it to force re-login
                        console.warn("Invalid user data found, forcing logout");
                        localStorage.removeItem('user');
                        localStorage.removeItem('token');
                        setToken(null);
                        setUser(null);
                    }
                } catch (e) {
                    console.error("Error parsing user data", e);
                    localStorage.removeItem('user');
                }
            }
        }
        setLoading(false);
    }, [token]);

    const login = (data) => {
        localStorage.setItem('token', data.token);
        // data usually contains { _id, name, email, token } from the backend login/register response
        const userData = { _id: data._id, name: data.name, email: data.email };
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(data.token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
