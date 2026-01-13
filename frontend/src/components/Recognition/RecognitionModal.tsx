import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

type RecognitionTypeOption = {
  value: string;
  label: string;
  helper?: string;
};

type MessageToneOption = {
  value: 'warm' | 'formal' | 'short' | 'enthusiastic';
  label: string;
};

type RecipientSummary = {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department?: string;
  manager_id?: string;
  avatar_url?: string;
};

type RecipientResponse = {
  recipients: RecipientSummary[];
  emptyMessage?: string | null;
};

type RecipientEligibilityEntry = {
  user_id: string;
  points_eligible: boolean;
  reason?: string | null;
};

interface RecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RECOGNITION_TYPES: RecognitionTypeOption[] = [
  { value: 'kudos', label: 'Kudos', helper: 'Send a thoughtful thank-you without points.' },
  { value: 'spot_award', label: 'Spot Award', helper: 'Recognise standout impact with points when eligible.' },
  { value: 'milestone', label: 'Milestone', helper: 'Celebrate tenure and personal achievements.' },
];

const MESSAGE_TONES: MessageToneOption[] = [
  { value: 'warm', label: 'Warm' },
  { value: 'formal', label: 'Formal' },
  { value: 'short', label: 'Short' },
  { value: 'enthusiastic', label: 'Enthusiastic' }
];

const VALUES_TAGS = [
  'Customer focus',
  'Ownership',
  'Collaboration',
  'Innovation',
  'Growth mindset',
  'Integrity',
];

const PRIVILEGED_ROLES: UserRole[] = ['hr_admin', 'executive', 'c_level'];
const MAX_RECIPIENTS = 5;
const MAX_RECIPIENTS_ERROR = `Select up to ${MAX_RECIPIENTS} recipients.`;

