import styles from './login.module.css';

import { Paper } from '@mantine/core';
import DBLogin from "@/components/DBLogin/DBLogin";

export function LoginPage() {
  return (
    <div className={styles.loginPage}>
      {/* Left */}
      <section className={styles.loginLeft}>
        <div className={styles.loginLeftImage}>
          <img src="./GenSys_BG.png" alt="Login illustration" />
          <div className={styles.overlay}></div>
        </div>
      </section>

      {/* Right */}
      <section className={styles.loginRight}>
        <h1 className={styles.title}>GenSys DMS</h1>
        <p className={styles.subtitle}>
          Open Source Document Management System for Digital Archives
        </p>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <DBLogin />
          <a className={styles.forgotPasswordNavigate} href="/forgot-password">Forgot your password?</a>
        </Paper>
      </section>
    </div>
  );
}
