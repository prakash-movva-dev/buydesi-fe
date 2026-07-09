import { useEffect, useState } from 'react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
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
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ds-name">Full name *</Label>
            <Input id="ds-name" value={name} onChange={(e) => setName(e.target.value)} />
            <FieldError show={showErrors} message={nameError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-farm">Farm name *</Label>
            <Input id="ds-farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
            <FieldError show={showErrors} message={farmNameError} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ds-mobile">Mobile</Label>
            <Input
              id="ds-mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              inputMode="numeric"
              maxLength={13}
              placeholder="10-digit"
            />
            <FieldError show={showErrors} message={mobileError ?? contactError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-email">Email</Label>
            <Input
              id="ds-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError show={showErrors} message={emailError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-pass">Temp password *</Label>
            <Input
              id="ds-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="≥ 8 chars"
            />
            <FieldError show={showErrors} message={passwordError} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ds-line1">Street address *</Label>
          <Input id="ds-line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
          <FieldError show={showErrors} message={line1Error} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-line2">Address line 2 (optional)</Label>
          <Input id="ds-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ds-state">State *</Label>
            <Select
              id="ds-state"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity('');
              }}
            >
              <option value="">Select…</option>
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <FieldError show={showErrors} message={stateError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-city">City / District *</Label>
            <Input
              id="ds-city"
              list="ds-city-options"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!state}
              placeholder={state ? 'Pick or type…' : 'Select a state first'}
            />
            <datalist id="ds-city-options">
              {districtsForState(state).map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <FieldError show={showErrors} message={cityError} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-pin">PIN code *</Label>
            <Input
              id="ds-pin"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digits"
            />
            <FieldError show={showErrors} message={pincodeError} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Produce categories *</Label>
          <CategoryPicker multi values={categoryIds} onChange={setCategoryIds} />
          <FieldError show={showErrors} message={categoryError} />
        </div>

        {isSuperTier && (
          <div className="space-y-1.5">
            <Label>Cluster (optional — defaults from PIN code)</Label>
            <ClusterPicker value={clusterId} onChange={setClusterId} placeholder="Auto from PIN…" />
            {clusterMismatchError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {clusterMismatchError}
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          KYC documents can be uploaded by the seller from their portal after first login, or added
          later from the seller's profile.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
