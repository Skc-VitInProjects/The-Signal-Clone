'use client';

import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

interface StatusIconProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  size?: number;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ status, size = 14 }) => {
  switch (status) {
    case 'sending':
      return <Clock size={size} style={{ opacity: 0.7 }} />;
    case 'sent':
      return <Check size={size} style={{ opacity: 0.8 }} />;
    case 'delivered':
      return <CheckCheck size={size} style={{ opacity: 0.8 }} />;
    case 'read':
      return <CheckCheck size={size} color="#60a5fa" strokeWidth={2.5} />;
    default:
      return null;
  }
};
