"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { onToasterRequested } from "@/components/ui/notify";

const Toaster = dynamic(() => import("@/components/ui/sonner").then((module) => module.Toaster), { ssr: false });

/** Mounts the toaster only once something asks for a toast (see notify.ts). */
export function LazyToaster() {
  const [active, setActive] = useState(false);

  useEffect(() => onToasterRequested(() => setActive(true)), []);

  return active ? <Toaster /> : null;
}
