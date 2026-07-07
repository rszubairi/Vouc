import Link from "next/link";

export function LegalPage({
  title,
  updatedDate,
  children,
}: {
  title: string;
  updatedDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5EFE0]">
      <header className="bg-[#1C1B18] px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/login" className="text-xl font-bold tracking-tight text-[#C9A227]">
            Vouch
          </Link>
          <Link href="/login" className="text-sm text-[#F5EFE0]/70 hover:text-[#C9A227]">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#1C1B18] mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {updatedDate}</p>
        <div className="prose prose-sm max-w-none text-gray-700 space-y-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1C1B18] [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
    </div>
  );
}
