export default function Modal({
  open,
  children,
}: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm w-full max-w-lg mx-4">
        {children}
      </div>
    </div>
  );
}