import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Scrollbar } from '@/components/scrollbar';
import { TableHeadCustom, TableNoData } from '@/components/table';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/types/api';
import { useCategoriesList, useReorderCategories } from './api';
import { CategoryFormDialog } from './CategoryFormDialog';
import type { SafeCategory } from './types';

export const CategoriesPage = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useCategoriesList();

  // Flat list — the taxonomy has no sub-categories. Sort by display order.
  const categories = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      ),
    [data],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeCategory | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (cat: SafeCategory) => {
    setEditing(cat);
    setDialogOpen(true);
  };

  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  const canCreate = isSuper || user?.role === UserRole.SUB_SUPER_ADMIN;
  const canReorder =
    isSuper ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CATEGORY_ADMIN;

  const reorderMut = useReorderCategories();

  const head = [
    { id: 'name', label: 'Category' },
    { id: 'slug', label: 'Slug' },
    { id: 'commission', label: 'Default commission', align: 'right' as const },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: '' },
  ];

  // Move a category up/down by renormalising the whole list's displayOrder to
  // its new positions, then persisting in one call.
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const ordered = [...categories];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    reorderMut.mutate(ordered.map((cat, i) => ({ id: cat.id, displayOrder: i })));
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Categories"
        description="Catalogue taxonomy. Each category sets a default commission rate inherited by its products unless overridden."
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New category
            </Button>
          ) : undefined
        }
      />

      <ScopedAdminBanner />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to load categories'}
        </div>
      )}

      {!isLoading && !isError && (
        <Card>
          <Scrollbar>
            <Table sx={{ minWidth: 800 }}>
              <TableHeadCustom headLabel={head} />
              <TableBody>
                {categories.map((cat, index) => (
                  <TableRow key={cat.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {cat.name}
                        {cat.adminId && (
                          <Badge variant="info" title="A category admin is assigned">
                            Admin assigned
                          </Badge>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', typography: 'caption' }}>{cat.slug}</TableCell>
                    <TableCell align="right">{cat.defaultCommissionRate}%</TableCell>
                    <TableCell>
                      <Badge variant={cat.status === 'active' ? 'success' : 'muted'}>
                        {cat.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {canReorder && (
                          <>
                            <IconButton
                              size="small"
                              disabled={index === 0 || reorderMut.isPending}
                              onClick={() => move(index, -1)}
                              aria-label="Move up"
                              title="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={index === categories.length - 1 || reorderMut.isPending}
                              onClick={() => move(index, 1)}
                              aria-label="Move down"
                              title="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </IconButton>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                <TableNoData notFound={!isLoading && categories.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </Card>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </Stack>
  );
};
