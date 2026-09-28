import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
} from "../services/authService";

import {
  getMyAccess,
} from "../services/accessService";

const AuthContext =
  createContext(null);

const STORAGE_KEYS = {
  token:
    "se_rms_access_token",

  user:
    "se_rms_user",

  access:
    "se_rms_access",

  loggedIn:
    "se_rms_logged_in",
};

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [access, setAccess] =
    useState(null);

  const [
    authLoading,
    setAuthLoading,
  ] = useState(true);

  /* =========================================================
     STORAGE
  ========================================================= */

  const clearStoredSession =
    useCallback(() => {
      localStorage.removeItem(
        STORAGE_KEYS.token
      );

      localStorage.removeItem(
        STORAGE_KEYS.user
      );

      localStorage.removeItem(
        STORAGE_KEYS.access
      );

      localStorage.removeItem(
        STORAGE_KEYS.loggedIn
      );
    }, []);

  const saveSession =
    useCallback(
      ({
        accessToken,
        user: loggedUser,
        access: accessData,
      }) => {
        localStorage.setItem(
          STORAGE_KEYS.token,
          accessToken
        );

        localStorage.setItem(
          STORAGE_KEYS.user,
          JSON.stringify(
            loggedUser
          )
        );

        localStorage.setItem(
          STORAGE_KEYS.access,
          JSON.stringify(
            accessData
          )
        );

        localStorage.setItem(
          STORAGE_KEYS.loggedIn,
          "true"
        );

        setUser(
          loggedUser
        );

        setAccess(
          accessData
        );
      },
      []
    );

  /* =========================================================
     LOAD COMPLETE SESSION
  ========================================================= */

  const loadSessionData =
    useCallback(
      async (
        accessToken,
        fallbackUser
      ) => {
        if (
          accessToken
        ) {
          localStorage.setItem(
            STORAGE_KEYS.token,
            accessToken
          );
        }

        const [
          userResponse,
          accessResponse,
        ] =
          await Promise.all([
            getCurrentUser(),
            getMyAccess(),
          ]);

        const currentUser =
          userResponse
            ?.data
            ?.data
            ?.user ||
          fallbackUser;

        const currentAccess =
          accessResponse
            ?.data
            ?.data;

        if (
          !currentUser ||
          !currentAccess
        ) {
          throw new Error(
            "Unable to load user session"
          );
        }

        const token =
          accessToken ||
          localStorage.getItem(
            STORAGE_KEYS.token
          );

        if (
          !token
        ) {
          throw new Error(
            "Access token is missing"
          );
        }

        saveSession({
          accessToken:
            token,

          user:
            currentUser,

          access:
            currentAccess,
        });

        return {
          user:
            currentUser,

          access:
            currentAccess,
        };
      },
      [
        saveSession,
      ]
    );

  /* =========================================================
     PASSWORD LOGIN
  ========================================================= */

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        clearStoredSession();

        try {
          const response =
            await loginUser({
              email:
                String(
                  email ||
                    ""
                )
                  .trim()
                  .toLowerCase(),

              password,
            });

          const accessToken =
            response
              ?.data
              ?.data
              ?.accessToken;

          const loggedUser =
            response
              ?.data
              ?.data
              ?.user;

          if (
            !accessToken ||
            !loggedUser
          ) {
            throw new Error(
              "Invalid login response"
            );
          }

          return await loadSessionData(
            accessToken,
            loggedUser
          );
        } catch (
          error
        ) {
          clearStoredSession();

          setUser(
            null
          );

          setAccess(
            null
          );

          throw error;
        }
      },
      [
        clearStoredSession,
        loadSessionData,
      ]
    );

  /* =========================================================
     GOOGLE LOGIN

     Google authenticates identity.
     Backend decides whether that exact email is an
     authorised SE-RMS user.
  ========================================================= */

  const googleLogin =
    useCallback(
      async (
        credential
      ) => {
        clearStoredSession();

        try {
          if (
            !credential
          ) {
            throw new Error(
              "Google credential is missing"
            );
          }

          const response =
            await loginWithGoogle(
              credential
            );

          const accessToken =
            response
              ?.data
              ?.data
              ?.accessToken;

          const loggedUser =
            response
              ?.data
              ?.data
              ?.user;

          if (
            !accessToken ||
            !loggedUser
          ) {
            throw new Error(
              "Invalid Google login response"
            );
          }

          return await loadSessionData(
            accessToken,
            loggedUser
          );
        } catch (
          error
        ) {
          clearStoredSession();

          setUser(
            null
          );

          setAccess(
            null
          );

          throw error;
        }
      },
      [
        clearStoredSession,
        loadSessionData,
      ]
    );

  /* =========================================================
     LOGOUT
  ========================================================= */

  const logout =
    useCallback(
      async () => {
        try {
          await logoutUser();
        } catch (
          error
        ) {
          console.warn(
            "Server logout failed:",
            error?.message
          );
        } finally {
          clearStoredSession();

          setUser(
            null
          );

          setAccess(
            null
          );
        }
      },
      [
        clearStoredSession,
      ]
    );

  /* =========================================================
     SESSION RESTORE
  ========================================================= */

  useEffect(() => {
    let mounted =
      true;

    const restoreSession =
      async () => {
        try {
          const token =
            localStorage.getItem(
              STORAGE_KEYS.token
            );

          if (
            !token
          ) {
            return;
          }

          await loadSessionData(
            token,
            null
          );
        } catch (
          error
        ) {
          clearStoredSession();

          if (
            mounted
          ) {
            setUser(
              null
            );

            setAccess(
              null
            );
          }
        } finally {
          if (
            mounted
          ) {
            setAuthLoading(
              false
            );
          }
        }
      };

    restoreSession();

    return () => {
      mounted =
        false;
    };
  }, [
    clearStoredSession,
    loadSessionData,
  ]);

  /* =========================================================
     ACCESS HELPERS
  ========================================================= */

  const hasModule =
    useCallback(
      (
        module
      ) => {
        if (
          access?.fullAccess
        ) {
          return true;
        }

        return Boolean(
          access
            ?.modules
            ?.includes(
              module
            )
        );
      },
      [
        access,
      ]
    );

  const hasPermission =
    useCallback(
      (
        module,
        action
      ) => {
        if (
          access?.fullAccess
        ) {
          return true;
        }

        return Boolean(
          access
            ?.permissions
            ?.some(
              (
                permission
              ) =>
                permission
                  .module ===
                  module &&
                permission
                  .action ===
                  action &&
                permission
                  .scope !==
                  "NONE"
            )
        );
      },
      [
        access,
      ]
    );

  return (
    <AuthContext.Provider
      value={{
        user,

        access,

        authLoading,

        isAuthenticated:
          Boolean(
            user
          ),

        login,

        googleLogin,

        logout,

        hasModule,

        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth =
  () => {
    const context =
      useContext(
        AuthContext
      );

    if (
      !context
    ) {
      throw new Error(
        "useAuth must be used inside AuthProvider"
      );
    }

    return context;
  };