import { useEffect, useState } from 'react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { ClusterPicker } from '@/components/pickers/ClusterPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/lib/auth';
import { INDIA_STATES, districtsForState } from '@/utils/india-geo';
import { ApiError, UserRole } from '@/types/api';
import { useAdminRegisterSeller } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
}

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

  useEffect(() => {
    if (!open) return;
    setError(null);
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

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Name is required.');
    if (!email.trim() && !mobile.trim()) return setError('Provide an email or mobile.');
    if (mobile.trim() && !/^[6-9]\d{9}$/.test(mobile.trim()))
      return setError('Mobile must be a valid 10-digit number.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (farmName.trim().length < 2) return setError('Farm name is required.');
    if (line1.trim().length < 2 || city.trim().length < 2 || !state)
      return setError('Street, city and state are required.');
    if (!/^\d{6}$/.test(pincode)) return setError('PIN code must be 6 digits.');
    if (categoryIds.length === 0) return setError('Select at least one produce category.');

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
          <Button onClick={submit} disabled={register.isPending}>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-farm">Farm name *</Label>
            <Input id="ds-farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="ds-mobile">Mobile</Label>
            <Input
              id="ds-mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={10}
              placeholder="10-digit"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-email">Email</Label>
            <Input
              id="ds-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ds-line1">Street address *</Label>
          <Input id="ds-line1" value={line1} onChange={(e) => setLine1(e.target.value)} />
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-pin">PIN code *</Label>
            <Input
              id="ds-pin"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              maxLength={6}
              placeholder="6 digits"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Produce categories *</Label>
          <CategoryPicker multi values={categoryIds} onChange={setCategoryIds} />
        </div>

        {isSuperTier && (
          <div className="space-y-1.5">
            <Label>Cluster (optional — defaults from PIN code)</Label>
            <ClusterPicker value={clusterId} onChange={setClusterId} placeholder="Auto from PIN…" />
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
