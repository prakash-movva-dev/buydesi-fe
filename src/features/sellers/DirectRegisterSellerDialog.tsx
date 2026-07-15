import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/lib/auth';
import {
  validateEmail,
  validateMobile,
  validateName,
  validatePincode,
} from '@/lib/validation';
import { INDIA_STATES, districtsForState } from '@/utils/india-geo';
import { useCluster } from '@/features/clusters/api';
import { ApiError, UserRole } from '@/types/api';
import { useAdminRegisterSeller } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
}

const FieldError = ({ show, message }: { show: boolean; message: string | null }) =>
  show && message ? <p className="text-xs text-destructive">{message}</p> : null;

/**
 * Story 3.1 — Cluster/Regional/Super admin registers a seller directly. Creates
 * an active account + approved profile in one step (no OTP, no approval queue).
 */
export const DirectRegisterSellerDialog = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const isSuperTier =
    user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.SUB_SUPER_ADMIN;
  const register = useAdminRegisterSeller();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Full cluster record for the selected cluster — used to check that the
  // entered PIN code / state fall inside the cluster's region (issue US-CA.3).
  const { data: selectedCluster } = useCluster(clusterId ?? undefined);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setShowErrors(false);
    setName('');
    setMobile('');
    setEmail('');
    setPassword('');
    setFarmName('');
    setLine1('');
    setLine2('');
    setCity('');
    setState('');
    setPincode('');
    setCategoryIds([]);
    setClusterId(null);
  }, [open]);

  // ── Field-level validation (issue US-CA.1) ───────────────────────────────
  const nameError = validateName(name);
  const mobileError = validateMobile(mobile);
  const emailError = validateEmail(email);
  const contactError =
    !email.trim() && !mobile.trim() ? 'Provide an email or mobile.' : null;
  const passwordError = password.length < 8 ? 'Password must be at least 8 characters.' : null;
  const farmNameError = farmName.trim().length < 2 ? 'Farm name is required.' : null;
  const line1Error = line1.trim().length < 2 ? 'Street address is required.' : null;
  const cityError = city.trim().length < 2 ? 'City / district is required.' : null;
  const stateError = !state ? 'State is required.' : null;
  const pincodeError = validatePincode(pincode);
  const categoryError = categoryIds.length === 0 ? 'Select at least one produce category.' : null;

  // ── Cluster / region mismatch (issue US-CA.3) ────────────────────────────
  // Block when the entered PIN code is not in the selected cluster's list, or
  // the state does not match. Only meaningful once we have a 6-digit PIN.
  let clusterMismatchError: string | null = null;
  if (selectedCluster && /^\d{6}$/.test(pincode.trim())) {
    const pinInCluster = selectedCluster.pinCodes.includes(pincode.trim());
    const stateMatches =
      !state || selectedCluster.state.toLowerCase() === state.trim().toLowerCase();
    if (!pinInCluster) {
      clusterMismatchError = `PIN ${pincode.trim()} is not part of cluster "${selectedCluster.name}" (${selectedCluster.district}, ${selectedCluster.state}). Choose a matching cluster or correct the address.`;
    } else if (!stateMatches) {
      clusterMismatchError = `State "${state}" does not match cluster "${selectedCluster.name}" (${selectedCluster.state}).`;
    }
  }

  const isValid =
    !nameError &&
    !contactError &&
    !mobileError &&
    !emailError &&
    !passwordError &&
    !farmNameError &&
    !line1Error &&
    !cityError &&
    !stateError &&
    !pincodeError &&
    !categoryError &&
    !clusterMismatchError;

  const submit = async () => {
    setError(null);
    if (!isValid) {
      setShowErrors(true);
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    try {
      await register.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        password,
        farmName: farmName.trim(),
        address: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state,
          pincode,
        },
        categoryIds,
        clusterId: isSuperTier ? clusterId ?? undefined : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Directly register a seller"
      description="Creates an active seller account and approved storefront immediately — no OTP or approval queue (story 3.1). Share the temporary password securely."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={register.isPending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              register.isPending ||
              Boolean(clusterMismatchError) ||
              (showErrors && !isValid)
            }
          >
            {register.isPending ? 'Registering…' : 'Register seller'}
          </Button>
        </>
      }
      className="max-w-2xl"
    >
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          <TextField
            fullWidth
            label="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(nameError)}
            helperText={showErrors ? nameError ?? undefined : undefined}
          />
          <TextField
            fullWidth
            label="Farm name"
            required
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(farmNameError)}
            helperText={showErrors ? farmNameError ?? undefined : undefined}
          />
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          <PhoneInput
            fullWidth
            label="Mobile"
            value={mobile}
            onChange={setMobile}
            country="IN"
            error={showErrors && Boolean(mobileError ?? contactError)}
            helperText={showErrors ? (mobileError ?? contactError) ?? undefined : undefined}
          />
          <TextField
            fullWidth
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(emailError)}
            helperText={showErrors ? emailError ?? undefined : undefined}
          />
          <TextField
            fullWidth
            type="text"
            label="Temp password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="≥ 8 chars"
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(passwordError)}
            helperText={showErrors ? passwordError ?? undefined : undefined}
          />
        </Box>

        <TextField
          fullWidth
          label="Street address"
          required
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          InputLabelProps={{ shrink: true }}
          error={showErrors && Boolean(line1Error)}
          helperText={showErrors ? line1Error ?? undefined : undefined}
        />
        <TextField
          fullWidth
          label="Address line 2 (optional)"
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          <TextField
            select
            fullWidth
            label="State"
            required
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity('');
            }}
            InputLabelProps={{ shrink: true }}
            error={showErrors && Boolean(stateError)}
            helperText={showErrors ? stateError ?? undefined : undefined}
          >
            <MenuItem value="">Select…</MenuItem>
            {INDIA_STATES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="City / District"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!state}
            placeholder={state ? 'Pick or type…' : 'Select a state first'}
            InputLabelProps={{ shrink: true }}
            inputProps={{ list: 'ds-city-options' }}
            error={showErrors && Boolean(cityError)}
            helperText={showErrors ? cityError ?? undefined : undefined}
          />
          <datalist id="ds-city-options">
            {districtsForState(state).map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <TextField
            fullWidth
            label="PIN code"
            required
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="6 digits"
            InputLabelProps={{ shrink: true }}
            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            error={showErrors && Boolean(pincodeError)}
            helperText={showErrors ? pincodeError ?? undefined : undefined}
          />
        </Box>

        <Stack spacing={1}>
          <Typography variant="subtitle2">Produce categories *</Typography>
          <CategoryPicker multi values={categoryIds} onChange={setCategoryIds} />
          <FieldError show={showErrors} message={categoryError} />
        </Stack>

        {isSuperTier && (
          <Stack spacing={1}>
            <Typography variant="subtitle2">Cluster (optional — defaults from PIN code)</Typography>
            <ClusterPicker value={clusterId} onChange={setClusterId} placeholder="Auto from PIN…" />
            {clusterMismatchError && (
              <Alert severity="error">{clusterMismatchError}</Alert>
            )}
          </Stack>
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          KYC documents can be uploaded by the seller from their portal after first login, or added
          later from the seller's profile.
        </Typography>
      </Stack>
    </Dialog>
  );
};
