import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import FormField from '../components/FormField';
import AccountTypeToggle from '../components/AccountTypeToggle';
import PrimaryButton from '../components/PrimaryButton';
import PasswordStrength from '../components/PasswordStrength';
import {
  validateEmail,
  validateName,
  evaluatePasswordStrength,
  validateDepartment,
  validateJobTitle,
} from '../utils/validation';
import { ACCOUNT_TYPES } from '../constants/roles';
import { registerUser } from '../services/authService';
import { errorText } from '../services/apiClient';
import { AlertCircle, CheckCircle2, ShieldCheck, Info } from 'lucide-react';

const VALIDATORS = {
  name: validateName,
  email: validateEmail,
  password: evaluatePasswordStrength,
  department: validateDepartment,
  jobTitle: validateJobTitle,
};

// The fields each account type fills in.
const FIELDS = {
  [ACCOUNT_TYPES.CITIZEN]: ['name', 'email', 'password'],
  [ACCOUNT_TYPES.OFFICIAL]: ['name', 'email', 'password', 'department', 'jobTitle'],
};

/**
 * SignUpPage
 * POST /auth/register creates a citizen account, or an official account that
 * waits for an admin (plus department and job title). Then we go to the
 * login page so the user signs in.
 */
export default function SignUpPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    accountType: ACCOUNT_TYPES.CITIZEN,
    name: '',
    email: '',
    password: '',
    department: '',
    jobTitle: '',
  });
  const isOfficial = formData.accountType === ACCOUNT_TYPES.OFFICIAL;
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiFeedback, setApiFeedback] = useState(null); // { type: 'error' | 'success', message }

  const validateField = (name, value) => {
    const res = VALIDATORS[name](value);
    setErrors((prev) => ({ ...prev, [name]: res.error }));
    return res.isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) validateField(name, value);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiFeedback(null);
    const fields = FIELDS[formData.accountType];
    setTouched(Object.fromEntries(fields.map((field) => [field, true])));
    const allValid = fields
      .map((field) => validateField(field, formData[field]))
      .every(Boolean);
    if (!allValid) return;

    setLoading(true);
    const result = await registerUser(formData);
    setLoading(false);

    if (result.ok) {
      // Go to the login page with the email filled in and a success message.
      navigate('/login', {
        state: { registeredEmail: result.data.email, accountType: formData.accountType },
      });
    } else {
      // e.g. 409 EMAIL_TAKEN: "An account with this email already exists."
      setApiFeedback({ type: 'error', message: errorText(result.error) });
    }
  };

  return (
    <AuthLayout illustrationSide="left" pageKey="signup">
      <div className="w-full flex flex-col items-center lg:items-start text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1.5">
          Create Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-5 leading-relaxed max-w-md">
          {isOfficial
            ? 'Apply for an official account to work on reports in your area. An admin checks it first.'
            : 'Create a citizen account to report civic problems and follow what happens to them.'}
        </p>

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

        <form onSubmit={handleSubmit} noValidate className="w-full space-y-3.5 sm:space-y-4">
          <AccountTypeToggle
            name="signup-account-type"
            legend="I am a"
            value={formData.accountType}
            onChange={(accountType) => setFormData((prev) => ({ ...prev, accountType }))}
            disabled={loading}
          />

          <FormField
            id="signup-name"
            name="name"
            label="Name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Your name"
            autoComplete="name"
            error={touched.name ? errors.name : undefined}
            disabled={loading}
            required
          />

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
            required
          />

          <div>
            <FormField
              id="signup-password"
              name="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="At least 8 characters, letters and numbers"
              autoComplete="new-password"
              error={touched.password ? errors.password : undefined}
              disabled={loading}
              required
            />
            <PasswordStrength password={formData.password} />
          </div>

          {isOfficial && (
            <>
              <FormField
                id="signup-department"
                name="department"
                label="Department"
                type="text"
                value={formData.department}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Municipal Corporation, Roads"
                autoComplete="organization"
                error={touched.department ? errors.department : undefined}
                disabled={loading}
                required
              />
              <FormField
                id="signup-job-title"
                name="jobTitle"
                label="Job title"
                type="text"
                value={formData.jobTitle}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g. Junior Engineer"
                autoComplete="organization-title"
                error={touched.jobTitle ? errors.jobTitle : undefined}
                disabled={loading}
                required
              />
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 text-left leading-relaxed">
                <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  An admin confirms your job with your department before you can use the official
                  pages. Until then you can only see the status of your application.
                </span>
              </div>
            </>
          )}

          <div className="pt-1">
            <PrimaryButton type="submit" loading={loading} disabled={loading}>
              {isOfficial ? 'Send application' : 'Create Account'}
            </PrimaryButton>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium pt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Your password is stored only as a secure hash.</span>
          </div>

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
