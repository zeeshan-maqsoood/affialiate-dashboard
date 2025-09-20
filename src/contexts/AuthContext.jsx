import { createContext, useState, useContext, useEffect } from "react";
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  updatePassword,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const userData = await getCurrentUser();
      const { tokens } = await fetchAuthSession();
      const userGroups = tokens?.accessToken?.payload["cognito:groups"] || [];
      setUser({ ...userData, groups: userGroups });
    } catch (_error) {
      console.log("No authenticated user found");
      setUser(null);
    }
    setLoading(false);
  }

  const userSignIn = async (email, password) => {
    try {
      console.log("Auth context: signing in with", email);

      // Handle case where user is already signed in
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          console.log("User is already signed in, signing out first");
          await signOut({ global: true });
        }
      } catch (_e) {
        // No user is signed in, continue with sign in process
      }

      const signInResult = await signIn({
        username: email,
        password,
      });

      console.log("Auth context: sign in result", signInResult);

      if (signInResult.isSignedIn) {
        const userData = await getCurrentUser();
        const { tokens } = await fetchAuthSession();
        const userGroups = tokens?.accessToken?.payload["cognito:groups"] || [];
        setUser({ ...userData, groups: userGroups });
      }

      return signInResult;
    } catch (error) {
      console.error("Auth context: sign in error", error);
      throw error;
    }
  };

  const userSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Auth context: sign out error", error);
      throw error;
    }
  };

  const userChangePassword = async (oldPassword, newPassword) => {
    try {
      await updatePassword({ oldPassword, newPassword });
      return true;
    } catch (error) {
      console.error("Auth context: change password error", error);
      throw error;
    }
  };

  const completeNewPassword = async ({ challengeResponse }) => {
    try {
      console.log("Auth context: completing new password challenge");

      const result = await confirmSignIn({
        challengeResponse,
      });

      console.log("Auth context: new password result", result);

      if (result.isSignedIn) {
        const userData = await getCurrentUser();
        const { tokens } = await fetchAuthSession();
        const userGroups = tokens?.accessToken?.payload["cognito:groups"] || [];
        setUser({ ...userData, groups: userGroups });
      }

      return result;
    } catch (error) {
      console.error("Auth context: complete new password error", error);
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      console.log("Auth context: initiating password reset for", email);
      const result = await resetPassword({ username: email });
      console.log("Auth context: password reset result", result);
      return result;
    } catch (error) {
      console.error("Auth context: forgot password error", error);
      throw error;
    }
  };

  const confirmForgotPassword = async (email, confirmationCode, newPassword) => {
    try {
      console.log("Auth context: confirming password reset for", email);
      const result = await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword,
      });
      console.log("Auth context: confirm password reset result", result);
      return result;
    } catch (error) {
      console.error("Auth context: confirm forgot password error", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user, // Add isAuthenticated property
        signIn: userSignIn,
        signOut: userSignOut,
        changePassword: userChangePassword,
        completeNewPassword,
        forgotPassword,
        confirmForgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
