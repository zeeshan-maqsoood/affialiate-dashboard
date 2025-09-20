import { useState, useEffect  } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserAttributes, fetchAuthSession } from "aws-amplify/auth";
import toast from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [signInDetails, setSignInDetails] = useState(null);

  const { signIn, completeNewPassword } = useAuth();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const eParam = searchParams.get("e");
    if (eParam) setEmail(eParam);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (
        result.nextStep?.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        console.log("New password required challenge detected");
        setSignInDetails(result.nextStep);
        setShowNewPasswordForm(true);
      } else if (result.isSignedIn) {
        // Get user attributes to determine role
        const userAttributes = await fetchUserAttributes();
        console.log("User attributes:", userAttributes);

        // Get user groups from JWT token (correct approach)
        const { tokens } = await fetchAuthSession();
        const userGroups = tokens?.accessToken?.payload["cognito:groups"] || [];
        console.log("User groups:", userGroups);

        // Force redirect based on role
        if (userGroups.includes("admin")) {
          console.log("Redirecting to admin dashboard");
          navigate("/admin", { replace: true });
        } else {
          console.log("Redirecting to affiliate dashboard");
          navigate("/affiliate", { replace: true });
        }

        toast.success("Successfully signed in!");
      }
    } catch (err) {
      console.error("Login error details:", err);
      setError(err.message || "Failed to sign in");
      toast.error(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Attempting to complete new password challenge");
      await completeNewPassword({
        challengeResponse: newPassword,
      });
      console.log("Password set successfully");

      const userAttributes = await fetchUserAttributes();
      const userGroups = userAttributes["custom:group"] || "";

      if (userGroups.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/affiliate");
      }

      toast.success("Password updated successfully!");
    } catch (err) {
      console.error("Complete password error:", err);
      setError(err.message || "Failed to set new password");
      toast.error(err.message || "Failed to set new password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-100">
      <div className="max-w-md w-full m-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 text-center">
              {showNewPasswordForm ? "Set New Password" : "Welcome Back"}
            </h2>
            <p className="text-center text-gray-600 mt-2">
              {showNewPasswordForm
                ? "Please set a new password to continue"
                : "Please sign in to your account"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p>{error}</p>
            </div>
          )}

          {!showNewPasswordForm ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email-address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="text"
                    autoComplete="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="mt-4 text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleCompletePassword}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    name="newPassword"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition hover:scale-[1.02]"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Setting password...
                  </span>
                ) : (
                  "Set New Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
