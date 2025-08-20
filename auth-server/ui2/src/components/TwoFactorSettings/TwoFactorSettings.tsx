import { useState, useEffect } from 'react';
import { 
  Stack, 
  Title, 
  Text, 
  Button, 
  Switch, 
  TextInput,
  Alert,
  Group,
  Card
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { IconShield, IconMail, IconCheck, IconX } from '@tabler/icons-react';

function get_api_base(): string {
  const base_url = import.meta.env.VITE_TOKEN_BASE_URL;
  if (base_url) {
    return base_url;
  }
  return '';
}

interface TwoFactorSettingsProps {
  token: string; // User's authentication token
}

export default function TwoFactorSettings({ token }: TwoFactorSettingsProps) {
  const { t } = useTranslation();
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);
  
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { otpCode: '' },
    validate: {
      otpCode: (value) => 
        !value ? 'Verification code is required' : 
        value.length !== 6 ? 'Verification code must be 6 digits' : null,
    },
  });

  // Load current 2FA status
  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      const response = await fetch(`${get_api_base()}/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIs2FAEnabled(data.is_2fa_enabled);
      } else {
        setError('Failed to load 2FA status');
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
      setError('Failed to load 2FA status');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtpCode = async (purpose: 'setup' | 'disable') => {
    setIsSubmitting(true);
    setError(undefined);
    
    try {
      const endpoint = purpose === 'setup' ? '/2fa/setup/send-otp' : '/2fa/disable/send-otp';
      const response = await fetch(`${get_api_base()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setShowOtpInput(true);
        setPendingAction(purpose === 'setup' ? 'enable' : 'disable');
        setSuccess('Verification code sent to your email');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError('Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndToggle2FA = async (values: { otpCode: string }) => {
    if (!pendingAction) return;
    
    setIsSubmitting(true);
    setError(undefined);
    
    try {
      const response = await fetch(`${get_api_base()}/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enable: pendingAction === 'enable',
          otp_code: values.otpCode,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setIs2FAEnabled(pendingAction === 'enable');
        setShowOtpInput(false);
        setPendingAction(null);
        form.reset();
      } else {
        const data = await response.json();
        setError(data.detail || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError('Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle2FA = async () => {
    if (is2FAEnabled) {
      // Disable 2FA
      await sendOtpCode('disable');
    } else {
      // Enable 2FA
      await sendOtpCode('setup');
    }
  };

  const handleCancel = () => {
    setShowOtpInput(false);
    setPendingAction(null);
    setError(undefined);
    setSuccess(undefined);
    form.reset();
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Card withBorder shadow="sm" p="lg" radius="md">
      <Stack>
        <Group>
          <IconShield size={24} />
          <Title order={3}>Two-Factor Authentication</Title>
        </Group>
        
        <Text size="sm" c="dimmed">
          Add an extra layer of security to your account by requiring a verification 
          code sent to your email address when signing in.
        </Text>

        {!showOtpInput ? (
          <Stack>
            <Group justify="space-between">
              <Group>
                <Text fw={500}>Enable Two-Factor Authentication</Text>
                {is2FAEnabled ? (
                  <IconCheck size={16} color="green" />
                ) : (
                  <IconX size={16} color="red" />
                )}
              </Group>
              
              <Switch
                checked={is2FAEnabled}
                onChange={handleToggle2FA}
                disabled={isSubmitting}
                size="md"
              />
            </Group>
            
            <Text size="xs" c="dimmed">
              Status: {is2FAEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Stack>
        ) : (
          <Stack>
            <Alert icon={<IconMail size="1rem" />} color="blue">
              A verification code has been sent to your email address. 
              Enter the code below to {pendingAction} two-factor authentication.
            </Alert>
            
            <form onSubmit={form.onSubmit(verifyAndToggle2FA)}>
              <TextInput
                {...form.getInputProps('otpCode')}
                key={form.key('otpCode')}
                label="Verification Code"
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}
              />
              
              <Group mt="md">
                <Button 
                  type="submit" 
                  loading={isSubmitting}
                  disabled={!form.values.otpCode || form.values.otpCode.length !== 6}
                >
                  Verify & {pendingAction === 'enable' ? 'Enable' : 'Disable'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </Group>
            </form>
          </Stack>
        )}
        
        {error && (
          <Alert color="red">
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert color="green">
            {success}
          </Alert>
        )}
      </Stack>
    </Card>
  );
}
