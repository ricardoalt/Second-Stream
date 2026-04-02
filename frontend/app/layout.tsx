import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Manrope } from "next/font/google";
import type React from "react";
import { ClientLayout } from "@/components/providers/client-layout";
import { ThemeProvider } from "@/components/shared/common/theme-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const manrope = Manrope({
	subsets: ["latin"],
	variable: "--font-display",
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "SecondStream - AI Waste Opportunity Platform",
	description:
		"AI-powered waste opportunity platform for industrial teams. Discover opportunities, assess viability, and move streams from intake to proposal.",
	generator: "v0.app",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn("font-sans", inter.variable)}
		>
			<body
				className={`${inter.variable} ${manrope.variable} ${jetbrains.variable} font-sans antialiased`}
			>
				{/* Skip to main content link for keyboard navigation */}
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
				>
					Skip to main content
				</a>

				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange
				>
					<ClientLayout>{children}</ClientLayout>
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
