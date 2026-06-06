import { useState } from 'react';

export function useTransfer() {
  const [progress, setProgress] = useState(0);
  return { progress, setProgress };
}
