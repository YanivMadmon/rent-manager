export function LinkMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="opacity-70">{body}</p>
    </div>
  );
}
