import React, { useState } from 'react';
import { Share2, ThumbsUp } from 'lucide-react';
import { Section, ErrorBox, btnPrimary } from './ui';
import ShareChoice from './ShareChoice';

/**
 * SharingPanel (owner)
 * PUT /reports/{id}/sharing: share the report with residents within 2 km,
 * under the owner's name or anonymously (api-contract.md section 12).
 *
 * Props: report, busy, error, onSave(shared, showName) -> Promise<boolean>
 */
export default function SharingPanel({ report, busy, error, onSave }) {
  const isShared = report.shared_at != null;
  const [shared, setShared] = useState(isShared);
  const [showName, setShowName] = useState(report.show_name);
  const changed = shared !== isShared || showName !== report.show_name;
  const cannotShare =
    report.status === 'closed'
      ? 'A closed report cannot be shared.'
      : report.latitude == null || report.longitude == null
      ? 'Add the exact spot on the map (Edit) before sharing.'
      : '';

  return (
    <Section title="Sharing with neighbours" icon={Share2}>
      <div className="space-y-3">
        <p className="text-xs text-muted">
          {isShared
            ? `Shared ${report.show_name ? 'under your name' : 'anonymously'}: residents within 2 km see it on their Nearby issues page.`
            : 'Private: only you and officials can see this report.'}
        </p>
        {report.support_count > 0 && (
          <p className="text-xs font-semibold text-navy flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5 text-primary" />
            {report.support_count} resident{report.support_count === 1 ? '' : 's'} said they see this too.
          </p>
        )}

        <ShareChoice
          idPrefix="detail"
          shared={shared}
          showName={showName}
          disabled={busy}
          cannotShare={cannotShare}
          onChange={(nextShared, nextShowName) => {
            setShared(nextShared);
            setShowName(nextShowName);
          }}
        />
        <ErrorBox>{error}</ErrorBox>
        <button type="button" className={btnPrimary} disabled={busy || !changed} onClick={() => onSave(shared, showName)}>
          {busy ? 'Saving...' : 'Save sharing'}
        </button>
      </div>
    </Section>
  );
}
