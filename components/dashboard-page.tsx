"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import gsap from "gsap";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RefreshCcw,
  ReceiptText,
  Search,
  Settings,
  Table2,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: false },
  { label: "Payment Dashboard", icon: Wallet, active: false },
  { label: "Invoice Dashboard", icon: ReceiptText, active: false },
  { label: "Data History", icon: History, active: true },
];

const metrics = [
  {
    title: "Total Rows Processed",
    value: "124.5K",
    delta: "+12% this month",
    icon: Database,
    tone: "emerald",
  },
  {
    title: "Success Rate",
    value: "98.2%",
    delta: "Last sync: 2h ago",
    icon: CheckCircle2,
    tone: "blue",
  },
  {
    title: "Critical Errors",
    value: "3",
    delta: "Requires attention",
    icon: AlertTriangle,
    tone: "rose",
  },
] as const;

const uploadRows = [
  {
    filename: "Q3_Invoices_EU.xlsx",
    type: "Invoice",
    date: "Oct 24, 2023",
    time: "14:32",
    status: "Success",
    statusTone: "success",
    rows: "4,250",
    icon: Table2,
    actions: [Eye, RefreshCcw, Trash2],
  },
  {
    filename: "Oct_Payroll_Batch.csv",
    type: "Payment",
    date: "Oct 23, 2023",
    time: "09:15",
    status: "Error (3 Lines)",
    statusTone: "error",
    rows: "1,120",
    icon: Table2,
    actions: [Eye, RefreshCcw, Trash2],
  },
  {
    filename: "Vendor_List_Update.xlsx",
    type: "Master Data",
    date: "Oct 21, 2023",
    time: "16:45",
    status: "Success",
    statusTone: "success",
    rows: "84",
    icon: Table2,
    actions: [Eye, RefreshCcw, Trash2],
  },
  {
    filename: "Q4_Forecast_Draft.xlsx",
    type: "Forecast",
    date: "Just now",
    time: "",
    status: "Processing",
    statusTone: "processing",
    rows: "--",
    icon: Table2,
    actions: [Eye, Trash2],
  },
] as const;

