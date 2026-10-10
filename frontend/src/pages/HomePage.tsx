import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, type UserProfile } from "../services/api"

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError("");

    try {
      const result = await api.getMyProfile();
      setProfile(result);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        // The backend rejected the token. Clear the local session
        // and send the user to sign in again.
        await signOut();
        navigate("/login", { replace: true });
        return;
      }

      setProfileError(
        error instanceof Error
          ? error.message
          : "Could not load your profile.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [navigate, signOut]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);


  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setProfileError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="home-container">
      <h1>Welcome to Harmonix</h1>
      <p>You're signed in through Supabase Auth.</p>

      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading">Backend profile</h2>

        {loadingProfile && <p>Loading your profile from the API...</p>}

        {profileError && (
          <div role="alert">
            <p className="auth-error">{profileError}</p>
            <button onClick={() => void loadProfile()}>
              Retry
            </button>
          </div>
        )}

        {!loadingProfile && profile && (
          <div>
            <p>
              <strong>Name:</strong>{" "}
              {profile.name || "Not set"}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
            <p>
              <strong>Application user ID:</strong>{" "}
              <code>{profile.id}</code>
            </p>
            <p>
              <strong>Profile created:</strong>{" "}
              {new Date(profile.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </section>

      <hr />

      <p>
        <strong>Supabase Auth email:</strong>{" "}
        {user?.email ?? "No active session"}
      </p>

      <button onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </main>
  );
}