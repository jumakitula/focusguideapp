import { useState, useEffect } from 'react';

const EMAIL_KEY = 'focusguard_user_email';

export function useAuth() {
  const [email, setEmailState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(EMAIL_KEY);
    if (stored) {
      setEmailState(stored);
    }
    setIsLoading(false);
  }, []);

  const setEmail = (newEmail: string) => {
    localStorage.setItem(EMAIL_KEY, newEmail);
    setEmailState(newEmail);
  };

  const logout = () => {
    localStorage.removeItem(EMAIL_KEY);
    setEmailState(null);
  };

  return { email, setEmail, logout, isLoading };
}
