export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-2 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">This page was not included in the exported files yet.</p>
    </div>
  );
}
