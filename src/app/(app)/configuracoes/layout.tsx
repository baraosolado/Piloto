export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="pointer-events-none fixed top-0 right-0 -z-10 size-64 rounded-full bg-[#006d33]/5 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-0 left-0 -z-10 size-96 rounded-full bg-black/[0.04] blur-[120px]"
        aria-hidden
      />
      <div className="relative mx-auto min-h-0 w-full max-w-xl flex-1 px-6 pb-28 pt-2">
        {children}
      </div>
    </>
  );
}
