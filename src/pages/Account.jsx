import React, { useState, useEffect } from 'react';

/**
 * Account.jsx — user account settings page.
 *
 * Features:
 *   - Display user's current data (email, consent, etc.)
 *   - Button to download account data as JSON
 *   - Button to delete account (with confirmation)
 *   - Link to update marketing consent (placeholder)
 *
 * SECURITY: This page is only accessible when authenticated.
 * All data fetching goes through our Express backend.
 */

const API = (window.location.hostname === 'localhost' && window.location.port === '5173')
  ? ''
  : 'https://cinesync-git-main-gnix.vercel.app';

export default function Account({ onBack }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch user data on mount
  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/user/me`, {
        credentials: 'include',
      });
      if (!res.ok) {
        // If not authenticated, redirect to login (handled by parent)
        throw new Error('Unauthorized');
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError('Could not load account information');
    } finally {
      setLoading(false);
    }
  }

  // Handle download data
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/api/user/export-data`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to export data');
      }
      const data = await res.json();
      // Create a blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinesync-account-data-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Data exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export data');
    } finally {
      setDownloading(false);
    }
  };

  // Handle delete account
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/user/delete-account`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      // On success, clear session and redirect to login
      setSuccess('Account deleted. Redirecting...');
      // Wait a bit then redirect
      setTimeout(() => {
        // In a real app, we would redirect to login page
        // For now, we'll just log out and let the parent handle auth state
        fetch(`${API}/api/user/logout`, {
          method: 'POST',
          credentials: 'include',
        }).then(() => {
          // Parent should handle logout and set user to null
          // We'll just reload the page to reset state
          window.location.reload();
        });
      }, 1500);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated (should not happen if route is protected)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
        <div className="max-w-md mx-auto mt-20">
          <p className="text-center">Please log in to access your account settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100">
      <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-b-lg shadow">
        <button
          onClick={onBack}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-center flex-1">Account Settings</h1>
        <div className="hidden"></div> {/* spacer */}
      </header>

      <main className="max-w-md mx-auto mt-6">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {success && <p className="text-green-500 mb-4">{success}</p>}

        <div className="space-y-6">
          {/* User info card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Your Information</h2>
            <div className="space-y-3 text-sm">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Terms of Service:</strong> {user.terms_accepted_at ? 'Accepted' : 'Not accepted'}</p>
              <p><strong>Marketing emails:</strong> {user.marketing_opt_in ? 'Subscribed' : 'Not subscribed'}</p>
              <p><strong>Age confirmed:</strong> {user.age_confirmed ? 'Yes' : 'No'}</p>
              <p><strong>Email verified:</strong> {user.email_verified_at ? 'Yes' : 'No'}</p>
              <p className="text-xs text-gray-500">
                <em>Last updated: {new Date(user.updated_at || user.created_at).toLocaleString()}</em>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {downloading ? (
                <>
                  <span className="animate-spin h-4 w-4"></span>
                  Exporting...
                </>
              ) : (
                <>
                  <span className="material-icons">download</span>
                  Download my data
                </>
              )}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <span className="animate-spin h-4 w-4"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <span className="material-icons">delete</span>
                  Delete my account
                </>
              )}
            </button>

            {/* Placeholder for updating marketing consent */}
            <button
              onClick={() => {
                // In a real app, we would open a form to update marketing consent
                alert('Marketing consent update coming soon');
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Update email preferences
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}