import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthModal } from "@/components/AuthModal";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { PreferencesProvider } from "@/lib/preferences/PreferencesContext";

// Applies the cached theme before first paint so dark mode doesn't flash light.
// Keep the storage key in sync with PREFERENCES_STORAGE_KEY in PreferencesContext.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("ff_preferences")||"{}");var t=p.theme||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");if(p.language)document.documentElement.lang=p.language}catch(e){}`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FreelanceFin — Financieel Beheer voor Vakmensen",
  description:
    "Eenvoudig factureren, offertes opstellen en BTW-kluizen beheren.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased text-foreground bg-background">
        <AuthProvider>
          <PreferencesProvider>
            {children}
            <AuthModal />
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
