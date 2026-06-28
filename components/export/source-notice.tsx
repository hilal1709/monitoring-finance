

export function SourceNotice({ children, ...rest }: { children: React.ReactNode } & React.ComponentProps<"div">) {
  return (
    <div {...rest} className="rounded-lg border border-[#ffd166]/25 bg-[#ffd166]/10 px-4 py-3 text-xs leading-5 text-[var(--app-fg)]">
      {children}
    </div>
  );
}
