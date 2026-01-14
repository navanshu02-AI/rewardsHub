import React from 'react';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface RecognitionCalloutProps {
  onOpenRecognition: () => void;
}

const RecognitionCallout: React.FC<RecognitionCalloutProps> = ({ onOpenRecognition }) => {
  return (
    <Card as="section">
      <CardContent>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Send recognition</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Highlight great work instantly</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share a quick note of appreciation and celebrate wins across your team.
        </p>
        <Button type="button" onClick={onOpenRecognition} data-testid="send-recognition-cta" className="mt-4">
          Send recognition
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecognitionCallout;
