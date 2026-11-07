import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
      <nav aria-label="Legal and support" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link href="/privacy" className="hover:text-blue-800">Privacy</Link>
        <Link href="/terms" className="hover:text-blue-800">Terms</Link>
        <a href="mailto:joegady94@gmail.com" className="hover:text-blue-800">joegady94@gmail.com</a>
      </nav>
    </footer>
  );
}
