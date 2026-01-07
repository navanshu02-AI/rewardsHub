import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

interface Reward {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_type: string;
  points_required: number;
  prices: {
    INR: number;
    USD: number;
    EUR: number;
  };
  original_prices?: {
    INR?: number;
    USD?: number;
    EUR?: number;
  };
  image_url?: string;
  brand?: string;
  vendor?: string;
  availability: number;
  delivery_time?: string;
  is_popular: boolean;
  rating?: number;
  review_count: number;
  tags: string[];
}

interface RedeemRewardModalProps {
  isOpen: boolean;
  reward: Reward | null;
  onClose: () => void;
  onSuccess: (rewardId: string, message?: string) => void;
}

const RedeemRewardModal: React.FC<RedeemRewardModalProps> = ({ isOpen, reward, onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const titleId = useMemo(() => `redeem-reward-title-${reward?.id || 'default'}`, [reward?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDeliveryAddress('');
    setError(null);
  }, [isOpen, reward?.id]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusFirstElement = () => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const timeout = window.setTimeout(focusFirstElement, 0);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const getFocusableElements = () => {
    if (!modalRef.current) {
      return [] as HTMLElement[];
    }
    const elements = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    return elements.filter((element) => !element.hasAttribute('disabled'));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!reward) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await axios.post(`${API}/rewards/redeem`, {
        reward_id: reward.id,
        delivery_address: deliveryAddress.trim() || undefined
      });
      await refreshUser();
      onSuccess(reward.id, response.data?.message);
      onClose();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'We could not redeem this reward. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !reward) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-gray-900">Redeem reward</h2>
            <p className="text-sm text-gray-500">Confirm the reward details before submitting.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close redemption modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-medium">Reward</span>
            <span>{reward.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Points required</span>
            <span className="text-blue-600 font-semibold">{reward.points_required} pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Availability</span>
            <span>{reward.availability} left</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="delivery-address">
              Delivery address (optional)
            </label>
            <textarea
              id="delivery-address"
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter an address if this reward needs shipping"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {submitting ? 'Redeeming...' : 'Confirm redeem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RedeemRewardModal;
