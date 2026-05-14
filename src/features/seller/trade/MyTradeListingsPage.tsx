import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { CategoryPicker } from '@/components/pickers/CategoryPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Textarea } from '@/components/ui/Textarea';
import { formatDate, formatInr } from '@/lib/format';
import { ApiError } from '@/types/api';
import { useCreateListing, useMyTradeListings } from './api';
import type { TradePaymentMode, TradeTransportMode } from './types';

const statusVariant: Record<string, 'warning' | 'success' | 'destructive' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
  PAUSED: 'muted',
  CLOSED: 'muted',
};

export const MyTradeListingsPage = () => {
  const { data, isLoading } = useMyTradeListings({ page: 1, limit: 50 });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My trade listings</h1>
          <p className="text-muted-foreground">
            Listings you've published on the B2B marketplace. Buyers from other clusters can
            place trade orders once your listing is approved.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New listing
        </Button>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price / unit</TableHead>
              <TableHead className="text-right">Available / Total</TableHead>
              <TableHead>Payments</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((l) => (
              <TableRow key={l.id ?? l._id}>
                <TableCell className="font-medium">
                  {l.name}
                  <div className="text-xs text-muted-foreground">{l.unit}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[l.status] ?? 'muted'}>{l.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatInr(l.unitPriceInr)}</TableCell>
                <TableCell className="text-right">
                  {l.availableUnits} / {l.totalUnits}
                </TableCell>
                <TableCell className="text-xs">
                  {l.acceptedPaymentModes.join(' · ')}
                </TableCell>
                <TableCell className="text-xs">{formatDate(l.createdAt)}</TableCell>
              </TableRow>
            ))}
            {(data?.items.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No listings yet. Create one to start selling to other clusters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <NewListingDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
};

const NewListingDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const mut = useCreateListing();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState('kg');
  const [weightGramsPerUnit, setWeight] = useState('1000');
  const [unitPriceInr, setPrice] = useState('');
  const [totalUnits, setTotal] = useState('');
  const [minOrderUnits, setMinOrder] = useState('1');
  const [maxOrderUnits, setMaxOrder] = useState('');
  const [paymentModes, setPaymentModes] = useState<TradePaymentMode[]>(['ONLINE']);
  const [transportModes, setTransportModes] = useState<TradeTransportMode[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setCategoryId(null);
      setUnit('kg');
      setWeight('1000');
      setPrice('');
      setTotal('');
      setMinOrder('1');
      setMaxOrder('');
      setPaymentModes(['ONLINE']);
      setTransportModes([]);
      setError(null);
    }
  }, [open]);

  const togglePayment = (m: TradePaymentMode) =>
    setPaymentModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const toggleTransport = (m: TradeTransportMode) =>
    setTransportModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2 || description.trim().length < 2) {
      setError('Name and description are required.');
      return;
    }
    if (!categoryId) {
      setError('Pick a category.');
      return;
    }
    if (paymentModes.length === 0) {
      setError('At least one payment mode is required.');
      return;
    }
    try {
      await mut.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        categoryId,
        unit: unit.trim(),
        weightGramsPerUnit: Number(weightGramsPerUnit) || 0,
        unitPriceInr: Number(unitPriceInr) || 0,
        totalUnits: Number(totalUnits) || 0,
        minOrderUnits: Number(minOrderUnits) || 1,
        maxOrderUnits: maxOrderUnits ? Number(maxOrderUnits) : undefined,
        acceptedPaymentModes: paymentModes,
        acceptedTransportModes: transportModes.length > 0 ? transportModes : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New trade listing"
      description="Listings go to a cluster admin for approval before they appear in other sellers' catalogues."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? 'Creating…' : 'Submit for approval'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tl-name">Name *</Label>
            <Input id="tl-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tl-desc">Description *</Label>
          <Textarea
            id="tl-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="tl-unit">Unit *</Label>
            <Input id="tl-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tl-weight">Weight per unit (g) *</Label>
            <Input
              id="tl-weight"
              type="number"
              min={0}
              value={weightGramsPerUnit}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tl-price">Unit price (₹) *</Label>
            <Input
              id="tl-price"
              type="number"
              min={0}
              step="0.5"
              value={unitPriceInr}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="tl-total">Total units *</Label>
            <Input
              id="tl-total"
              type="number"
              min={1}
              value={totalUnits}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tl-min">Min order units</Label>
            <Input
              id="tl-min"
              type="number"
              min={1}
              value={minOrderUnits}
              onChange={(e) => setMinOrder(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tl-max">Max order units (optional)</Label>
            <Input
              id="tl-max"
              type="number"
              min={1}
              value={maxOrderUnits}
              onChange={(e) => setMaxOrder(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Accepted payments *</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(['ONLINE', 'CASH'] as const).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${paymentModes.includes(m) ? 'border-primary bg-primary/10' : 'border-input'}`}
              >
                <input
                  type="checkbox"
                  checked={paymentModes.includes(m)}
                  onChange={() => togglePayment(m)}
                />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Accepted transport (optional; defaults to your cluster setting)</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(['DELHIVERY', 'LOCAL'] as const).map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${transportModes.includes(m) ? 'border-primary bg-primary/10' : 'border-input'}`}
              >
                <input
                  type="checkbox"
                  checked={transportModes.includes(m)}
                  onChange={() => toggleTransport(m)}
                />
                {m}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
};
