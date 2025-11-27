import React, { createContext, useContext, useRef } from 'react';

const HoloContext = createContext(null);

export const useHolo = () => useContext(HoloContext);

export const HoloProvider = ({ children }) => {
    // Armazena referências para todas as badges ativas
    const badgesRef = useRef(new Map());

    const registerBadge = (id, badgeData) => {
        badgesRef.current.set(id, badgeData);
    };

    const unregisterBadge = (id) => {
        badgesRef.current.delete(id);
    };

    return (
        <HoloContext.Provider value={{ badgesRef, registerBadge, unregisterBadge }}>
            {children}
        </HoloContext.Provider>
    );
};