function Sparkline() {
  return (
    <svg className="h-14 w-full" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,24 C10,18 18,10 28,16 C38,22 48,8 58,12 C68,16 78,5 88,10 C93,12 97,9 100,7" fill="none" stroke="#adc6ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M0,24 C10,18 18,10 28,16 C38,22 48,8 58,12 C68,16 78,5 88,10 C93,12 97,9 100,7 L100,32 L0,32 Z" fill="url(#historyGradient)" opacity="0.2" />
      <defs>
        <linearGradient id="historyGradient" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#adc6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ActivityBars() {
  const bars = [56, 72, 64, 80, 52, 90, 68];

  return (
    <div className="flex h-24 items-end gap-2">
      {bars.map((value, index) => (
        <div
          key={`${value}-${index}`}
          data-activity-bar
          data-target-height={`${value}%`}
          className="bar-animate w-full rounded-t-full bg-gradient-to-t from-[#571bc1] to-[#adc6ff] shadow-[0_10px_24px_rgba(173,198,255,0.16)]"
          style={{ height: 0 }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const blocks = rootRef.current.querySelectorAll<HTMLElement>("[data-animate-block]");
    const graphNode = graphRef.current;
    const rowsNode = rowsRef.current;
    const timeline = gsap.timeline({ defaults: { duration: 0.7, ease: "power3.out" } });

    timeline.fromTo(blocks, { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08 });

    if (graphNode) {
      gsap.fromTo(graphNode, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 1.1, ease: "power2.out" });
      animate(graphNode.querySelectorAll("[data-activity-bar]"), {
        height: (el: Element) => (el as HTMLElement).dataset.targetHeight ?? "0%",
        delay: stagger(80),
        duration: 900,
        easing: "easeOutCubic",
      });
    }

    if (rowsNode) {
      animate(rowsNode.querySelectorAll("[data-history-row]"), {
        opacity: [0, 1],
        translateX: [-16, 0],
        delay: stagger(90),
        duration: 700,
        easing: "easeOutCubic",
      });
    }

    return () => {
      timeline.kill();
      gsap.killTweensOf([graphNode, blocks]);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(173,198,255,0.12)_0%,transparent_36%),radial-gradient(circle_at_bottom_right,rgba(87,27,193,0.15)_0%,transparent_40%),linear-gradient(180deg,#07101d_0%,#0b1326_100%)] text-[#dae2fd]"
    >
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40" />

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-[#171f33]/95 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.05)] md:block">
        <div className="flex h-full flex-col p-6">
          <div className="mb-12 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#adc6ff] to-[#571bc1] shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3)]">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#adc6ff]">FinVision</h1>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Enterprise Finance</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  href="#"
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300 active:scale-95",
                    item.active
                      ? "bg-[#571bc1] text-[#c4abff] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
                      : "text-slate-300 hover:bg-[#2d3449] hover:text-[#adc6ff]",
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-colors", item.active ? "text-[#d8e2ff]" : "text-slate-400 group-hover:text-[#adc6ff]")} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/5 pt-6">
            <Button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#adc6ff] px-4 py-3 text-[#00285d] shadow-[4px_4px_8px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.1)] hover:bg-[#d8e2ff] active:scale-[0.98]">
              <Upload className="h-4 w-4" />
              New Import
            </Button>
          </div>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-[#0b1326]/80 px-4 backdrop-blur-xl md:w-[calc(100%-16rem)] md:px-10 md:ml-64">
        <button className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/5 md:hidden" type="button">
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden w-72 items-center rounded-full bg-[#2d3449] px-4 py-2 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.02)] sm:flex">
          <Search className="mr-2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search records..." className="h-auto border-0 bg-transparent p-0 text-sm text-[#dae2fd] placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0" />
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" className="relative rounded-full text-slate-300 hover:bg-white/5 hover:text-[#adc6ff]">
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.8)]" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/5 hover:text-[#adc6ff]">
            <Settings className="h-5 w-5" />
          </Button>
          <div className="mx-1 hidden h-8 w-px bg-white/10 sm:block" />
          <div className="hidden items-center gap-3 lg:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-white">Alex Mercer</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-[#2d3449] shadow-sm transition-colors hover:border-[#adc6ff]/50">
              <Image
                alt="User Profile Avatar"
                className="h-full w-full object-cover"
                width={40}
                height={40}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJWIrLJXd7T_wQepStdQl-MiI4DKGaEPTtFD6ICyBfx56RSgEOWEEu76qb0BBLA36nK0hTZ6PXMoEOXX03dYMn7KUEIHBnQcpl0lEA_UlFjCkJEg3en5T5Bj_ygJsWzOAo7BuDpWOL8elCv5ssZZrrmIwW0QRqlrpYwUCVYd6ZVjhQJCiEdY6WWluMUWDYkJlfKa4u1Oifh4mYfSuGzXNXVDiTGuGhIfa4R2ZhSjf3JK6BLwxrJ8tw3-tmmjRE_O98Gt1uwkGs1BY"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 ml-0 h-screen overflow-y-auto px-4 pb-20 pt-24 md:ml-64 md:px-10">
        <div className="mx-auto max-w-[1440px]">
          <section className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
                Data Management &amp; History
              </h2>
              <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
                Review, audit, and manage previously uploaded Excel data files. Maintain oversight of import statuses and error logs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="rounded-xl bg-[#171f33] text-slate-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-1px_-1px_3px_rgba(255,255,255,0.05)] hover:text-[#adc6ff]">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button className="rounded-xl bg-[#adc6ff] text-[#00285d] shadow-[0_4px_12px_rgba(173,198,255,0.2)] hover:bg-[#d8e2ff]">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
            </div>
          </section>

          <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {metrics.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} data-animate-block className="relative overflow-hidden border-white/5 bg-[#0b1326]/55 backdrop-blur-3xl">
                  <CardContent className="p-6">
                    <div className="absolute right-0 top-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                      <Icon className="h-16 w-16 text-[#adc6ff]" />
                    </div>
                    <p className="mb-1 text-sm text-slate-400">{item.title}</p>
                    <p className="text-3xl font-semibold tracking-tight text-white">{item.value}</p>
                    <div className={cn("mt-4 flex items-center gap-2 text-sm", item.tone === "emerald" && "text-[#4edea3]", item.tone === "blue" && "text-[#adc6ff]", item.tone === "rose" && "text-[#ffb4ab]")}>
                      <TrendingUp className="h-4 w-4" />
                      <span>{item.delta}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mb-10 grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
            <Card data-animate-block className="overflow-hidden border-white/5 bg-[#0b1326]/55 backdrop-blur-3xl">
              <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-white/10 bg-[#171f33]/50 p-6">
                <div>
                  <CardTitle className="text-2xl font-semibold text-white">Upload Log</CardTitle>
                  <CardDescription className="mt-2 text-slate-400">Latest file imports and pipeline outcomes</CardDescription>
                </div>
                <Button variant="ghost" className="rounded-full text-[#adc6ff] hover:bg-white/5 hover:text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <div ref={graphRef} className="border-b border-white/10 p-6">
                  <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                    <Clock3 className="h-4 w-4" />
                    Import activity over the last week
                  </div>
                  <Sparkline />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#171f33]">
                        <th className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400">Filename</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400">Type</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400">Upload Date</th>
                        <th className="px-6 py-4 text-xs uppercase tracking-[0.2em] text-slate-400">Status</th>
                        <th className="px-6 py-4 text-right text-xs uppercase tracking-[0.2em] text-slate-400">Rows</th>
                        <th className="px-6 py-4 text-right text-xs uppercase tracking-[0.2em] text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody ref={rowsRef} className="divide-y divide-white/5 text-sm text-white">
                      {uploadRows.map((row) => {
                        const Icon = row.icon;

                        return (
                          <tr key={row.filename} data-history-row className="group transition-colors hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#2d3449] text-[#adc6ff] shadow-inner border border-white/10">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-[#dae2fd]">{row.filename}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-400">{row.type}</td>
                            <td className="px-6 py-4 text-slate-400">
                              {row.date} <span className="ml-1 text-slate-500">{row.time}</span>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                                  row.statusTone === "success" && "border border-[#4edea3]/20 bg-[#00a572]/20 text-[#4edea3]",
                                  row.statusTone === "error" && "border border-[#ffb4ab]/20 bg-[#93000a]/20 text-[#ffb4ab]",
                                  row.statusTone === "processing" && "border border-[#adc6ff]/20 bg-[#4d8eff]/20 text-[#adc6ff]",
                                )}
                              >
                                {row.statusTone === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : row.statusTone === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : <RefreshCcw className="h-3.5 w-3.5 animate-spin" />}
                                {row.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right text-slate-400">{row.rows}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                {row.actions.map((ActionIcon) => (
                                  <Button key={ActionIcon.name} variant="ghost" size="icon" className="rounded-lg text-slate-400 hover:bg-[#2d3449] hover:text-[#adc6ff]">
                                    <ActionIcon className="h-4 w-4" />
                                  </Button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 bg-[#0b1326]/80 p-4">
                  <p className="text-xs text-slate-400">Showing 1 to 4 of 128 entries</p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-white/10 bg-[#2d3449] text-slate-400 disabled:opacity-50" disabled>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button className="h-8 w-8 rounded-lg bg-[#4d8eff]/20 px-0 text-[#adc6ff] shadow-none hover:bg-[#4d8eff]/25">1</Button>
                    <Button variant="ghost" className="h-8 w-8 rounded-lg border border-transparent px-0 text-slate-400 hover:border-white/10 hover:bg-[#2d3449]">2</Button>
                    <Button variant="ghost" className="h-8 w-8 rounded-lg border border-transparent px-0 text-slate-400 hover:border-white/10 hover:bg-[#2d3449]">3</Button>
                    <span className="mx-1 text-slate-500">...</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-white/10 bg-[#2d3449] text-slate-400 hover:text-[#adc6ff]">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-animate-block className="overflow-hidden border-white/5 bg-[#171f33] backdrop-blur-3xl">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-[#adc6ff]/10 p-2 text-[#adc6ff]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <h4 className="text-2xl font-semibold text-white">Pipeline Health</h4>
                  </div>
                  <p className="mb-6 leading-7 text-slate-300">
                    Your import pipeline is stable. One pending file is still processing, while previous uploads are available for review and re-upload.
                  </p>
                  <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                      <span>Throughput trend</span>
                      <span className="text-[#adc6ff]">+18%</span>
                    </div>
                    <ActivityBars />
                  </div>
                  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Queue depth</span>
                      <span className="text-[#dae2fd]">14 jobs</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#adc6ff] to-[#4edea3]" />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span>Validation coverage</span>
                      <span className="text-[#4edea3]">96%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-[#4edea3] to-[#adc6ff]" />
                    </div>
                  </div>
                </div>

                <Button className="mt-6 rounded-2xl bg-[#adc6ff] text-[#00285d] hover:bg-[#d8e2ff]">
                  <Download className="mr-2 h-4 w-4" />
                  Export Audit Pack
                </Button>

                <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-[#4d8eff]/10 to-[#571bc1]/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#2d3449] p-2 text-[#adc6ff]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Audit trail ready</p>
                      <p className="text-sm text-slate-400">All records are exportable and versioned.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}