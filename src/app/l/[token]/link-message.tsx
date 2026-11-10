export function LinkMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted">{body}</p>
    </div>
  );
}
