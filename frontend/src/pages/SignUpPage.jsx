import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import SocialAuthButtons from '../components/SocialAuthButtons';
import PasswordStrength from '../components/PasswordStrength';
import { validateEmail, validatePhoneNumber, evaluatePasswordStrength } from '../utils/validation';
import { registerUser } from '../services/apiClient';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SignUpPage({ devSimulation = false }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiFeedback, setApiFeedback] = useState(null); // { type: 'error' | 'success', message: '' }

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation if field has been touched
    if (touched[name]) {
      if (name === 'email') {
        const res = validateEmail(value);
        setErrors((prev) => ({ ...prev, email: res.error }));
      } else if (name === 'phone') {
        const res = validatePhoneNumber(value);
        setErrors((prev) => ({ ...prev, phone: res.error }));
      } else if (name === 'password') {
        const res = evaluatePasswordStrength(value);
        setErrors((prev) => ({ ...prev, password: res.error }));
      }
    }
  };

  // Handle Blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    if (name === 'email') {
      const res = validateEmail(value);
      setErrors((prev) => ({ ...prev, email: res.error }));
    } else if (name === 'phone') {
      const res = validatePhoneNumber(value);
      setErrors((prev) => ({ ...prev, phone: res.error }));
    } else if (name === 'password') {
      const res = evaluatePasswordStrength(value);
      setErrors((prev) => ({ ...prev, password: res.error }));
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiFeedback(null);

    // Validate all 3 fields
    const emailValidation = validateEmail(formData.email);
    const phoneValidation = validatePhoneNumber(formData.phone);
    const passwordValidation = evaluatePasswordStrength(formData.password);

    const validationErrors = {};
    if (!emailValidation.isValid) validationErrors.email = emailValidation.error;
    if (!phoneValidation.isValid) validationErrors.phone = phoneValidation.error;
    if (!passwordValidation.isValid) validationErrors.password = passwordValidation.error;

    setErrors(validationErrors);
    setTouched({ email: true, phone: true, password: true });

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser({
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        useDevSimulation: devSimulation,
      });

      if (result.success) {
        setApiFeedback({
          type: 'success',
          message:
            result.message ||
            'Citizen account created successfully! Redirecting you to sign in...',
        });
        setTimeout(() => {
          navigate('/login');
        }, 700);
      } else {
        setApiFeedback({
          type: 'error',
          message: result.error || 'Registration failed. Please review your details.',
        });
      }
    } catch {
      setApiFeedback({
        type: 'error',
        message: 'An unexpected connection error occurred during account registration.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout illustrationSide="left" pageKey="signup">
      <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left">
        {/* Main Heading - Sized up & bolder */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1.5">
          Create Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-5 leading-relaxed max-w-md">
          Register your verified citizen identity to report public infrastructure issues, monitor dispatch orders, and track resolution.
        </p>

        {/* Global Feedback Banner */}
        {apiFeedback && (
          <div
            role="alert"
            className={`w-full mb-4 p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5 transition-all animate-fadeIn ${
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

        {/* Sign-Up Form */}
        <form onSubmit={handleSubmit} noValidate className="w-full space-y-3.5 sm:space-y-4">
          {/* Email Field with Notched Label */}
          <FormField
            id="signup-email"
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

          {/* Phone no Field with Notched Label */}
          <FormField
            id="signup-phone"
            name="phone"
            label="Phone no"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter your phone no"
            autoComplete="tel"
            error={touched.phone ? errors.phone : undefined}
            disabled={loading}
            backgroundColor="#FAF6EB"
            required
          />

          {/* Password Field with Notched Label */}
          <div>
            <FormField
              id="signup-password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              autoComplete="new-password"
              error={touched.password ? errors.password : undefined}
              disabled={loading}
              backgroundColor="#FAF6EB"
              required
            />
            {/* Real-time Password Strength Meter */}
            <PasswordStrength password={formData.password} />
          </div>

          {/* Create Account Primary Button */}
          <div className="pt-1">
            <PrimaryButton type="submit" loading={loading} disabled={loading}>
              Create Account
            </PrimaryButton>
          </div>

          {/* Legal / Data Protection Assurance */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Citizen credentials protected under Municipal Public Privacy Act</span>
          </div>

          {/* Social Separator & Circular Buttons (Google, Facebook, Apple) */}
          <SocialAuthButtons actionText="sign up" />

          {/* Switch Link: "Already have an account? Sign in" */}
          <div className="text-center pt-1.5">
            <span className="text-[13.5px] sm:text-[14px] text-slate-600 font-medium">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600 rounded transition-colors"
              >
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
