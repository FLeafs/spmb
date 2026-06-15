"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Pendaftar {
  no_pendaftaran: string | null;
  nama_lengkap: string | null;
}

interface JalurResult {
  jalur: string;
  id: number;
  data: Pendaftar[];
}

interface RefreshResponse {
  ok: boolean;
  fetchedAt?: string;
  results?: JalurResult[];
  error?: string;
}

// Distinct accent per jalur — gradients, border, badge, ring colors.
const JALUR_THEME: Record<
  number,
  { from: string; to: string; badge: string; dot: string; ring: string }
> = {
  1: {
    from: "from-violet-500",
    to: "to-fuchsia-500",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    ring: "ring-violet-500/20",
  },
  2: {
    from: "from-sky-500",
    to: "to-cyan-400",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    ring: "ring-sky-500/20",
  },
  3: {
    from: "from-amber-500",
    to: "to-orange-500",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  4: {
    from: "from-emerald-500",
    to: "to-teal-400",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  5: {
    from: "from-rose-500",
    to: "to-pink-500",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    ring: "ring-rose-500/20",
  },
};

const FALLBACK_THEME = JALUR_THEME[1];

export function Dashboard() {
  const [results, setResults] = useState<JalurResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const started = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json: RefreshResponse = await res.json();
      if (!json.ok || !json.results) {
        throw new Error(json.error || "Gagal mengambil data");
      }
      setResults(json.results);
      setFetchedAt(json.fetchedAt ?? new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // On first visit, trigger a fetch (this is the "user accesses web → refresh" flow).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    refresh();
  }, [refresh]);

  const totalPendaftar = results.reduce((sum, r) => sum + r.data.length, 0);
  const q = query.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Header
          loading={loading}
          fetchedAt={fetchedAt}
          totalJalur={results.length}
          totalPendaftar={totalPendaftar}
          onRefresh={refresh}
        />

        <div className="mt-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau no. pendaftaran…"
            className="h-11 bg-white/70 backdrop-blur dark:bg-slate-900/60"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="font-semibold">Terjadi kesalahan:</span> {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6 pb-16">
          {loading && results.length === 0
            ? Array.from({ length: 5 }).map((_, i) => <JalurSkeleton key={i} />)
            : results.map((jalur) => (
                <JalurCard key={jalur.id} jalur={jalur} query={q} />
              ))}
        </div>
      </div>
    </div>
  );
}

function Header({
  loading,
  fetchedAt,
  totalJalur,
  totalPendaftar,
  onRefresh,
}: {
  loading: boolean;
  fetchedAt: string | null;
  totalJalur: number;
  totalPendaftar: number;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow">
            SP
          </span>
          <h1 className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            SPMB Jateng Dashboard
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Perangkingan per jalur pendaftaran · Sekolah ID 235
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-4">
          <Stat label="Jalur" value={totalJalur} />
          <Stat label="Pendaftar" value={totalPendaftar} />
        </div>
        <Button
          onClick={onRefresh}
          disabled={loading}
          className="h-11 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md hover:opacity-90"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Memuat…
            </span>
          ) : (
            "Refresh Data"
          )}
        </Button>
      </div>

      {fetchedAt && (
        <p className="w-full text-xs text-muted-foreground sm:hidden">
          Diperbarui {formatTime(fetchedAt)}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function JalurCard({ jalur, query }: { jalur: JalurResult; query: string }) {
  const theme = JALUR_THEME[jalur.id] ?? FALLBACK_THEME;
  const rows = query
    ? jalur.data.filter(
        (d) =>
          d.nama_lengkap?.toLowerCase().includes(query) ||
          d.no_pendaftaran?.toLowerCase().includes(query)
      )
    : jalur.data;

  return (
    <Card
      className={`overflow-hidden border-0 py-0 shadow-md ring-1 ${theme.ring}`}
    >
      <div className={`h-1.5 bg-gradient-to-r ${theme.from} ${theme.to}`} />
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
          <h2 className="text-lg font-semibold">{jalur.jalur}</h2>
        </div>
        <Badge className={`${theme.badge} border-0 font-semibold`}>
          {rows.length}
          {query && ` / ${jalur.data.length}`} pendaftar
        </Badge>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {jalur.data.length === 0 ? (
          <EmptyState message="Belum ada data untuk jalur ini." />
        ) : rows.length === 0 ? (
          <EmptyState message="Tidak ada hasil yang cocok dengan pencarian." />
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-14 pl-6">#</TableHead>
                  <TableHead>No. Pendaftaran</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow
                    key={`${row.no_pendaftaran}-${i}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="pl-6 text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {row.no_pendaftaran ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.nama_lengkap ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function JalurSkeleton() {
  return (
    <Card className="overflow-hidden border-0 py-0 shadow-md">
      <Skeleton className="h-1.5 w-full rounded-none" />
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}
