import React, { createContext, useContext, useState, useRef } from 'react';
import EncryptionService from '../services/encryptionService';

const CredentialsContext = createContext();

export const useCredentials = () => useContext(CredentialsContext);

export const CredentialsProvider = ({ children }) => {
  const [isPrompting, setIsPrompting] = useState(false);
  const [masterPassword, setMasterPassword] = useState(null);
  const decryptedCredentialsCache = useRef(new Map());

  // This will hold the resolve/reject functions of the promise we create
  const promiseCallbacks = useRef(null);

  const requestMasterPassword = () => {
    return new Promise((resolve, reject) => {
      setIsPrompting(true);
      promiseCallbacks.current = { resolve, reject };
    });
  };

  const handlePasswordSubmit = (password) => {
    setMasterPassword(password);
    setIsPrompting(false);
    if (promiseCallbacks.current) {
      promiseCallbacks.current.resolve(password);
      promiseCallbacks.current = null;
    }
  };

  const handlePasswordCancel = () => {
    setIsPrompting(false);
    if (promiseCallbacks.current) {
      promiseCallbacks.current.reject(new Error("User cancelled password entry."));
      promiseCallbacks.current = null;
    }
  };

  const getDecryptedCredentials = async (connection) => {
    if (!connection || !connection.id || !connection.encrypted_credentials) {
        throw new Error("Invalid connection object provided.");
    }

    // 1. Check cache first
    if (decryptedCredentialsCache.current.has(connection.id)) {
        return decryptedCredentialsCache.current.get(connection.id);
    }

    // 2. Try to decrypt with existing session password
    let currentPassword = masterPassword;
    if (currentPassword) {
        try {
            const credentials = await EncryptionService.decryptCredentials(connection.encrypted_credentials, currentPassword);
            decryptedCredentialsCache.current.set(connection.id, credentials);
            return credentials;
        } catch (e) {
            console.warn("Existing master password failed. Requesting new one.");
            // Clear the failed password
            setMasterPassword(null);
        }
    }

    // 3. If no valid password, prompt the user
    currentPassword = await requestMasterPassword();

    // 4. Decrypt with the new password
    try {
        const credentials = await EncryptionService.decryptCredentials(connection.encrypted_credentials, currentPassword);
        decryptedCredentialsCache.current.set(connection.id, credentials);
        return credentials;
    } catch (e) {
        console.error("Decryption failed even after prompt:", e);
        // Clear the failed password
        setMasterPassword(null);
        throw new Error("Invalid password.");
    }
  };

  const value = {
    getDecryptedCredentials,
    isPrompting,
    handlePasswordSubmit,
    handlePasswordCancel,
  };

  return (
    <CredentialsContext.Provider value={value}>
      {children}
    </CredentialsContext.Provider>
  );
};