const RecognitionModal: React.FC<RecognitionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, refreshUser } = useAuth();
  const { aiEnabled } = useSettings();
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, RecipientEligibilityEntry>>({});
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recognitionType, setRecognitionType] = useState<string>(RECOGNITION_TYPES[0].value);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageToneOption['value']>('warm');
  const [points, setPoints] = useState<number>(10);
  const [valuesTags, setValuesTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const canConfigurePoints = useMemo(() => {
    if (!user) {
      return false;
    }
    return PRIVILEGED_ROLES.includes(user.role);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      lastFocusedElement.current = document.activeElement as HTMLElement | null;
      void loadRecipients();
    } else {
      resetForm();
      if (lastFocusedElement.current && document.contains(lastFocusedElement.current)) {
        lastFocusedElement.current.focus();
      }
    }
  }, [isOpen]);

  const resetForm = () => {
    setMessage('');
    setSelectedRecipients([]);
    setRecognitionType(RECOGNITION_TYPES[0].value);
    setMessageTone('warm');
    setPoints(10);
    setValuesTags([]);
    setIsPublic(true);
    setError(null);
  };

  const loadRecipients = async () => {
    setRecipientsLoading(true);
    setError(null);
    try {
      const response = await api.get<RecipientResponse>('/recognitions/recipients');
      const loadedRecipients = response.data?.recipients ?? [];
      setRecipients(loadedRecipients);
      setEligibilityMap({});
      const defaultRecipient = loadedRecipients[0];
      setSelectedRecipients(defaultRecipient ? [defaultRecipient.id] : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load recipients. Please try again later.');
    } finally {
      setRecipientsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedRecipients.length) {
      setEligibilityMap({});
      setEligibilityLoading(false);
      return;
    }
    let isActive = true;
    setEligibilityLoading(true);
    void api
      .post<RecipientEligibilityEntry[]>('/recognitions/eligibility', { to_user_ids: selectedRecipients })
      .then((response) => {
        if (!isActive) {
          return;
        }
        const nextMap = response.data.reduce<Record<string, RecipientEligibilityEntry>>((acc, entry) => {
          acc[entry.user_id] = entry;
          return acc;
        }, {});
        setEligibilityMap(nextMap);
      })
      .catch((err: any) => {
        if (!isActive) {
          return;
        }
        console.error('Unable to load eligibility', err);
        setEligibilityMap({});
      })
      .finally(() => {
        if (!isActive) {
          return;
        }
        setEligibilityLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [selectedRecipients]);

  const handleRecipientsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selections = Array.from(event.target.selectedOptions).map((option) => option.value);
    if (selections.length > MAX_RECIPIENTS) {
      setError(MAX_RECIPIENTS_ERROR);
      setSelectedRecipients(selections.slice(0, MAX_RECIPIENTS));
      return;
    }
    if (error === MAX_RECIPIENTS_ERROR) {
      setError(null);
    }
    setSelectedRecipients(selections);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (selectedRecipients.length === 0) {
      setError('Please select at least one teammate to recognise.');
      return;
    }

    if (!message.trim()) {
      setError('Share a short message to make the recognition meaningful.');
      return;
    }

    if (valuesTags.length < 1 || valuesTags.length > 3) {
      setError('Choose between 1 and 3 values to highlight.');
      return;
    }

    setSubmitting(true);
    try {
      const recipientPayload =
        selectedRecipients.length > 1
          ? { to_user_ids: selectedRecipients }
          : { to_user_id: selectedRecipients[0] };
      await api.post('/recognitions', {
        ...recipientPayload,
        recognition_type: recognitionType,
        message,
        points_awarded: shouldAwardPoints && canConfigurePoints ? points : undefined,
        values_tags: valuesTags,
        is_public: isPublic,
      });
      await refreshUser();
      onSuccess();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('We could not send that recognition. Please check the details and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImproveMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Add a message before requesting a suggestion.');
      return;
    }

    setAiLoading(true);
    setError(null);
    try {
      const response = await api.post<{ suggestion: string }>('/recognitions/assist-message', {
        message: trimmedMessage,
        tone: messageTone
      });
      if (response.data?.suggestion) {
        setMessage(response.data.suggestion);
      } else {
        setError('No suggestion was returned. Please try again.');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      setError(detail || 'We could not generate a suggestion right now. Please try again later.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleValueTag = (tag: string) => {
    setValuesTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((value) => value !== tag);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tag];
    });
  };

  const selectedRecipientsAreEligible = useMemo(() => {
    if (!selectedRecipients.length) {
      return false;
    }
    return selectedRecipients.every((recipientId) => eligibilityMap[recipientId]?.points_eligible);
  }, [eligibilityMap, selectedRecipients]);

  const shouldAwardPoints = recognitionType !== 'kudos' && selectedRecipientsAreEligible;

  const eligibilityHint = useMemo(() => {
    if (!selectedRecipients.length) {
      return null;
    }
    if (eligibilityLoading) {
      return null;
    }
    if (!shouldAwardPoints) {
      return 'Recognition only (no points)';
    }
    return 'Points will be awarded';
  }, [eligibilityLoading, selectedRecipients.length, shouldAwardPoints]);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(openState) => {
        if (!openState) {
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black bg-opacity-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(95vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl outline-none max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-2xl font-semibold text-gray-900">Celebrate a teammate</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500">
                Send a note of appreciation and reward points in seconds.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600" aria-label="Close recognition modal">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          {recipientsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <section>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700" htmlFor="recognition-recipient">
                    Choose recipients
                  </label>
                  <span className="text-xs text-gray-500">{selectedRecipients.length}/{MAX_RECIPIENTS} selected</span>
                </div>
                <select
                  id="recognition-recipient"
                  value={selectedRecipients}
                  onChange={handleRecipientsChange}
                  data-testid="recognition-recipient"
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!recipients.length}
                  multiple
                  size={Math.min(6, Math.max(3, recipients.length))}
                >
                  <option value="" disabled>
                    {recipients.length ? 'Select teammates' : 'No eligible teammates yet'}
                  </option>
                  {recipients.map((recipient) => (
                    <option key={recipient.id} value={recipient.id}>
                      {recipient.first_name} {recipient.last_name} · {recipient.role.replace('_', ' ')}
                      {recipient.department ? ` · ${recipient.department}` : ''}
                    </option>
                  ))}
                </select>
                {eligibilityHint && (
                  <p className="mt-2 text-xs text-gray-500">{eligibilityHint}</p>
                )}
                {!recipients.length && (
                  <p className="mt-2 text-sm text-gray-500">
                    Need to recognise someone outside this list? Reach out to your manager or HR partner.
                  </p>
                )}
              </section>

              <section>
                <label className="block text-sm font-medium text-gray-700" htmlFor="recognition-type">
                  Recognition type
                </label>
                <select
                  id="recognition-type"
                  value={recognitionType}
                  onChange={(event) => setRecognitionType(event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {RECOGNITION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {RECOGNITION_TYPES.find((type) => type.value === recognitionType)?.helper && (
                  <p className="mt-2 text-sm text-gray-500">
                    {RECOGNITION_TYPES.find((type) => type.value === recognitionType)?.helper}
                  </p>
                )}
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Company values</label>
                  <span className="text-xs text-gray-500">{valuesTags.length}/3 selected</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Select up to three values that best reflect this recognition.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {VALUES_TAGS.map((tag) => {
                    const isSelected = valuesTags.includes(tag);
                    const isDisabled = !isSelected && valuesTags.length >= 3;
                    const tagSlug = tag.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleValueTag(tag)}
                        disabled={isDisabled}
                        data-testid={`recognition-value-${tagSlug}`}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : isDisabled
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <label className="block text-sm font-medium text-gray-700" htmlFor="recognition-message">
                  Appreciation message
                </label>
                <textarea
                  id="recognition-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  data-testid="recognition-message"
                  rows={4}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Share what they did brilliantly..."
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Tone</span>
                    <select
                      value={messageTone}
                      onChange={(event) => setMessageTone(event.target.value as MessageToneOption['value'])}
                      className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {MESSAGE_TONES.map((tone) => (
                        <option key={tone.value} value={tone.value}>
                          {tone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {aiEnabled && (
                    <>
                      <button
                        type="button"
                        onClick={handleImproveMessage}
                        disabled={aiLoading || !message.trim()}
                        className="inline-flex items-center rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {aiLoading && (
                          <svg className="-ml-1 mr-2 h-3 w-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                        )}
                        Improve with AI
                      </button>
                      <p className="text-xs text-gray-400">AI suggests a rewrite you can edit before sending.</p>
                    </>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700" htmlFor="recognition-public">
                      Show on feed
                    </label>
                    <p className="text-xs text-gray-500">
                      Public recognitions appear in the company feed.
                    </p>
                  </div>
                  <input
                    id="recognition-public"
                    type="checkbox"
                    checked={isPublic}
                    onChange={(event) => setIsPublic(event.target.checked)}
                    data-testid="recognition-public-toggle"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </section>

              {shouldAwardPoints && (
                <section>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Reward points</span>
                    {canConfigurePoints ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={10}
                          max={10000}
                          value={points}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (!Number.isNaN(value)) {
                              setPoints(Math.min(10000, Math.max(10, value)));
                            }
                          }}
                          data-testid="recognition-points"
                          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-right shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-500">points</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Peers award a standard 10 points for each recognition. Leaders can request additional points from HR.
                      </span>
                    )}
                  </div>
                </section>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="recognition-submit"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {submitting && (
                    <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  )}
                  Send recognition
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RecognitionModal;
