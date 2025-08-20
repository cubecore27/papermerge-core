import { useEffect, useState } from 'react';
import { Button, Text, TextInput, Stack, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { IconInfoCircle } from '@tabler/icons-react';

interface TwoFactorVerificationProps {
  tempToken: string;
  userId: string;
  onSuccess: () => void;
  onBack: () => void;
}

function get_2fa_verify_endpoint(): string {
  const base_url = import.meta.env.VITE_TOKEN_BASE_URL

  if (base_url) {
    return `${base_url}/api/2fa/verify`
  }

  return `/api/2fa/verify`
}

function get_redirect_endpoint(): string {
  const base_url = import.meta.env.VITE_REDIRECT_BASE_URL

  if (base_url) {
    return `${base_url}/home`
  }

  return `/home`
}

export default function TwoFactorVerification({ 
  tempToken, 
  userId, 
  onSuccess, 
  onBack 
}: TwoFactorVerificationProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { otpCode: '' },
    validate: {
      otpCode: (value) => 
        !value ? 'Verification code is required' : 
        value.length !== 6 ? 'Verification code must be 6 digits' : null,
    },
  });

  const handleSubmit = async (values: { otpCode: string }) => {
    setIsSubmitting(true);
    setError(undefined);
    
    try {
      const response = await fetch(get_2fa_verify_endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          otp_code: values.otpCode,
          purpose: 'login',
        }),
      });

      if (response.status === 401) {
        setError('Invalid verification code. Please try again.');
      } else if (response.status === 200) {
        // Success - redirect to home
        const a = document.createElement('a');
        a.href = get_redirect_endpoint();
        a.click();
        onSuccess();
      } else {
        setError(`Error: status code ${response.status}`);
      }
    } catch (error) {
      console.error('2FA verification error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack>
      <Alert 
        icon={<IconInfoCircle size="1rem" />} 
        title="Two-Factor Authentication"
        color="blue"
      >
        A verification code has been sent to your email address. 
        Please enter the 6-digit code below to complete your login.
      </Alert>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          {...form.getInputProps('otpCode')}
          key={form.key('otpCode')}
          label="Verification Code"
          placeholder="Enter 6-digit code"
          maxLength={6}
          required
          style={{ fontFamily: 'monospace', fontSize: '1.2rem', textAlign: 'center' }}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setOtpValue(value);
            form.getInputProps('otpCode').onChange?.(event);
          }}
        />
        
        <Stack mt="md" gap="sm">
          <Button 
            fullWidth 
            type="submit" 
            loading={isSubmitting}
            disabled={!otpValue || otpValue.length !== 6}
          >
            Verify Code
          </Button>
          
          <Button 
            fullWidth 
            variant="outline" 
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back to Login
          </Button>
        </Stack>
        
        {error && (
          <Text c="red" mt="md" size="sm">
            {error}
          </Text>
        )}
      </form>
    </Stack>
  );
}
