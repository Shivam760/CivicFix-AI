import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import { validateEmail } from '../utils/validation';
import { requestPasswordReset } from '../services/apiClient';
import { ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage({ devSimulation = false }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (touched) {
      const res = validateEmail(e.target.value);
      setError(res.error || '');
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const res = validateEmail(email);
    setError(res.error || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setFeedback(null);

    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setError(emailRes.error);
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset({
        email,
        useDevSimulation: devSimulation,
      });

      if (result.success) {
        setFeedback({
          type: 'success',
          message:
            result.message ||
            `A password recovery link has been generated for ${email}. Check your inbox or municipal notifications.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to submit recovery request.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'A network communication error occurred. Please try again later.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout illustrationSide="center" pageKey="forgot-password">
      <div className="w-full max-w-md mx-auto text-center">
        {/* Back Link */}
        <div className="flex items-center mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded p-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-[36px] font-black text-slate-900 tracking-tight leading-tight mb-2.5">
          Forgot Password?
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mb-7 leading-relaxed max-w-md mx-auto">
          Enter the verified email address associated with your citizen account, and the municipal authentication authority will dispatch a secure recovery token.
        </p>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`w-full mb-6 p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5 text-left transition-all animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-red-50 border border-red-300 text-red-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6 text-left">
          <FormField
            id="recovery-email"
            name="email"
            label="Registered Email"
            type="email"
            value={email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="citizen@gmail.com"
            autoComplete="email"
            error={touched ? error : undefined}
            disabled={loading}
            backgroundColor="#FAF6EB"
            required
          />

          <PrimaryButton type="submit" loading={loading} disabled={loading}>
            Send Recovery Link
          </PrimaryButton>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-stone-600 font-medium">
          <ShieldAlert className="w-4 h-4 text-stone-500" />
          <span>Protected by municipal citizen security standards</span>
        </div>
      </div>
    </AuthLayout>
  );
}
