import { useEffect, useState } from 'react';

import { Button, PasswordInput, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';

import { get_runtime_config } from '@/RuntimeConfig';
import { RuntimeConfig } from '@/types';
import { useTranslation } from "react-i18next";
import TwoFactorVerification from '@/components/TwoFactorVerification/TwoFactorVerification';

function get_token_endpoint(): string {
  const base_url = import.meta.env.VITE_TOKEN_BASE_URL

  if (base_url) {
    return `${base_url}/api/token`
  }

  return `/api/token`
}

function get_redirect_endpoint(): string {
  const base_url = import.meta.env.VITE_REDIRECT_BASE_URL

  if (base_url) {
    return `${base_url}/home`
  }

  return `/home`
}


export default function Login() {
  const {t} = useTranslation()
  const [error, setError] = useState<string>()
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { username: '', password: '' },
  });
  const [submittedValues, setSubmittedValues] = useState<typeof form.values | null>(null);

  useEffect(() => {
    if (submittedValues?.password && submittedValues.username) {
       // only if both username and password are provided and not empty
      let config: RuntimeConfig | undefined = get_runtime_config();
      let provider = 'db';
      const username = submittedValues?.username
      const password = submittedValues?.password

      if (config) {
        provider = config.login_provider;
      }

      let body = JSON.stringify({username, password, provider});
      fetch(
        get_token_endpoint(),
        {
          method:'POST',
          body: body,
          headers: {
            "Content-Type": "application/json",
          }
        },
      )
      .then(response => response.json().then(data => ({ status: response.status, data })))
      .then(({ status, data }) => {
          console.log('Login response:', { status, data }); // Debug log
          if (status == 401) {
            setError("Username or password incorrect");
          } else if (status != 200) {
            setError(`Error: status code ${status}`);
          } else {
            // Check if 2FA is required - handle multiple possible response formats
            if (data.requires_2fa || data.temp_token) {
              setTempToken(data.temp_token);
              setUserId(data.user_id);
              setShowTwoFactor(true);
              setError(undefined);
            } else {
              // Regular login success
              let a = document.createElement('a');
              a.href = get_redirect_endpoint()
              a.click()
            }
          }
        }
      ).catch(error => {
        console.log(`There was an error ==='${error}'===`);
        setError("An error occurred during login");
      });
    }
  }, [submittedValues?.username, submittedValues?.password])

  const handleTwoFactorSuccess = () => {
    // This will be called when 2FA verification is successful
    // The TwoFactorVerification component handles the redirect
  };

  const handleBackToLogin = () => {
    setShowTwoFactor(false);
    setTempToken('');
    setUserId('');
    setError(undefined);
    form.reset();
  };

  if (showTwoFactor) {
    return (
      <TwoFactorVerification
        tempToken={tempToken}
        userId={userId}
        onSuccess={handleTwoFactorSuccess}
        onBack={handleBackToLogin}
      />
    );
  }

  return (
    <form onSubmit={form.onSubmit(setSubmittedValues)}>
        <TextInput
          {...form.getInputProps('username')}
          key={form.key('username')}
          label={t("username")}
          placeholder={t("username")}
          required />
        <PasswordInput
          {...form.getInputProps('password')}
          key={form.key('password')}
          label={t("password")}
          placeholder={t("your password")}
          required mt="md" />
        <Button fullWidth mt="xl" type="submit">
          {t("signin")}
        </Button>
        <Text my={"md"} c="red">
          {error}
        </Text>
    </form>
  );
}