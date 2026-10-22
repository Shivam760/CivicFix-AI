import React, { useState } from 'react';
import { Briefcase, KeyRound, UserRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PasswordStrength from '../../components/PasswordStrength';
import HomeLocationCard from '../../components/reports/HomeLocationCard';
import { ErrorBox, NoteBox, Section, btnPrimary, inputClass, labelClass } from '../../components/reports/ui';
import { changePassword, updateProfile } from '../../services/authService';
import { errorText } from '../../services/apiClient';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { ROLES, ROLE_LABELS } from '../../constants/roles';
import { evaluatePasswordStrength, validateName } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

/**
 * ProfilePage (/profile)
 * Every account manages its own profile (api-contract.md section 3):
 * change the name (PATCH /auth/me) and the password (PUT /auth/me/password).
 * Officials see their approved department and job title, read-only.
 * Citizens also set their private home location here.
 */
export default function ProfilePage() {
  useDocumentTitle('Profile settings · CivicFix AI');
  const user = useCurrentUser();
  if (!user) return null; // ProtectedRoute has already sent signed-out users to /login

  return (
    <DashboardLayout activeRole={user.role} title="Profile settings" subtitle="Your name, password and account details.">
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <div className="space-y-5 min-w-0">
          <AccountSection user={user} />
          {user.role === ROLES.OFFICIAL && <OfficialSection user={user} />}
        </div>
        <div className="space-y-5 min-w-0">
          <PasswordSection />
          {user.role === ROLES.CITIZEN && <HomeLocationCard />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function AccountSection({ user }) {
  const { showToast } = useToast();
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== user.name;

  const save = async (e) => {
    e.preventDefault();
    const check = validateName(name);
    if (!check.isValid) {
      setError(check.error);
      return;
    }
    setSaving(true);
    setError('');
    const res = await updateProfile({ name });
    setSaving(false);
    if (!res.ok) {
      setError(errorText(res.error));
      return;
    }
    setName(res.data.name);
    showToast({ type: 'success', title: 'Name saved', message: res.data.name });
  };

  return (
    <Section title="Account" icon={UserRound}>
      <form onSubmit={save} className="space-y-4" noValidate>
        <div>
          <label htmlFor="profile-name" className={labelClass}>Name</label>
          <input
            id="profile-name"
            value={name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            disabled={saving}
          />
          <p className="text-[11px] text-muted mt-1">Shown on reports only where you chose to show your name.</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="font-semibold text-muted">Email</dt>
          <dd className="text-navy break-all">{user.email}</dd>
          <dt className="font-semibold text-muted">Account</dt>
          <dd className="text-navy">{ROLE_LABELS[user.role] || user.role}</dd>
          <dt className="font-semibold text-muted">Member since</dt>
          <dd className="text-navy">{formatDate(user.created_at)}</dd>
        </dl>
        <p className="text-[11px] text-muted">The email is your sign-in and cannot be changed yet.</p>
        <ErrorBox>{error}</ErrorBox>
        <button type="submit" className={btnPrimary} disabled={saving || !changed}>
          {saving ? 'Saving...' : 'Save name'}
        </button>
      </form>
    </Section>
  );
}

function OfficialSection({ user }) {
  return (
    <Section title="Official details" icon={Briefcase}>
      {user.official_department ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs mb-3">
          <dt className="font-semibold text-muted">Department</dt>
          <dd className="text-navy">{user.official_department}</dd>
          <dt className="font-semibold text-muted">Job title</dt>
          <dd className="text-navy">{user.official_job_title}</dd>
          {user.reviewed_at && (
            <>
              <dt className="font-semibold text-muted">Approved</dt>
              <dd className="text-navy">{formatDate(user.reviewed_at)}</dd>
            </>
          )}
          {user.review_note && (
            <>
              <dt className="font-semibold text-muted">Admin's note</dt>
              <dd className="text-navy whitespace-pre-line">{user.review_note}</dd>
            </>
          )}
        </dl>
      ) : (
        <p className="text-xs text-muted mb-3">This official account was set up by an administrator, so there are no application details.</p>
      )}
      <NoteBox>An admin approved these details, so you can't change them here. Ask an admin if your job changes.</NoteBox>
    </Section>
  );
}

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

function PasswordSection() {
  const { showToast } = useToast();
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.current) found.current = 'Enter your current password.';
    const strength = evaluatePasswordStrength(form.next);
    if (!strength.isValid) found.next = strength.error;
    else if (form.next === form.current) found.next = 'The new password must be different from the current one.';
    if (form.confirm !== form.next) found.confirm = 'The two new passwords are not the same.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    const res = await changePassword({ currentPassword: form.current, newPassword: form.next });
    setSaving(false);
    if (!res.ok) {
      // Put a wrong current password next to that field.
      if (res.error.code === 'CURRENT_PASSWORD_INCORRECT') setErrors({ current: res.error.message });
      else if (res.error.code === 'PASSWORD_UNCHANGED') setErrors({ next: res.error.message });
      else setErrors({ form: errorText(res.error) });
      return;
    }
    setForm(EMPTY_PASSWORDS);
    showToast({ type: 'success', title: 'Password changed', message: 'Use the new password next time you sign in.' });
  };

  const field = (id, key, label, autoComplete) => (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type="password"
        value={form[key]}
        onChange={set(key)}
        autoComplete={autoComplete}
        maxLength={128}
        className={inputClass}
        disabled={saving}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${id}-error` : undefined}
      />
      {errors[key] && <p id={`${id}-error`} className="text-[11px] text-rose-600 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <Section title="Password" icon={KeyRound}>
      <form onSubmit={save} className="space-y-4" noValidate>
        {field('profile-current-password', 'current', 'Current password', 'current-password')}
        <div>
          {field('profile-new-password', 'next', 'New password', 'new-password')}
          <PasswordStrength password={form.next} />
        </div>
        {field('profile-confirm-password', 'confirm', 'New password again', 'new-password')}
        <ErrorBox>{errors.form}</ErrorBox>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Changing...' : 'Change password'}
        </button>
        <p className="text-[11px] text-muted">
          Other devices where you are signed in stay signed in until their session ends (at most an hour).
        </p>
      </form>
    </Section>
  );
}
