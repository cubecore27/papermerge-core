import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import styles from './reset-password.module.css';
import { Paper } from '@mantine/core';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!token) {
      setError('No reset token provided.');
      return;
    }

    // Verify token validity
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/verify-reset-token/${token}`);
        
        if (response.ok) {
          const data = await response.json();
          setTokenValid(true);
          setUsername(data.username);
        } else {
          setTokenValid(false);
          setError('Invalid or expired reset token.');
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setTokenValid(false);
        setError('Network error. Please check your connection.');
      }
    };
//
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className={styles.resetPassword}>
        <section className={styles.rPLeft}>
          <div className={styles.rPLeftImage}>
            <img src="./GenSys_BG.png" alt="Reset password illustration" />
            <div className={styles.overlay}></div>
          </div>
        </section>

        <section className={styles.rPRight}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Verifying reset token...</p>
        </section>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className={styles.resetPassword}>
        <section className={styles.rPLeft}>
          <div className={styles.rPLeftImage}>
            <img src="./GenSys_BG.png" alt="Reset password illustration" />
            <div className={styles.overlay}></div>
          </div>
        </section>

        <section className={styles.rPRight}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Invalid or expired reset token.</p>
          
          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <p className={styles.error}>The reset link is invalid or has expired. Please request a new password reset.</p>
            <div className={styles.rPButtonBack} onClick={() => navigate('/forgot-password')}>
              Request New Reset Link
            </div>
          </Paper>
        </section>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.resetPassword}>
        <section className={styles.rPLeft}>
          <div className={styles.rPLeftImage}>
            <img src="./GenSys_BG.png" alt="Reset password illustration" />
            <div className={styles.overlay}></div>
          </div>
        </section>

        <section className={styles.rPRight}>
          <h1 className={styles.title}>Password Reset Successful</h1>
          <p className={styles.subtitle}>Your password has been successfully reset.</p>
          
          <Paper withBorder shadow="md" p={30} mt={30} radius="md">
            <p className={styles.success}>You will be redirected to the login page in a few seconds...</p>
            <div className={styles.rPButtonBack} onClick={() => navigate('/login')}>
              Go to Login
            </div>
          </Paper>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.resetPassword}>
      <section className={styles.rPLeft}>
        <div className={styles.rPLeftImage}>
          <img src="./GenSys_BG.png" alt="Reset password illustration" />
          <div className={styles.overlay}></div>
        </div>
      </section>

      <section className={styles.rPRight}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Hello {username}, please enter your new password.
        </p>

        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="password" className={styles.label}>New Password</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              className={styles.input}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <div className={styles.rPButtonBack} onClick={() => navigate('/login')}>
            Back to Login
          </div>
        </Paper>
      </section>
    </div>
  );
}
