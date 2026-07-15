import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/cn';
import { useRegionsList } from '@/features/regions/api';
import { INDIA_STATES, districtsForState } from '@/utils/india-geo';
import { ApiError } from '@/types/api';
import { useCreateCluster, useUpdateCluster } from './api';
import type { ClusterStatus, SafeCluster, TradeTransportMode } from './types';

interface Props {
  open: boolean;
  editing: SafeCluster | null;
  onClose: () => void;
}

const STEPS = [
  { key: 'location', label: 'Location', hint: 'Where the cluster operates' },
  { key: 'coverage', label: 'Coverage', hint: 'Region, zone & categories' },
  { key: 'details', label: 'Details', hint: 'Code, contacts & story' },
  { key: 'logistics', label: 'Logistics', hint: 'Hub, COD & status' },
] as const;

export const ClusterFormDialog = ({ open, editing, onClose }: Props) => {
  const isEdit = Boolean(editing);
  const createMut = useCreateCluster();
  const updateMut = useUpdateCluster();
  const regions = useRegionsList();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pinCodes, setPinCodes] = useState<string[]>([]);
  const [regionId, setRegionId] = useState('');
  const [zone, setZone] = useState('');
  const [statusVal, setStatusVal] = useState<ClusterStatus>('active');
  const [defaultTradeTransport, setTransport] = useState<TradeTransportMode>('LOCAL');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  // Extended details
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hubAddress, setHubAddress] = useState('');
  const [hubPincode, setHubPincode] = useState('');
  const [codAllowed, setCodAllowed] = useState(true);
  const [minOrderValue, setMinOrderValue] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStep(0);
    if (editing) {
      setName(editing.name);
      setState(editing.state);
      setDistrict(editing.district);
      setPinCodes(editing.pinCodes);
      setRegionId(editing.regionId ?? '');
      setZone(editing.zone ?? '');
      setStatusVal(editing.status);
      setTransport(editing.defaultTradeTransport);
      setActiveCategories(editing.activeCategories ?? []);
      setCode(editing.code ?? '');
      setDescription(editing.description ?? '');
      setContactPhone(editing.contactPhone ?? '');
      setContactEmail(editing.contactEmail ?? '');
      setHubAddress(editing.hubAddress ?? '');
      setHubPincode(editing.hubPincode ?? '');
      setCodAllowed(editing.codAllowed ?? true);
      setMinOrderValue(
        editing.minOrderValueInr != null ? String(editing.minOrderValueInr) : '',
      );
      setLaunchDate(editing.launchDate ? editing.launchDate.slice(0, 10) : '');
    } else {
      setName('');
      setState('');
      setDistrict('');
      setPinCodes([]);
      setRegionId('');
      setZone('');
      setStatusVal('active');
      setTransport('LOCAL');
      setActiveCategories([]);
      setCode('');
      setDescription('');
      setContactPhone('');
      setContactEmail('');
      setHubAddress('');
      setHubPincode('');
      setCodAllowed(true);
      setMinOrderValue('');
      setLaunchDate('');
    }
  }, [open, editing]);

  // Step 1 (Location) holds every required field — the rest are optional.
  const locationValid =
    name.trim().length >= 2 &&
    state.trim().length >= 2 &&
    district.trim().length >= 2 &&
    pinCodes.length > 0;
  const canSubmit = locationValid;
  const isLast = step === STEPS.length - 1;

  const goTo = (i: number) => {
    // Can't advance past the required Location step until it's valid.
    if (i > 0 && !locationValid) return;
    setStep(i);
  };

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setStep(0);
      setError('Name, state, district and at least one PIN code are required.');
      return;
    }
    if (hubPincode && !/^\d{6}$/.test(hubPincode)) {
      setStep(3);
      setError('Hub PIN code must be 6 digits.');
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        state: state.trim(),
        district: district.trim(),
        pinCodes,
        regionId: regionId || null,
        zone: zone.trim() || undefined,
        status: statusVal,
        defaultTradeTransport,
        activeCategories,
        code: code.trim() || null,
        description: description.trim() || null,
        contactPhone: contactPhone.trim() || null,
        contactEmail: contactEmail.trim() || null,
        hubAddress: hubAddress.trim() || null,
        hubPincode: hubPincode.trim() || null,
        codAllowed,
        minOrderValueInr: minOrderValue ? Number(minOrderValue) : null,
        launchDate: launchDate || null,
      };
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    }
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit cluster — ${editing!.name}` : 'New cluster'}
      description="A cluster is a geographic operating area defined by its PIN codes. Admins are assigned from the cluster's detail page."
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            {isLast ? (
              <Button onClick={submit} disabled={submitting || !canSubmit}>
                {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create cluster'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === 0 && !locationValid}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      }
      className="max-w-2xl"
    >
      {/* Stepper header */}
      <div className="mb-4 flex items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < step && (i > 0 || locationValid);
          const current = i === step;
          const reachable = i === 0 || locationValid;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                disabled={!reachable}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  current
                    ? 'bg-primary/10 text-foreground'
                    : reachable
                      ? 'text-muted-foreground hover:bg-accent'
                      : 'cursor-not-allowed text-muted-foreground/50',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    current
                      ? 'bg-primary text-primary-foreground'
                      : done
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden font-medium sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step body — bounded height so the modal never runs off-screen. */}
      <div className="max-h-[55vh] min-h-[280px] space-y-4 overflow-y-auto pr-1">
        {step === 0 && (
          <>
            <p className="text-xs text-muted-foreground">{STEPS[0].hint}</p>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              <TextField
                fullWidth
                label="Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bengaluru Urban"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                fullWidth
                label="State"
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setDistrict('');
                }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Select a state…</MenuItem>
                {INDIA_STATES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="District"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={!state}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">
                  {state ? 'Select a district…' : 'Select a state first'}
                </MenuItem>
                {districtsForState(state).map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* PIN codes — the defining attribute of a cluster. Mandatory. */}
            <PincodeInput pins={pinCodes} onChange={setPinCodes} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-xs text-muted-foreground">{STEPS[1].hint}</p>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                select
                fullWidth
                label="Region (optional)"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Groups this cluster under a Regional Admin's region."
              >
                <MenuItem value="">— No region —</MenuItem>
                {(regions.data ?? []).map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="Zone (optional)"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. South"
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Active categories (optional)
              </Typography>
              <CategoryPicker
                multi
                values={activeCategories}
                onChange={setActiveCategories}
                placeholder="Which categories this cluster serves…"
              />
              <p className="text-xs text-muted-foreground">
                Reflect the cluster's local produce (e.g. a Coorg cluster carries Coffee &amp;
                Spices).
              </p>
            </Box>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-xs text-muted-foreground">{STEPS[2].hint}</p>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                fullWidth
                label="Cluster code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. KA-BLR-01"
                InputLabelProps={{ shrink: true }}
                inputProps={{ maxLength: 40 }}
              />
              <TextField
                fullWidth
                type="date"
                label="Launch date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this cluster covers, its produce and story…"
              InputLabelProps={{ shrink: true }}
              inputProps={{ maxLength: 2000 }}
            />

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <PhoneInput
                fullWidth
                label="Contact phone"
                value={contactPhone}
                onChange={setContactPhone}
                country="IN"
              />
              <TextField
                fullWidth
                type="email"
                label="Contact email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="ops@…"
                InputLabelProps={{ shrink: true }}
                inputProps={{ maxLength: 200 }}
              />
            </Box>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-xs text-muted-foreground">{STEPS[3].hint}</p>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Pickup hub address"
              value={hubAddress}
              onChange={(e) => setHubAddress(e.target.value)}
              placeholder="Delhivery pickup origin for this cluster's sellers"
              InputLabelProps={{ shrink: true }}
              inputProps={{ maxLength: 500 }}
            />

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                alignItems: 'center',
              }}
            >
              <TextField
                fullWidth
                label="Hub PIN code"
                value={hubPincode}
                onChange={(e) =>
                  setHubPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="6-digit"
                InputLabelProps={{ shrink: true }}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Min order value (₹)"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="Optional"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: 0 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={codAllowed}
                    onChange={(e) => setCodAllowed(e.target.checked)}
                  />
                }
                label={`Cash on Delivery ${codAllowed ? '(Allowed)' : '(Disabled)'}`}
              />
            </Box>

            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <TextField
                select
                fullWidth
                label="Status"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value as ClusterStatus)}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
              <TextField
                select
                fullWidth
                label="Default trade transport"
                value={defaultTradeTransport}
                onChange={(e) => setTransport(e.target.value as TradeTransportMode)}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="LOCAL">Local (within cluster)</MenuItem>
                <MenuItem value="DELHIVERY">Delhivery (inter-cluster)</MenuItem>
              </TextField>
            </Box>

            {isEdit && (
              <p className="rounded-md border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                Assign the Cluster Admin and appoint Category / Support admins from this
                cluster's detail page.
              </p>
            )}
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </div>
    </Dialog>
  );
};

/** Chip-based PIN-code editor. A cluster is defined by its PIN codes, so this is
    the primary, mandatory input — 6-digit codes are added as removable chips. */
const PincodeInput = ({
  pins,
  onChange,
}: {
  pins: string[];
  onChange: (next: string[]) => void;
}) => {
  const [draft, setDraft] = useState('');
  const [warn, setWarn] = useState<string | null>(null);

  const addTokens = (raw: string) => {
    const tokens = raw.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;
    let next = [...pins];
    let bad = '';
    for (const t of tokens) {
      if (!/^\d{6}$/.test(t)) {
        bad = t;
        continue;
      }
      if (!next.includes(t)) next.push(t);
    }
    onChange(next);
    setDraft('');
    setWarn(bad ? `"${bad}" isn't a 6-digit PIN code` : null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTokens(draft);
    } else if (e.key === 'Backspace' && !draft && pins.length) {
      onChange(pins.slice(0, -1));
    }
  };

  const remove = (pin: string) => onChange(pins.filter((p) => p !== pin));
  const sorted = useMemo(() => [...pins].sort(), [pins]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="cl-pins">
          PIN codes <span className="text-destructive">*</span>
        </Label>
        <span className="text-xs text-muted-foreground">
          {pins.length} PIN code{pins.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background p-2">
        {sorted.map((pin) => (
          <span
            key={pin}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium"
          >
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {pin}
            <button
              type="button"
              onClick={() => remove(pin)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${pin}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id="cl-pins"
          inputMode="numeric"
          value={draft}
          onChange={(e) => {
            setWarn(null);
            setDraft(e.target.value.replace(/[^\d,\s]/g, ''));
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft && addTokens(draft)}
          maxLength={7}
          placeholder={pins.length ? 'Add another…' : 'Type a 6-digit PIN and press Enter'}
          className="min-w-[9rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {warn ? (
        <p className="text-xs text-destructive">{warn}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          A cluster is defined by its PIN codes. Each PIN belongs to only one cluster — paste or
          type several, separated by spaces or commas.
        </p>
      )}
    </div>
  );
};
