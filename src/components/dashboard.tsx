"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, ServerCrash, Trophy, LayoutDashboard, Search, ListTree } from "lucide-react";
import { motion } from "framer-motion";

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

const COLOR_MAP = [
  { text: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", header: "bg-blue-600" },
  { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", header: "bg-emerald-600" },
  { text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", header: "bg-purple-600" },
  { text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", header: "bg-orange-600" },
  { text: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200", badge: "bg-pink-100 text-pink-700", header: "bg-pink-600" },
];

export function Dashboard() {
  const [results, setResults] = useState<JalurResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  // New States
  const [query, setQuery] = useState("");
  const [isSeparate, setIsSeparate] = useState(false);

  const started = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json: RefreshResponse = await res.json();
      if (!json.ok || !json.results) {
        throw new Error(json.error || "Gagal mengambil data");
      }
      setResults(json.results);
      setFetchedAt(json.fetchedAt ?? new Date().toISOString());
      setUpdateCount((prev) => prev + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    refresh();
  }, [refresh]);

  // Auto refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refresh(true); // silent refresh
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const maxRows = Math.max(0, ...results.map(r => r.data.length));
  const q = query.trim().toLowerCase();

  // Determine which rows to show in Unified Table based on search query
  const matchedRowIndices = Array.from({ length: maxRows })
    .map((_, i) => i)
    .filter(rowIndex => {
      if (!q) return true;
      return results.some(jalur => {
        const person = jalur.data[rowIndex];
        return person && (
          (person.nama_lengkap || '').toLowerCase().includes(q) ||
          (person.no_pendaftaran || '').toLowerCase().includes(q)
        );
      });
    });

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans pb-24">
      {/* Web3 Modern Light Mode Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-400/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[700px] h-[700px] bg-emerald-400/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-6">
        
        {/* Header Title */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            SPMB Jateng - Hasil Pengumuman Semua Jalur
          </h1>
        </div>

        {/* Top Info Card */}
        <Card className="border border-slate-200 bg-white/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-8 gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Sekolah</p>
                <p className="font-extrabold text-slate-800 text-lg">SMA NEGERI 1 BUKATEJA</p>
                {fetchedAt && (
                  <p className="text-xs text-slate-400 mt-2 font-medium">Update terakhir: {formatTime(fetchedAt)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Kabupaten</p>
                <p className="font-extrabold text-slate-800 text-lg">Purbalingga</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Jenjang</p>
                <p className="font-extrabold text-slate-800 text-lg">SMA</p>
              </div>
              <div className="flex flex-col justify-between items-start md:items-end w-full">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1 md:text-right">Update ke-</p>
                  <p className="font-extrabold text-slate-800 text-lg md:text-right">{updateCount}</p>
                </div>
                <button
                  onClick={() => refresh(false)}
                  disabled={loading}
                  className="mt-3 px-5 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  REFRESH DATA
                </button>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-red-600 shadow-sm">
            <ServerCrash className="h-6 w-6 shrink-0" />
            <div className="text-sm font-medium">
              <span className="font-bold">Error:</span> {error}
            </div>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loading && results.length === 0 ? (
             Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl bg-white border border-slate-200" />)
          ) : (
             results.map((jalur, index) => {
                const colors = COLOR_MAP[index % COLOR_MAP.length];
                return (
                  <motion.div
                    key={`top-summary-${jalur.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white border ${colors.border} rounded-3xl p-6 hover:shadow-lg transition-shadow relative overflow-hidden group`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full blur-[40px] group-hover:scale-150 transition-transform`} />
                    <p className={`text-sm font-extrabold ${colors.text} uppercase tracking-widest mb-3 relative z-10`}>{jalur.jalur}</p>
                    <p className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter relative z-10">{jalur.data.length}</p>
                    <p className="text-sm text-slate-500 mt-1 font-medium relative z-10">peserta aktif</p>
                  </motion.div>
                );
             })
          )}
        </div>

        {/* Tools Row: Search & Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6">
          <div className="relative group w-full md:max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari berdasarkan nama atau no. pendaftaran..."
              className="pl-12 h-14 bg-white border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 placeholder-slate-400 transition-all text-base shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0">
             <ListTree className="w-5 h-5 text-slate-500" />
             <label htmlFor="separate-toggle" className="font-bold text-slate-700 cursor-pointer text-sm">
               Bedakan Jalur
             </label>
             <button
               id="separate-toggle"
               role="switch"
               aria-checked={isSeparate}
               onClick={() => setIsSeparate(!isSeparate)}
               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                 isSeparate ? "bg-blue-600" : "bg-slate-300"
               }`}
             >
               <span
                 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                   isSeparate ? "translate-x-6" : "translate-x-1"
                 }`}
               />
             </button>
          </div>
        </div>

        {/* Content Section based on Toggle */}
        {loading && results.length === 0 ? (
          <div className="p-8 space-y-4 bg-white rounded-3xl border border-slate-200 mt-4">
            <Skeleton className="h-12 w-full bg-slate-100 rounded-xl" />
            <Skeleton className="h-12 w-full bg-slate-100 rounded-xl" />
          </div>
        ) : results.length === 0 ? (
          <div className="p-16 text-center text-slate-500 font-medium bg-white rounded-3xl border border-slate-200 mt-4">
            Tidak ada data pendaftar saat ini.
          </div>
        ) : (
          <div className="mt-4">
            {!isSeparate ? (
              /* Unified Table Section */
              <Card className="border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                <CardHeader className="py-6 px-8 border-b border-slate-100 bg-white">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    Tabel Gabungan Semua Jalur
                  </h2>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto custom-scrollbar relative">
                  {matchedRowIndices.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Tidak ditemukan hasil pencarian "{query}".</div>
                  ) : (
                    <Table className="min-w-max border-collapse">
                      <TableHeader>
                        <TableRow className="bg-blue-600 hover:bg-blue-600 border-b-0">
                          <TableHead className="text-white font-extrabold text-sm h-16 pl-8 align-middle border-r border-blue-500/50 w-24">Peringkat</TableHead>
                          {results.map((jalur) => (
                            <React.Fragment key={`head-${jalur.id}`}>
                              <TableHead className="text-white font-extrabold text-sm h-16 align-middle border-r border-blue-500/50 bg-blue-700/20 px-6 min-w-[180px]">
                                No. Pendaftaran
                              </TableHead>
                              <TableHead className="text-white font-extrabold text-sm h-16 align-middle px-6 min-w-[250px] border-r border-blue-500/50 last:border-r-0">
                                Nama - Jalur {jalur.jalur}
                              </TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white">
                        {matchedRowIndices.map((rowIndex) => (
                          <TableRow key={rowIndex} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors even:bg-slate-50/50">
                            <TableCell className="pl-8 font-black text-slate-400 border-r border-slate-100 bg-slate-50/80 tabular-nums text-base">
                              {rowIndex + 1}
                            </TableCell>
                            {results.map((jalur) => {
                              const person = jalur.data[rowIndex];
                              const matchesSearch = q && person && (
                                (person.nama_lengkap || '').toLowerCase().includes(q) ||
                                (person.no_pendaftaran || '').toLowerCase().includes(q)
                              );
                              
                              return (
                                <React.Fragment key={`cell-${jalur.id}-${rowIndex}`}>
                                  <TableCell className={`font-mono font-medium border-r border-slate-100 px-6 tabular-nums tracking-wide transition-colors ${matchesSearch ? 'text-blue-700 bg-blue-50/50' : 'text-slate-600'}`}>
                                    {person?.no_pendaftaran || <span className="text-slate-300">-</span>}
                                  </TableCell>
                                  <TableCell className={`font-bold px-6 border-r border-slate-100 last:border-r-0 capitalize text-[15px] transition-colors ${matchesSearch ? 'text-blue-700 bg-blue-50/50' : 'text-slate-800'}`}>
                                    {person?.nama_lengkap || <span className="text-slate-300">-</span>}
                                  </TableCell>
                                </React.Fragment>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Separated Tables Section */
              <div className="flex flex-col gap-8">
                {results.map((jalur, index) => {
                  const colors = COLOR_MAP[index % COLOR_MAP.length];
                  const filteredData = jalur.data.map((person, rankIndex) => ({ person, rankIndex })).filter(({ person }) => {
                    if (!q) return true;
                    return person && (
                      (person.nama_lengkap || '').toLowerCase().includes(q) ||
                      (person.no_pendaftaran || '').toLowerCase().includes(q)
                    );
                  });

                  if (q && filteredData.length === 0) return null; // Hide completely empty tables when searching

                  return (
                    <motion.div
                      key={`sep-table-${jalur.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
                        <CardHeader className={`py-6 px-8 border-b border-slate-100 ${colors.header}`}>
                           <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center justify-between gap-3">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-black">{index + 1}</div>
                               Jalur {jalur.jalur}
                             </div>
                             <div className="bg-white/20 px-3 py-1 rounded-lg text-sm">
                               {filteredData.length} Peserta
                             </div>
                           </h2>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                           <Table className="min-w-max border-collapse">
                             <TableHeader>
                               <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                 <TableHead className="text-slate-500 font-extrabold text-sm h-14 pl-8 align-middle border-r border-slate-200 w-24">Peringkat</TableHead>
                                 <TableHead className="text-slate-500 font-extrabold text-sm h-14 align-middle border-r border-slate-200 px-6 min-w-[180px]">No. Pendaftaran</TableHead>
                                 <TableHead className="text-slate-500 font-extrabold text-sm h-14 align-middle px-6 min-w-[250px]">Nama Lengkap</TableHead>
                               </TableRow>
                             </TableHeader>
                             <TableBody className="bg-white">
                               {filteredData.map(({ person, rankIndex }) => {
                                 const matchesSearch = q && person && (
                                  (person.nama_lengkap || '').toLowerCase().includes(q) ||
                                  (person.no_pendaftaran || '').toLowerCase().includes(q)
                                 );
                                 
                                 return (
                                   <TableRow key={rankIndex} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                     <TableCell className="pl-8 font-black text-slate-400 border-r border-slate-100 bg-slate-50/30 tabular-nums text-base">
                                       {rankIndex + 1}
                                     </TableCell>
                                     <TableCell className={`font-mono font-medium border-r border-slate-100 px-6 tabular-nums tracking-wide transition-colors ${matchesSearch ? `${colors.text} ${colors.bg}` : 'text-slate-600'}`}>
                                       {person?.no_pendaftaran || "-"}
                                     </TableCell>
                                     <TableCell className={`font-bold px-6 capitalize text-[15px] transition-colors ${matchesSearch ? `${colors.text} ${colors.bg}` : 'text-slate-800'}`}>
                                       {person?.nama_lengkap || "-"}
                                     </TableCell>
                                   </TableRow>
                                 )
                               })}
                             </TableBody>
                           </Table>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
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
