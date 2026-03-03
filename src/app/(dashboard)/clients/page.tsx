"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { CsvImportModal } from "@/components/csv-import-modal";
import { AddClientModal } from "@/components/add-client-modal";
import {
  Search,
  Upload,
  Plus,
  Users,
  RefreshCw,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Megaphone,
  Pause,
  Download,
} from "lucide-react";
import { getClientTypeConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ---------- Client type badge ---------- */
function ClientTypeBadge({ type }: { type: string }) {
  const config = getClientTypeConfig(type);
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${config.color}`}>
      {config.label}
    </span>
  );
}

/* ---------- Sortable header helper ---------- */
function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (asc: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-[12px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-1.5 h-3 w-3" />
    </Button>
  );
}

/* ---------- Main Page ---------- */
export default function ClientsPage() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  const clientsQuery = trpc.clients.list.useInfiniteQuery(
    { limit: 50 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const syncStatus = trpc.clients.lastSyncStatus.useQuery();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      setShowAdd(false);
      toast.success("Client added successfully");
    },
  });
  const syncFromXero = trpc.clients.syncFromXero.useMutation({
    onSuccess: (stats) => {
      clientsQuery.refetch();
      syncStatus.refetch();
      const parts: string[] = [];
      if (stats.created > 0) parts.push(`Imported ${stats.created}`);
      if (stats.updated > 0) parts.push(`updated ${stats.updated}`);
      if (stats.errors > 0) parts.push(`${stats.errors} errors`);
      toast.success(parts.length > 0 ? parts.join(", ") : "No changes");
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  // Flatten paginated data
  const allClients = useMemo(
    () => clientsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [clientsQuery.data],
  );

  // Apply status filter before table
  const filteredByStatus = useMemo(
    () =>
      statusFilter === "all"
        ? allClients
        : allClients.filter((c) =>
            statusFilter === "active" ? c.chaseEnabled : !c.chaseEnabled,
          ),
    [allClients, statusFilter],
  );

  // Column definitions
  const columns = useMemo<ColumnDef<(typeof allClients)[number]>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.firstName} ${row.original.lastName}`}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "name",
        accessorFn: (row) =>
          `${row.firstName} ${row.lastName} ${row.companyName || ""}`.toLowerCase(),
        header: ({ column }) => <SortableHeader column={column} label="Name" />,
        cell: ({ row }) => {
          const client = row.original;
          return (
            <div className="flex items-center gap-3">
              <StatusDot
                status={client.chaseEnabled ? "active" : "paused"}
                size="sm"
              />
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {client.firstName} {client.lastName}
                </p>
                {client.companyName && (
                  <p className="text-[12px] text-muted-foreground">{client.companyName}</p>
                )}
              </div>
              {client.xeroContactId && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 ring-1 ring-inset ring-teal-500/20 uppercase tracking-wide">
                  Xero
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "clientType",
        header: ({ column }) => <SortableHeader column={column} label="Type" />,
        cell: ({ row }) => <ClientTypeBadge type={row.original.clientType} />,
      },
      {
        id: "contact",
        accessorFn: (row) => row.email || row.phone || "",
        header: () => (
          <span className="text-[12px] uppercase tracking-wider font-medium text-muted-foreground">
            Contact
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground truncate max-w-[200px] block">
            {row.original.email || row.original.phone || (
              <span className="text-muted-foreground/50">&mdash;</span>
            )}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "lastChasedAt",
        header: ({ column }) => <SortableHeader column={column} label="Last Chased" />,
        cell: ({ row }) => {
          const date = row.original.lastChasedAt;
          return (
            <span className="text-[13px] text-muted-foreground">
              {date ? (
                formatDistanceToNow(new Date(date), { addSuffix: true })
              ) : (
                <span className="text-muted-foreground/50">Never</span>
              )}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.lastChasedAt
            ? new Date(rowA.original.lastChasedAt).getTime()
            : 0;
          const b = rowB.original.lastChasedAt
            ? new Date(rowB.original.lastChasedAt).getTime()
            : 0;
          return a - b;
        },
      },
      {
        id: "status",
        accessorFn: (row) => (row.chaseEnabled ? "active" : "paused"),
        header: () => (
          <span className="text-[12px] uppercase tracking-wider font-medium text-muted-foreground">
            Status
          </span>
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.chaseEnabled ? "default" : "secondary"}
            className="text-[11px]"
          >
            {row.original.chaseEnabled ? "Active" : "Paused"}
          </Badge>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredByStatus,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).toLowerCase();
      const client = row.original;
      return `${client.firstName} ${client.lastName} ${client.companyName || ""} ${client.email || ""}`
        .toLowerCase()
        .includes(search);
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Clients</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {clientsQuery.isLoading
              ? "Loading..."
              : `${allClients.length} total clients`}
            {syncStatus.data?.lastSyncAt && (
              <span className="ml-1.5">
                &middot; Synced{" "}
                {formatDistanceToNow(new Date(syncStatus.data.lastSyncAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {syncStatus.data?.connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncFromXero.mutate()}
              disabled={syncFromXero.isPending}
              className="text-teal-400 border-teal-500/20 hover:bg-teal-500/10"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5 mr-1.5", syncFromXero.isPending && "animate-spin")}
              />
              {syncFromXero.isPending ? "Syncing..." : "Sync Xero"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Error state */}
      {clientsQuery.isError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-[13px] rounded-lg px-4 py-3">
          Failed to load clients. {clientsQuery.error?.message}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, or email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 text-[13px]"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-[13px]">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Status
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 capitalize">
                  {statusFilter}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-[12px]">Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={statusFilter === "all"}
              onCheckedChange={() => setStatusFilter("all")}
            >
              All clients
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "active"}
              onCheckedChange={() => setStatusFilter("active")}
            >
              Active
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "paused"}
              onCheckedChange={() => setStatusFilter("paused")}
            >
              Paused
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      {clientsQuery.isLoading ? (
        <div className="rounded-lg border bg-card">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        </div>
      ) : allClients.length === 0 && !globalFilter ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Import from a CSV, connect Xero, or add clients manually to get started."
            action={{ label: "Add Your First Client", onClick: () => setShowAdd(true) }}
          />
        </div>
      ) : table.getRowModel().rows.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Search}
            title="No clients match your search"
            description="Try adjusting your search or filters."
            action={{
              label: "Clear filters",
              onClick: () => {
                setGlobalFilter("");
                setStatusFilter("all");
              },
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={
                        header.column.getSize() !== 150
                          ? { width: header.column.getSize() }
                          : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/clients/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted-foreground">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            &ndash;
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{" "}
            of {table.getFilteredRowModel().rows.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[13px] text-muted-foreground px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Load more from server */}
      {clientsQuery.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => clientsQuery.fetchNextPage()}
            disabled={clientsQuery.isFetchingNextPage}
          >
            {clientsQuery.isFetchingNextPage ? "Loading..." : "Load more clients"}
          </Button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card border shadow-lg rounded-lg px-4 py-3">
          <span className="text-[13px] font-medium text-foreground">
            {selectedCount} selected
          </span>
          <div className="w-px h-5 bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="text-[13px]"
            onClick={() => toast.info("Add to campaign coming soon")}
          >
            <Megaphone className="w-3.5 h-3.5 mr-1.5" />
            Add to Campaign
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[13px]"
            onClick={() => toast.info("Bulk pause coming soon")}
          >
            <Pause className="w-3.5 h-3.5 mr-1.5" />
            Pause
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[13px]"
            onClick={() => {
              const selected = table
                .getFilteredSelectedRowModel()
                .rows.map((r) => r.original);
              const csv = [
                "First Name,Last Name,Company,Email,Phone,Type",
                ...selected.map((c) =>
                  [
                    c.firstName,
                    c.lastName,
                    c.companyName || "",
                    c.email || "",
                    c.phone || "",
                    c.clientType,
                  ].join(","),
                ),
              ].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "clients-export.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success(`Exported ${selected.length} clients`);
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[13px] text-muted-foreground"
            onClick={() => setRowSelection({})}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Modals */}
      {showCsvImport && (
        <CsvImportModal
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => clientsQuery.refetch()}
        />
      )}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => createClient.mutate(data)}
          isLoading={createClient.isPending}
          error={createClient.error?.message}
        />
      )}
    </div>
  );
}
