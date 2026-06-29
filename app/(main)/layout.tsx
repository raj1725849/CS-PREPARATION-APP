import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full bg-[#0A231C]">
      <Sidebar />
      <main className="flex-1 md:ml-[240px] pt-16 md:pt-0 bg-[#0A231C] w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
