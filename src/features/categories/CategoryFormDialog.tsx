import { useEffect, useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ImageUploadField } from '@/components/ImageUploadField';
import { UserPicker } from '@/components/pickers/UserPicker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { UserRole } from '@/types/api';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/types/api';
import { useCreateCategory, useUpdateCategory } from './api';
import type { CategoryStatus, SafeCategory } from './types';

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** If supplied, the dialog edits this category; otherwise it creates a new one. */
  editing?: SafeCategory | null;
}

interface FormState {
  name: string;
  slug: string;
  defaultCommissionRate: string;
  iconUrl: string;
  displayOrder: string;
  status: CategoryStatus;
  adminId: string;
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  defaultCommissionRate: '0',
  iconUrl: '',
  displayOrder: '0',
  status: 'active',
  adminId: '',
};

export const CategoryFormDialog = ({ open, onClose, editing }: CategoryFormDialogProps) => {
  const { user } = useAuth();
  const isSuper = user?.role === UserRole.SUPER_ADMIN;

  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        defaultCommissionRate: String(editing.defaultCommissionRate),
        iconUrl: editing.iconUrl ?? '',
        displayOrder: String(editing.displayOrder),
        status: editing.status,
        adminId: editing.adminId ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  const submitting = createMut.isPending || updateMut.isPending;
  const submitLabel = editing ? 'Save changes' : 'Create category';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const rate = Number(form.defaultCommissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Default commission must be between 0 and 100');
      return;
    }
    const order = form.displayOrder ? Number(form.displayOrder) : 0;
    if (!Number.isFinite(order) || order < 0) {
      setError('Display order must be a non-negative number');
      return;
    }

    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          patch: {
            name: form.name.trim(),
            slug: form.slug.trim() || undefined,
            defaultCommissionRate: rate,
            iconUrl: form.iconUrl.trim() || undefined,
            displayOrder: order,
            status: form.status,
            ...(isSuper ? { adminId: form.adminId.trim() || null } : {}),
          },
        });
      } else {
        await createMut.mutateAsync({
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          defaultCommissionRate: rate,
          iconUrl: form.iconUrl.trim() || undefined,
          displayOrder: order,
          status: form.status,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed. Try again.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit category — ${editing.name}` : 'Create category'}
      description={
        editing
          ? 'Updates take effect immediately and are logged in the activity log.'
          : 'Create a catalogue category. Products inherit its default commission rate unless overridden.'
      }
    >
      <form onSubmit={onSubmit}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <TextField
              id="cat-name"
              fullWidth
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ minLength: 2, maxLength: 120 }}
            />
            <TextField
              id="cat-slug"
              fullWidth
              label="Slug (optional)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto-generated from name"
              InputLabelProps={{ shrink: true }}
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
              id="cat-commission"
              fullWidth
              type="number"
              label="Default commission %"
              required
              value={form.defaultCommissionRate}
              onChange={(e) => setForm({ ...form, defaultCommissionRate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0, max: 100, step: '0.1' }}
            />
            <TextField
              id="cat-order"
              fullWidth
              type="number"
              label="Display order"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0 }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            <Stack spacing={1}>
              <Typography variant="subtitle2">Icon</Typography>
              <ImageUploadField
                value={form.iconUrl}
                onChange={(url) => setForm({ ...form, iconUrl: url })}
                kind="category"
                variant="square"
              />
            </Stack>
            <TextField
              id="cat-status"
              select
              fullWidth
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as CategoryStatus })}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            }}
          >
            {isSuper && editing && (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Category admin</Typography>
                <UserPicker
                  role={UserRole.CATEGORY_ADMIN}
                  value={form.adminId || null}
                  onChange={(id) => setForm({ ...form, adminId: id ?? '' })}
                  placeholder="Pick a category admin…"
                />
                <Typography variant="caption" color="text.secondary">
                  Clear to unassign. Only users with role=CATEGORY_ADMIN are listed.
                </Typography>
              </Stack>
            )}
          </Box>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </Stack>
      </form>
    </Dialog>
  );
};
