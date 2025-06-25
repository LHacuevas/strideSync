import StrideSyncDashboard from '@/components/stride-sync/dashboard';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <StrideSyncDashboard />
    </main>
  );
}
