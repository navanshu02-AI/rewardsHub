import React from 'react';

interface RecognitionCalloutProps {
  onOpenRecognition: () => void;
}

const RecognitionCallout: React.FC<RecognitionCalloutProps> = ({ onOpenRecognition }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Send recognition</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Highlight great work instantly</h2>
      <p className="mt-2 text-sm text-slate-600">
        Share a quick note of appreciation and celebrate wins across your team.
      </p>
      <button
        type="button"
        onClick={onOpenRecognition}
        data-testid="send-recognition-cta"
        className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Send recognition
      </button>
    </section>
  );
};

export default RecognitionCallout;
