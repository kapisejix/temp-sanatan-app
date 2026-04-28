import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // login | forgot | reset
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { data } = await require('axios').default.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/forgot-password`, { email: forgotEmail });
        setMessage(data.message);
        if (data.debug_token) setResetToken(data.debug_token);
      } else if (mode === 'reset') {
        const { data } = await require('axios').default.post(`${process.env.REACT_APP_BACKEND_URL}/api/auth/reset-password`, { token: resetToken, new_password: newPassword });
        setMessage(data.message);
        setTimeout(() => setMode('login'), 2000);
      } else {
        await login(email, password);
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/32112529/pexels-photo-32112529.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Spiritual"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'Manrope' }}>
            Sanatan Saathi
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Digital Spiritual Companion for Sanatan Dharma
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F8F3F1]">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-14 h-14 bg-[#E95A34] rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>S</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }}>Sanatan Saathi</h1>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E4E1] p-8">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E95A34] mb-2">Admin Panel</p>
              <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Manrope' }}>Welcome back</h2>
              <p className="text-sm text-[#7A8690] mt-1">Sign in to manage spiritual content</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" data-testid="login-error">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'login' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#374652] mb-1.5">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@sanatansaathi.com" className="w-full px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34] focus:border-[#E95A34] transition-colors" required data-testid="login-email-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374652] mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34] focus:border-[#E95A34] transition-colors pr-10" required data-testid="login-password-input" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A8690] hover:text-[#374652]">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }} className="text-xs text-[#E95A34] hover:underline" data-testid="forgot-password-link">Forgot Password?</button>
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-[#374652] mb-1.5">Email Address</label>
                  <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Enter your admin email" className="w-full px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E95A34]" required data-testid="forgot-email-input" />
                  {resetToken && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700">Debug: Reset token generated. <button type="button" onClick={() => setMode('reset')} className="underline font-medium">Click here to reset</button></p>
                    </div>
                  )}
                </div>
              )}

              {mode === 'reset' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Reset Token</label>
                    <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Paste reset token" className="w-full px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" required data-testid="reset-token-input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full px-4 py-2.5 bg-[#F8F3F1] border border-[#E8E4E1] rounded-lg text-sm focus:ring-2 focus:ring-[#E95A34]" required minLength={6} data-testid="new-password-input" />
                  </div>
                </>
              )}

              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[#E95A34] hover:bg-[#D04A28] text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50" data-testid="login-submit-btn">
                {loading && <Loader2 size={18} className="animate-spin" />}
                {mode === 'login' ? (loading ? 'Signing in...' : 'Sign In') : mode === 'forgot' ? 'Send Reset Link' : 'Reset Password'}
              </button>

              {mode !== 'login' && (
                <button type="button" onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="w-full text-center text-sm text-[#7A8690] hover:text-[#E95A34]">Back to Sign In</button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
