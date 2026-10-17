import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import SocialAuthButtons from '../components/SocialAuthButtons';
import { validateEmail, validateLoginPassword } from '../utils/validation';
import { loginUser } from '../services/apiClient';
import { ROLE_PATHS } from '../constants/roles';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function LoginPage({ devSimulation = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [formData, setFormData] = useState(() => {
    const rememberedEmail = localStorage.getItem('civicfix_remembered_email') || '';
    return {
      email: rememberedEmail,
      password: '',
      rememberMe: Boolean(rememberedEmail),
    };
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiFeedback, setApiFeedback] = useState(() => {
    if (location.state?.message) {
      return { type: 'error', message: location.state.message };
    }
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('expired') === 'true') {
      return { type: 'error', message: 'Session expired, please sign in again' };
    }
    return null;
  });

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: fieldValue }));

    // Clear error on edit if field was previously touched
    if (touched[name]) {
      if (name === 'email') {
        const res = validateEmail(value);
        setErrors((prev) => ({ ...prev, email: res.error }));
      } else if (name === 'password') {
        const res = validateLoginPassword(value);
        setErrors((prev) => ({ ...prev, password: res.error }));
      }
    }
  };

  // Handle Blur for client validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name === 'email') {
      const res = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: res.error }));
    } else if (name === 'password') {
      const res = validateLoginPassword(value);
      setErrors((prev) => ({ ...prev, password: res.error }));
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiFeedback(null);

    // Validate fields before submission
    const emailValidation = validateEmail(formData.email);
    const passwordValidation = validateLoginPassword(formData.password);

    const validationErrors = {};
    if (!emailValidation.isValid) validationErrors.email = emailValidation.error;
    if (!passwordValidation.isValid) validationErrors.password = passwordValidation.error;

    setErrors(validationErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Securely handle remember-me (persist email only, never passwords)
    if (formData.rememberMe) {
      localStorage.setItem('civicfix_remembered_email', formData.email.trim());
    } else {
      localStorage.removeItem('civicfix_remembered_email');
    }

    setLoading(true);

    try {
      const result = await loginUser({
        email: formData.email,
        password: formData.password,
        useDevSimulation:
          devSimulation ||
          Boolean(import.meta.env.DEV) ||
          window.location.search.includes('demo=true'),
      });

      if (result.success) {
        showToast({
          type: 'success',
          title: 'Sign In Successful',
          message: 'Welcome back to CivicFix AI.',
        });
        setApiFeedback({
          type: 'success',
          message: 'Authentication successful! Directing to citizen grievance dashboard...',
        });
        setTimeout(() => {
          const destination = (result.user && ROLE_PATHS[result.user.role]) || '/citizen/dashboard';
          navigate(destination);
        }, 600);
      } else {
        const errMsg = result.error || 'Authentication failed. Please verify your credentials.';
        showToast({
          type: 'error',
          title: 'Sign In Failed',
          message: errMsg,
        });
        setApiFeedback({
          type: 'error',
          message: errMsg,
        });
      }
    } catch {
      const errMsg = 'Could not connect to authentication service. Please check network connectivity.';
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: errMsg,
      });
      setApiFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout illustrationSide="left" pageKey="login">
      <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left">
        {/* Main Heading */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-1.5">
          Welcome Back
        </h1>
        <p className="text-sm sm:text-[15px] text-slate-600 mb-5 sm:mb-6 max-w-sm">
          Sign in to report issues and track municipal progress.
        </p>

        {/* Global Feedback Banner */}
        {apiFeedback && (
          <div
            role="alert"
            className={`w-full mb-6 p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5 transition-all animate-fadeIn ${
              apiFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-red-50 border border-red-300 text-red-900'
            }`}
          >
            {apiFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-left leading-relaxed">{apiFeedback.message}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="w-full space-y-5">
          {/* Email Field with Notched Label */}
          <FormField
            id="email"
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="email@gmail.com"
            autoComplete="email"
            error={touched.email ? errors.email : undefined}
            disabled={loading}
            backgroundColor="#FAF6EB"
            required
          />

          {/* Password Field with Notched Label */}
          <div>
            <FormField
              id="password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={touched.password ? errors.password : undefined}
              disabled={loading}
              backgroundColor="#FAF6EB"
              required
            />

            {/* Auxiliary Row: Remember Me & Forgot Password */}
            <div className="w-full flex items-center justify-between mt-3 px-1 text-xs sm:text-sm">
              <label htmlFor="remember-me" className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                <input
                  id="remember-me"
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <PrimaryButton type="submit" loading={loading} disabled={loading}>
              Login
            </PrimaryButton>
          </div>

          {/* Social Separator & Circular Buttons (Google, Facebook, Apple) */}
          <SocialAuthButtons actionText="log in" />

          {/* Switch Link: "Don't have an account? Sign up" */}
          <div className="text-center pt-3">
            <span className="text-[14.5px] sm:text-[15px] text-slate-600 font-medium">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 rounded transition-colors"
              >
                Sign up
              </Link>
            </span>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
