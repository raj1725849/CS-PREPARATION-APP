import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full bg-[#0A231C]">
      <Sidebar />
      <main className="flex-1 ml-[240px] bg-[#0A231C]">
        {children}
      </main>
    </div>
  );
}
