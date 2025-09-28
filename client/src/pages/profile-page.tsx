import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="My Profile" subtitle="View and edit your profile information." />
        
        <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
          {/* Placeholder for profile management */}
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-foreground mb-2">Profile Management</h3>
            <p className="text-muted-foreground">Profile editing features will be implemented here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
