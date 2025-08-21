import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './forgot-password.module.css';
import { Paper } from '@mantine/core';

export default function ForgotPassword() {
  // navigate
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSubmitted(true);

    // You can trigger a request to your backend here
    console.log('Submitting email for password reset:', email);
  };

  return (
    <div className={styles.forgotPassword}>
      <section className={styles.fPLeft}>
        <div className={styles.fPLeftImage}>
          <img src="./GenSys_BG.png" alt="Login illustration" />
          <div className={styles.overlay}></div>
        </div>
      </section>

      <section className={styles.fPRight}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          We’ll send password reset instructions to your registered email address.
        </p>


        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              placeholder="Enter your email address."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {error && <p className={styles.error}>{error}</p>}
            {submitted && !error && (
              <p className={styles.success}>Reset link sent to your email!</p>
            )}

            <button type="submit" className={styles.submitButton}>
              Send Reset Link
            </button>
          </form>
          <div className={styles.fpButtonBack} onClick={() => navigate(-1)}>Back to Login</div>
        </Paper>
      </section>
    </div>
  );
}