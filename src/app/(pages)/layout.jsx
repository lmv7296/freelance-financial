import { Sidebar } from "@/components/Sidebar";

export default function PagesLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
