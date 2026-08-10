import { Metadata } from "next";
import { ReactNode } from "react";

// provides the global base styles for the entire authentication experience
import "@/styles/globals.css";

export const metadata: Metadata = {
	title: "Mjakazi Connect",
	description:
		"Kenya's premier high-trust digital bureau for domestic help. Find and hire verified wajakazi through our secure, document-backed platform. NDPA-compliant vetting including National ID and Certificate of Good Conduct checks.",
	robots: { index: false, follow: false },
};

const AuthLayout = ({ children }: { children: ReactNode }) => {
	return (
		<div className="bg-bg-subtle flex min-h-screen">
			{/* brand panel — desktop only */}
			<div className="bg-primary relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
				{/* decorative circles */}
				<div className="absolute -top-16 -right-16 h-64 w-64 rounded-full border-40 border-white/5" />
				<div className="border-accent/10 absolute -bottom-12 -left-12 h-48 w-48 rounded-full border-30" />

				<div className="relative z-10 space-y-6">
					<div>
						<p className="font-display text-2xl font-bold text-white">Mjakazi Connect</p>
						<span className="bg-accent/20 text-accent mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase">
							Kenya's Trusted Bureau
						</span>
					</div>

					<h2 className="font-display max-w-xs text-3xl leading-snug font-bold text-white">
						Find trusted help.
						<br />
						Get found by the right home.
					</h2>

					<p className="max-w-sm text-sm leading-relaxed text-white/65">
						A verified directory connecting professional wajakazi with Kenya's households
						— securely, transparently, and on your terms.
					</p>

					<ul className="space-y-3 pt-4">
						{[
							"Document-verified profiles",
							"NDPA 2019 compliant",
							"No subscription auto-renewals, ever",
						].map((item) => (
							<li key={item} className="flex items-center gap-3">
								<span className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full" />
								<span className="text-sm text-white/70">{item}</span>
							</li>
						))}
					</ul>
				</div>

				<p className="relative z-10 text-xs text-white/30">
					© {new Date().getFullYear()} Mjakazi Connect Limited
				</p>
			</div>

			{/* auth form area */}
			<div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
				{/* mobile brand strip */}
				<div className="bg-primary mb-6 w-full max-w-md rounded-xl px-6 py-4 lg:hidden">
					<p className="font-display text-lg font-bold text-white">Mjakazi Connect</p>
					<span className="bg-accent/20 text-accent mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase">
						Kenya's Trusted Bureau
					</span>
				</div>

				{/* clerk renders here with no wrapping card */}
				<div className="w-full max-w-md">{children}</div>
			</div>
		</div>
	);
};

export { AuthLayout as default };
