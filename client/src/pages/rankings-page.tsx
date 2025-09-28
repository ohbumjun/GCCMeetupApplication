import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function RankingsPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Rankings" subtitle="View member rankings and performance metrics." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Placeholder for rankings */}
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Member Rankings</h3>
            <p className="text-muted-foreground">Rankings and performance metrics will be displayed here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
