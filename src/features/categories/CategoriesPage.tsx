import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScopedAdminBanner } from '@/features/scoped-admin/ScopedAdminBanner';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { UserRole } from '@/types/api';
import { useCategoriesList, useReorderCategories } from './api';
import { CategoryFormDialog } from './CategoryFormDialog';
import type { SafeCategory } from './types';

interface TreeNode {
  cat: SafeCategory;
  children: TreeNode[];
}

const buildTree = (categories: SafeCategory[]): TreeNode[] => {
  const byParent = new Map<string | null, SafeCategory[]>();
  for (const c of categories) {
    const key = c.parentId;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }
  const build = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? []).map((cat) => ({ cat, children: build(cat.id) }));
  return build(null);
};

export const CategoriesPage = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useCategoriesList();
  const all = data ?? [];

  const tree = useMemo(() => buildTree(all), [all]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeCategory | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  const openCreate = (parentId: string | null) => {
    setEditing(null);
    setDefaultParentId(parentId);
    setDialogOpen(true);
  };

  const openEdit = (cat: SafeCategory) => {
    setEditing(cat);
    setDefaultParentId(null);
    setDialogOpen(true);
  };

  const isSuper = user?.role === UserRole.SUPER_ADMIN;
  // Category admins create subcategories under their assigned category;
  // Super admins create anything. Sub-super follows the same backend rule
  // as super (top-level), so we let them try and backend enforces.
  const canCreateTopLevel = isSuper || user?.role === UserRole.SUB_SUPER_ADMIN;
  const canReorder =
    isSuper ||
    user?.role === UserRole.SUB_SUPER_ADMIN ||
    user?.role === UserRole.CATEGORY_ADMIN;

  const reorderMut = useReorderCategories();

  // Move a node up/down among its siblings by renormalising the group's
  // displayOrder to its new array positions, then persisting in one call.
  const moveSibling = (siblings: TreeNode[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= siblings.length) return;
    const ordered = siblings.map((s) => s.cat);
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
        {canCreateTopLevel && (
          <Button onClick={() => openCreate(null)}>
            <Plus className="h-4 w-4" />
            New top-level category
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
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <FolderTree className="h-6 w-6" />
              No categories yet. Create one to get started.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tree.map((node, index) => (
                <CategoryRow
                  key={node.cat.id}
                  node={node}
                  siblings={tree}
                  index={index}
                  depth={0}
                  expanded={expanded}
                  onToggle={(id) =>
                    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                  onEdit={openEdit}
                  onAddChild={openCreate}
                  canReorder={canReorder}
                  onMove={moveSibling}
                  reordering={reorderMut.isPending}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
        defaultParentId={defaultParentId}
        allCategories={all}
      />
    </div>
  );
};

interface CategoryRowProps {
  node: TreeNode;
  siblings: TreeNode[];
  index: number;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onEdit: (c: SafeCategory) => void;
  onAddChild: (parentId: string) => void;
  canReorder: boolean;
  onMove: (siblings: TreeNode[], index: number, dir: -1 | 1) => void;
  reordering: boolean;
}

const CategoryRow = ({
  node,
  siblings,
  index,
  depth,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  canReorder,
  onMove,
  reordering,
}: CategoryRowProps) => {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded[node.cat.id] ?? depth === 0; // expand top-level by default
  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 hover:bg-secondary/30',
          depth > 0 && 'pl-[calc(1rem+1.5rem*var(--depth,0))]',
        )}
        style={{ ['--depth' as never]: depth }}
      >
        <button
          type="button"
          onClick={() => onToggle(node.cat.id)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent',
            !hasChildren && 'invisible',
          )}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{node.cat.name}</span>
            <Badge variant={node.cat.status === 'active' ? 'success' : 'muted'}>
              {node.cat.status}
            </Badge>
            {node.cat.adminId && (
              <Badge variant="info" title={`Admin: ${node.cat.adminId}`}>
                Admin assigned
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            slug: {node.cat.slug} · default commission {node.cat.defaultCommissionRate}% · order{' '}
            {node.cat.displayOrder}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canReorder && (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0 || reordering}
                onClick={() => onMove(siblings, index, -1)}
                aria-label="Move up"
                title="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === siblings.length - 1 || reordering}
                onClick={() => onMove(siblings, index, 1)}
                aria-label="Move down"
                title="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => onAddChild(node.cat.id)}>
            <Plus className="h-4 w-4" />
            Sub-category
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(node.cat)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
      {hasChildren && isOpen && (
        <ul className="divide-y divide-border border-t border-border bg-secondary/10">
          {node.children.map((child, childIndex) => (
            <CategoryRow
              key={child.cat.id}
              node={child}
              siblings={node.children}
              index={childIndex}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              canReorder={canReorder}
              onMove={onMove}
              reordering={reordering}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
