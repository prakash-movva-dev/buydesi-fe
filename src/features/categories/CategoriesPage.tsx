import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Catalogue taxonomy. Each category sets a default commission rate inherited by its
            products unless overridden.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New category
          </Button>
        )}
      </div>

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
        <div className="rounded-lg border border-border bg-card">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <FolderTree className="h-6 w-6" />
              No categories yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Default commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat, index) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {cat.name}
                        {cat.adminId && (
                          <Badge variant="info" title={`Admin: ${cat.adminId}`}>
                            Admin assigned
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cat.slug}</TableCell>
                    <TableCell className="text-right">{cat.defaultCommissionRate}%</TableCell>
                    <TableCell>
                      <Badge variant={cat.status === 'active' ? 'success' : 'muted'}>
                        {cat.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {canReorder && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={index === 0 || reorderMut.isPending}
                              onClick={() => move(index, -1)}
                              aria-label="Move up"
                              title="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={index === categories.length - 1 || reorderMut.isPending}
                              onClick={() => move(index, 1)}
                              aria-label="Move down"
                              title="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </div>
  );
};
