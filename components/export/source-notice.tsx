"use client";

import { Banner } from "@/components/ui/banner";

export function SourceNotice({ children, ...rest }: { children: React.ReactNode } & React.ComponentProps<"div">) {
  return (
    <div {...rest}>
      <Banner tone="warning" dismissible>
        {children}
      </Banner>
    </div>
  );
}
