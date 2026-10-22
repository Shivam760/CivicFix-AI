import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, XCircle, LogOut } from 'lucide-react';
import AuthLayout from '../../components/AuthLayout';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import { fetchCurrentUser, signOutUser, updateOfficialApplication } from '../../services/authService';
import { errorText } from '../../services/apiClient';
import { APPROVAL, homePathFor, isAwaitingApproval } from '../../constants/roles';
import { validateDepartment, validateJobTitle } from '../../utils/validation';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const VALIDATORS = { department: validateDepartment, jobTitle: validateJobTitle };

/**
 * PendingApprovalPage (/account/pending)
 * What a pending or rejected official sees: their application, the admin's
 * note, and a form to correct the details and apply again
 * (PUT /auth/me/official-application). The backend refuses every other page
 * until an admin approves them (403 ACCOUNT_NOT_APPROVED).
 */
export default function PendingApprovalPage() {
  useDocumentTitle('Your application · CivicFix AI');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ department: '', jobTitle: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Always ask the server (GET /auth/me): an admin may have decided since the user signed in.
  const showAccount = useCallback((res) => {
    if (!res.ok) {
      setLoadError(errorText(res.error));
      return;
    }
    setLoadError(null);
    setUser(res.data);
    setForm({
      department: res.data.official_department || '',
      jobTitle: res.data.official_job_title || '',
    });
  }, []);

  useEffect(() => {
    // ignore: a reply that arrives after leaving the page changes nothing.
    let ignore = false;
    fetchCurrentUser().then((res) => {
      if (!ignore) showAccount(res);
    });
    return () => {
      ignore = true;
    };
  }, [showAccount]);

  const checkAgain = async () => {
    setChecking(true);
    showAccount(await fetchCurrentUser());
    setChecking(false);
  };

  const rejected = user?.approval_status === APPROVAL.REJECTED;
  const showForm = rejected || editing;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: VALIDATORS[name](value).error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    const found = Object.fromEntries(
      Object.entries(VALIDATORS).map(([field, validate]) => [field, validate(form[field]).error])
    );
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    const res = await updateOfficialApplication(form);
    setSaving(false);
    if (!res.ok) {
      setSaveError(errorText(res.error));
      return;
    }
    setUser(res.data);
    setEditing(false);
    showToast({ type: 'success', title: 'Application sent', message: 'An admin will check it again.' });
  };

  const signOut = () => {
    signOutUser();
    navigate('/login', { replace: true });
  };

  return (
    <AuthLayout illustrationSide="center" pageKey="pending">
      <div className="w-full flex flex-col text-left space-y-5">
        {loadError && (
          <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-300 text-sm text-red-900 flex gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        )}

        {!user && !loadError && <p className="text-sm text-slate-600">Loading your application…</p>}

        {user && !isAwaitingApproval(user) && (
          // Approved since signing in (or not an official at all).
          <section className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" aria-hidden="true" />
              Your account is approved
            </h1>
            <PrimaryButton type="button" onClick={() => navigate(homePathFor(user), { replace: true })}>
              Open your dashboard
            </PrimaryButton>
          </section>
        )}

        {user && isAwaitingApproval(user) && (
          <>
            <header className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
                {rejected ? (
                  <XCircle className="w-7 h-7 text-red-600" aria-hidden="true" />
                ) : (
                  <Clock className="w-7 h-7 text-amber-600" aria-hidden="true" />
                )}
                {rejected ? 'Application not approved' : 'Waiting for an admin'}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {rejected
                  ? 'An admin could not approve your official account yet. Read the note, correct your details and send the application again.'
                  : 'An admin will confirm your job with your department, outside the app, before you can use the official pages. Check back later.'}
              </p>
            </header>

            {rejected && user.review_note && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-sm text-amber-950">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">Note from the admin</div>
                <p className="whitespace-pre-line">{user.review_note}</p>
              </div>
            )}

            {!showForm && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 rounded-2xl bg-white border border-slate-200 text-sm">
                <dt className="font-semibold text-slate-500">Name</dt>
                <dd className="text-slate-900">{user.name}</dd>
                <dt className="font-semibold text-slate-500">Department</dt>
                <dd className="text-slate-900">{user.official_department || '—'}</dd>
                <dt className="font-semibold text-slate-500">Job title</dt>
                <dd className="text-slate-900">{user.official_job_title || '—'}</dd>
                <dt className="font-semibold text-slate-500">Sent</dt>
                <dd className="text-slate-900">{user.applied_at ? formatDate(user.applied_at) : '—'}</dd>
              </dl>
            )}

            {showForm ? (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <FormField
                  id="application-department"
                  name="department"
                  label="Department"
                  type="text"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="e.g. Municipal Corporation, Roads"
                  autoComplete="organization"
                  error={errors.department}
                  disabled={saving}
                  required
                />
                <FormField
                  id="application-job-title"
                  name="jobTitle"
                  label="Job title"
                  type="text"
                  value={form.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Junior Engineer"
                  autoComplete="organization-title"
                  error={errors.jobTitle}
                  disabled={saving}
                  required
                />
                {saveError && (
                  <p role="alert" className="text-sm text-red-700">{saveError}</p>
                )}
                <PrimaryButton type="submit" loading={saving} disabled={saving}>
                  {rejected ? 'Send again' : 'Save details'}
                </PrimaryButton>
                {editing && (
                  <button type="button" onClick={() => setEditing(false)} className="w-full text-sm font-semibold text-slate-600 hover:text-slate-900">
                    Cancel
                  </button>
                )}
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={checkAgain}
                  disabled={checking}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Check again
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Correct my details
                </button>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          onClick={signOut}
          className="self-start inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </AuthLayout>
  );
}
