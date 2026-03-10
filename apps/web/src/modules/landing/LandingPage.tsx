import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ifmio:access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    } else {
      window.location.href = '/landing/index.html';
    }
  }, [navigate]);

  return null;
}
