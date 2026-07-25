import { useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PhoneInput } from '@/components/phone-input';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';

import { AuthSplitLayout } from '@/layouts/auth-split';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ApiError, UserRole } from '@/types/api';

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' },
];

type WizardStep = 1 | 2 | 3;

export const SellerRegisterPage = () => {
  const { isAuthenticated, loginWithPassword } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState<WizardStep>(1);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pincode, setPincode] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [referralCode, setReferralCode] = useState('');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resending, setResending] = useState(false);

  // Flow state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  // ─── Step 1: register ────────────────────────────────────────────────────
  const submitRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Name is required (min 2 characters).');
      return;
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(mobile.trim())) {
      setError('Enter a valid mobile number (e.g. +91XXXXXXXXXX).');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('Pincode must be 6 digits.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        '/auth/register',
        {
          role: UserRole.SELLER,
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim() || undefined,
          password,
          pincode: pincode.trim(),
          preferredLanguage,
          referredByCouponCode: referralCode.trim().toUpperCase() || undefined,
        },
        { skipAuth: true },
      );

      // Send OTP to mobile for registration purpose.
      await api.post(
        '/auth/otp/send',
        { channel: 'mobile', identifier: mobile.trim(), purpose: 'registration' },
        { skipAuth: true },
      );

      setOtpSent(true);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step 2: verify OTP + auto-login ─────────────────────────────────────
  const resendOtp = async () => {
    setError(null);
    setResending(true);
    try {
      await api.post(
        '/auth/otp/send',
        { channel: 'mobile', identifier: mobile.trim(), purpose: 'registration' },
        { skipAuth: true },
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const submitVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,8}$/.test(otpCode.trim())) {
      setError('Enter the OTP digits from the SMS.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        '/auth/otp/verify',
        {
          channel: 'mobile',
          identifier: mobile.trim(),
          purpose: 'registration',
          code: otpCode.trim(),
        },
        { skipAuth: true },
      );

      // OTP verified → user is now active. Auto-login with the password they
      // just set so they land directly on the onboarding wizard.
      await loginWithPassword({ identifier: mobile.trim(), password, channel: 'mobile' });

      setStep(3);
      setTimeout(() => navigate('/seller/onboarding', { replace: true }), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      section={{
        title: 'Sell fresh, sell desi',
        subtitle: 'Reach buyers in your cluster. Free to join — quick verification, then KYC.',
        imgUrl: '/assets/illustrations/illustration-rocket-large.webp',
      }}
    >
      <Stack spacing={1} sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h5">Become a Buy Desi seller</Typography>
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Already have an account?
          </Typography>
          <Link component={RouterLink} to="/login" variant="subtitle2">
            Sign in
          </Link>
        </Stack>
      </Stack>

      <Stepper activeStep={step - 1} alternativeLabel sx={{ mb: 4 }}>
        {['Sign up', 'Verify', 'Done'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {step === 1 && (
        <form onSubmit={submitRegister}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s.'-]/g, ''))}
              autoComplete="name"
              required
              InputLabelProps={{ shrink: true }}
            />
            <PhoneInput
              fullWidth
              label="Mobile"
              country="IN"
              value={mobile}
              onChange={(v) => setMobile(v ?? '')}
              helperText="We'll send a 6-digit OTP to this number."
              required
            />
            <TextField
              fullWidth
              label="Pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              helperText="Decides which cluster you're routed to."
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="email"
              label="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              select
              label="Preferred language"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              {LANG_OPTIONS.map((l) => (
                <MenuItem key={l.value} value={l.value}>
                  {l.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="At least 8 characters."
              autoComplete="new-password"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Promoter referral code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="DESI-XXXX-XXXX"
              InputLabelProps={{ shrink: true }}
            />
            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={submitting}
            >
              Create account
            </LoadingButton>
          </Stack>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitVerify}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <ShieldCheck size={20} color="var(--palette-primary-main)" />
              <Typography variant="subtitle1">Verify your mobile</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              We sent a 6-digit code to <b>{mobile}</b>. Enter it to activate your account.
            </Typography>
            <TextField
              fullWidth
              label="OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              inputProps={{ inputMode: 'numeric', maxLength: 8 }}
              placeholder="6-digit code"
              autoFocus
              required
              InputLabelProps={{ shrink: true }}
            />
            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              loading={submitting}
            >
              Verify &amp; continue
            </LoadingButton>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="text" size="small" onClick={resendOtp} disabled={resending}>
                {resending ? 'Sending…' : 'Resend OTP'}
              </Button>
              <Button
                variant="text"
                size="small"
                color="inherit"
                onClick={() => {
                  setStep(1);
                  setOtpSent(false);
                  setOtpCode('');
                  setError(null);
                }}
              >
                Edit details
              </Button>
            </Stack>
            {otpSent && (
              <Typography variant="caption" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                In dev mode the OTP is logged on the backend console.
              </Typography>
            )}
          </Stack>
        </form>
      )}

      {step === 3 && (
        <Stack spacing={1.5} alignItems="center" sx={{ py: 4 }}>
          <CheckCircle2 size={40} color="var(--palette-success-main)" />
          <Typography variant="h6">Account activated</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            Taking you to the KYC step now. Won't take long.
          </Typography>
        </Stack>
      )}

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2" sx={{ color: 'text.secondary' }}>
          ← Back to sign in
        </Link>
      </Box>
    </AuthSplitLayout>
  );
};
