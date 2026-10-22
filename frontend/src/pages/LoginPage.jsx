import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import AccountTypeToggle from '../components/AccountTypeToggle';
import PrimaryButton from '../components/PrimaryButton';
import { validateEmail, validateLoginPassword } from '../utils/validation';
import { loginUser } from '../services/authService';
import { errorText } from '../services/apiClient';
import { ACCOUNT_TYPES, homePathFor } from '../constants/roles';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [formData, setFormData] = useState(() => {
    const rememberedEmail = localStorage.getItem('civicfix_remembered_email') || '';
    const rememberedType = localStorage.getItem('civicfix_remembered_account_type');
    return {
      // Just signed up? Fill in that email.
      email: location.state?.registeredEmail || rememberedEmail,
      password: '',
      rememberMe: Boolean(rememberedEmail),
      // Citizen or Official: from sign-up, else the remembered choice, else Citizen.
      accountType: location.state?.accountType || rememberedType || ACCOUNT_TYPES.CITIZEN,
    };
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiFeedback, setApiFeedback] = useState(() => {
    if (location.state?.registeredEmail && location.state?.accountType === ACCOUNT_TYPES.OFFICIAL) {
      return {
        type: 'success',
        message: 'Application sent. An admin will check it. Sign in as Official to see its status.',
      };
    }
    if (location.state?.registeredEmail) {
      return { type: 'success', message: 'Account created. Please sign in with your new password.' };
    }
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
      localStorage.setItem('civicfix_remembered_account_type', formData.accountType);
    } else {
      localStorage.removeItem('civicfix_remembered_email');
      localStorage.removeItem('civicfix_remembered_account_type');
    }

    setLoading(true);

    // POST /auth/login, then GET /auth/me for the name, role and approval status.
    const result = await loginUser({
      email: formData.email,
      password: formData.password,
      accountType: formData.accountType,
    });
    setLoading(false);

    if (result.ok) {
      showToast({ type: 'success', title: 'Signed in', message: `Welcome back, ${result.user.name}.` });
      setApiFeedback({ type: 'success', message: 'Signed in. Opening your dashboard...' });
      // Go back to the page that sent us here, or to this account's home
      // (a pending or rejected official lands on their application).
      const from = location.state?.from?.pathname;
      const home = homePathFor(result.user);
      const homePrefix = home.split('/')[1];
      navigate(from && from.startsWith(`/${homePrefix}/`) ? from : home, { replace: true });
    } else {
      // INVALID_CREDENTIALS: same message for a wrong password and an unknown email.
      // WRONG_ACCOUNT_TYPE: e.g. "This is a citizen account. Choose Citizen to sign in."
      setApiFeedback({ type: 'error', message: errorText(result.error) });
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
          Sign in to report civic issues and follow what happens to them.
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
          <AccountTypeToggle
            name="login-account-type"
            legend="Sign in as"
            hints={{
              citizen: 'Report problems and follow what happens to them.',
              official: 'For officials and admins. New officials see their application here.',
            }}
            value={formData.accountType}
            onChange={(accountType) => setFormData((prev) => ({ ...prev, accountType }))}
            disabled={loading}
          />

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
              required
            />

            {/* Remember Me (stores only the email address, never the password) */}
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
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <PrimaryButton type="submit" loading={loading} disabled={loading}>
              Login
            </PrimaryButton>
          </div>

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
