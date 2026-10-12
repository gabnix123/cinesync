import React, { useState } from 'react';

export default function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVersion, setTermsVersion] = useState('1.0');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        onAuthSuccess();
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!termsAccepted) {
          throw new Error('You must accept the Terms of Service');
        }
        if (!ageConfirmed) {
          throw new Error('You must confirm you meet the age requirement');
        }
        const res = await fetch('/api/user/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email,
            password,
            termsAccepted,
            termsVersion,
            marketingOptIn,
            ageConfirmed,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        // In a real app, we would show a message to check email for verification
        setSuccess('Account created! Please check your email to verify your account.');
        // Optionally switch to login mode after a delay
        setMode('login');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTermsAccepted(false);
        setMarketingOptIn(false);
        setAgeConfirmed(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      {success && <p className="text-green-500 mb-2">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {mode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-start space-x-3">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-indigo-600"
              />
              <label htmlFor="terms" className="text-sm leading-5">
                I agree to the <a href="/terms" className="underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="underline">Privacy Policy</a> (version{' '}
                <input
                  type="text"
                  value={termsVersion}
                  onChange={(e) => setTermsVersion(e.target.value)}
                  className="w-8 border border-gray-300 rounded px-1"
                  size="4"
                />
                ).
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <input
                id="marketing"
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="h-4 w-4 text-indigo-600"
              />
              <label htmlFor="marketing" className="text-sm leading-5">
                I would like to receive marketing emails and updates.
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <input
                id="age"
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="h-4 w-4 text-indigo-600"
              />
              <label htmlFor="age" className="text-sm leading-5">
                I confirm I am 16 years of age or older.
              </label>
            </div>
          </>
        }
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        {mode === 'login' ? (
          <span>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="underline text-indigo-600 hover:text-indigo-800"
            >
              Sign up
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="underline text-indigo-600 hover:text-indigo-800"
            >
              Sign in
            </button>
          </span>
        )}
      </p>
    </div>
  );
}