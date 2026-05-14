import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
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

type Step = 1 | 2 | 3;

export const SellerRegisterPage = () => {
  const { isAuthenticated, loginWithPassword } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      await api.post('/auth/register', {
        role: UserRole.SELLER,
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        password,
        pincode: pincode.trim(),
        preferredLanguage,
        referredByCouponCode: referralCode.trim().toUpperCase() || undefined,
      }, { skipAuth: true });

      // Send OTP to mobile for registration purpose.
      await api.post('/auth/otp/send', {
        channel: 'mobile',
        identifier: mobile.trim(),
        purpose: 'registration',
      }, { skipAuth: true });

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
      await api.post('/auth/otp/send', {
        channel: 'mobile',
        identifier: mobile.trim(),
        purpose: 'registration',
      }, { skipAuth: true });
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
      await api.post('/auth/otp/verify', {
        channel: 'mobile',
        identifier: mobile.trim(),
        purpose: 'registration',
        code: otpCode.trim(),
      }, { skipAuth: true });

      // OTP verified → user is now active. Auto-login with the password they
      // just set so they land directly on the onboarding wizard.
      await loginWithPassword({
        identifier: mobile.trim(),
        password,
        channel: 'mobile',
      });

      setStep(3);
      // Small UX delay so the success state is visible before redirect.
      setTimeout(() => navigate('/seller/onboarding', { replace: true }), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/40 p-4">
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>

        <div className="flex items-center gap-2">
          <Sprout className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Become a Buy Desi seller</h1>
            <p className="text-sm text-muted-foreground">
              Free to join. Quick mobile verification, then a one-time KYC for approval.
            </p>
          </div>
        </div>

        <ol className="flex items-center gap-3 text-sm">
          <StepPill n={1} label="Sign up" active={step === 1} done={step > 1} />
          <span className="h-px flex-1 bg-border" />
          <StepPill n={2} label="Verify mobile" active={step === 2} done={step > 2} />
          <span className="h-px flex-1 bg-border" />
          <StepPill n={3} label="Continue" active={step === 3} done={false} />
        </ol>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Tell us about yourself</CardTitle>
              <CardDescription>
                Mobile and pincode are required — they decide which cluster you'll be routed
                to. Email is optional. Promoter referral code is optional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-name">Full name *</Label>
                  <Input
                    id="r-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name as it should appear on the storefront"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-mobile">Mobile *</Label>
                    <Input
                      id="r-mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll send a 6-digit OTP to this number.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-pin">Pincode *</Label>
                    <Input
                      id="r-pin"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      pattern="\d{6}"
                      maxLength={6}
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-email">Email (optional)</Label>
                    <Input
                      id="r-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-lang">Preferred language</Label>
                    <Select
                      id="r-lang"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                    >
                      {LANG_OPTIONS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-pass">Password *</Label>
                  <Input
                    id="r-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="r-ref">Promoter referral code (optional)</Label>
                  <Input
                    id="r-ref"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="DESI-XXXX-XXXX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Got a code from a Buy Desi promoter? Paste it here so they get credit.
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating account…' : 'Continue'}
                </Button>

                <p className="pt-1 text-center text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Verify your mobile
              </CardTitle>
              <CardDescription>
                We sent a 6-digit code to <span className="font-medium">{mobile}</span>. Enter
                it below to activate your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitVerify} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-otp">OTP</Label>
                  <Input
                    id="r-otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="\d{4,8}"
                    maxLength={8}
                    placeholder="6-digit code"
                    autoFocus
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Verifying…' : 'Verify & continue'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resendOtp}
                    disabled={resending}
                  >
                    {resending ? 'Sending…' : "Didn't get it? Resend OTP"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep(1);
                      setOtpSent(false);
                      setOtpCode('');
                      setError(null);
                    }}
                  >
                    Edit my details
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {otpSent
                    ? 'In dev mode the OTP is logged on the backend console (SMS_PROVIDER=console).'
                    : null}
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Account activated
              </CardTitle>
              <CardDescription>
                Taking you to the KYC step now. Won't take long.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

const StepPill = ({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) => (
  <li
    className={`flex items-center gap-2 rounded-full px-3 py-1 ${
      done
        ? 'bg-emerald-100 text-emerald-700'
        : active
          ? 'bg-primary/10 text-primary'
          : 'bg-secondary text-muted-foreground'
    }`}
  >
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
        done
          ? 'bg-emerald-600 text-white'
          : active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
      }`}
    >
      {done ? '✓' : n}
    </span>
    {label}
  </li>
);
