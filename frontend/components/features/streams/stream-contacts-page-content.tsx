"use client";

import { ArrowLeft, Building2, Mail, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { companiesAPI, locationsAPI } from "@/lib/api/companies";
import { projectsAPI } from "@/lib/api/projects";
import type { CompanyContact, LocationContact } from "@/lib/types/company";

interface StreamContactsPageContentProps {
	projectId: string;
	backHref: string;
	showBackToWorkspace?: boolean;
}

interface ContactsDataState {
	companyId: string;
	locationName: string;
	locationId: string;
	locationAddress: string;
	locationContacts: LocationContact[];
	companyName: string;
	companyContacts: CompanyContact[];
}

const EMPTY_CONTACTS: ContactsDataState = {
	companyId: "",
	locationName: "",
	locationId: "",
	locationAddress: "",
	locationContacts: [],
	companyName: "",
	companyContacts: [],
};

function sortByName<T extends { name?: string }>(contacts: T[]): T[] {
	return [...contacts].sort((left, right) =>
		(left.name ?? "").localeCompare(right.name ?? "", undefined, {
			sensitivity: "base",
		}),
	);
}

function ContactRow({
	name,
	title,
	email,
	phone,
	priority,
}: {
	name: string;
	title?: string | undefined;
	email?: string | undefined;
	phone?: string | undefined;
	priority?: string | undefined;
}) {
	return (
		<div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
			<div className="flex flex-col items-start gap-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-semibold text-foreground">{name}</p>
					{priority ? (
						<Badge
							variant="secondary"
							className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
						>
							{priority}
						</Badge>
					) : null}
				</div>
				{title ? (
					<Badge
						variant="outline"
						className="rounded-full px-2 py-0.5 text-[10px] font-normal tracking-wide mt-1"
					>
						{title}
					</Badge>
				) : null}
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{email ? (
					<Button
						variant="secondary"
						size="sm"
						className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground shadow-none max-w-full"
						asChild
					>
						<a href={`mailto:${email}`} className="flex items-center min-w-0">
							<Mail className="mr-1.5 h-3 w-3 shrink-0" aria-hidden />
							<span className="truncate">{email}</span>
						</a>
					</Button>
				) : null}
				{phone ? (
					<Button
						variant="secondary"
						size="sm"
						className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground shadow-none max-w-full"
						asChild
					>
						<a href={`tel:${phone}`} className="flex items-center min-w-0">
							<Phone className="mr-1.5 h-3 w-3 shrink-0" aria-hidden />
							<span className="truncate">{phone}</span>
						</a>
					</Button>
				) : null}
			</div>
		</div>
	);
}

export function StreamContactsPageContent({
	projectId,
	backHref,
	showBackToWorkspace = true,
}: StreamContactsPageContentProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [contactsData, setContactsData] =
		useState<ContactsDataState>(EMPTY_CONTACTS);

	const loadContacts = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const project = await projectsAPI.getProject(projectId);
			const location = await locationsAPI.get(project.locationId, "active");
			const company = await companiesAPI.get(location.companyId);

			setContactsData({
				companyId: company.id,
				locationName: location.name,
				locationId: location.id,
				locationAddress: location.fullAddress,
				locationContacts: sortByName(location.contacts ?? []),
				companyName: company.name,
				companyContacts: sortByName(company.contacts ?? []),
			});
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Could not load stream contacts.",
			);
		} finally {
			setIsLoading(false);
		}
	}, [projectId]);

	useEffect(() => {
		void loadContacts();
	}, [loadContacts]);

	const hasLocationContacts = contactsData.locationContacts.length > 0;
	const hasCompanyContacts = contactsData.companyContacts.length > 0;

	const companyContactsWithoutLocationDupes = useMemo(() => {
		if (!hasCompanyContacts) {
			return [];
		}

		const locationIdentity = new Set(
			contactsData.locationContacts.map((contact) => {
				const fallback = [contact.name, contact.email, contact.phone]
					.filter(Boolean)
					.join("|")
					.toLowerCase();
				return fallback;
			}),
		);

		return contactsData.companyContacts.filter((contact) => {
			const fallback = [contact.name, contact.email, contact.phone]
				.filter(Boolean)
				.join("|")
				.toLowerCase();
			return fallback ? !locationIdentity.has(fallback) : true;
		});
	}, [
		contactsData.companyContacts,
		contactsData.locationContacts,
		hasCompanyContacts,
	]);

	return (
		<div className="flex h-full flex-col gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
			<header className="flex flex-col gap-3">
				{showBackToWorkspace ? (
					<Button asChild size="sm" variant="ghost" className="w-fit">
						<Link href={backHref}>
							<ArrowLeft data-icon="inline-start" aria-hidden />
							Back to workspace
						</Link>
					</Button>
				) : null}
				<h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
					Contacts
				</h1>
				<p className="text-sm text-muted-foreground">
					People responsible for operations at this site, backed by corporate
					contacts.
				</p>
				<div className="flex flex-wrap items-center gap-2">
					{contactsData.companyId ? (
						<Button asChild size="sm" variant="outline">
							<Link
								href={`/clients/${contactsData.companyId}/contacts?locationId=${contactsData.locationId}`}
							>
								<Users data-icon="inline-start" aria-hidden />
								Manage location contacts
							</Link>
						</Button>
					) : null}
					{contactsData.companyId ? (
						<Button asChild size="sm" variant="ghost">
							<Link href={`/clients/${contactsData.companyId}/contacts`}>
								<Building2 data-icon="inline-start" aria-hidden />
								Open client contacts hub
							</Link>
						</Button>
					) : null}
				</div>
			</header>

			<div className="flex-1 space-y-8 overflow-y-auto pb-6">
				<section className="space-y-4">
					<header className="flex flex-col gap-1 border-b pb-4">
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-primary" />
							<h2 className="text-lg font-semibold tracking-tight text-foreground">
								{contactsData.locationName || "Current location"}
							</h2>
						</div>
						{contactsData.locationAddress ? (
							<p className="text-sm text-muted-foreground ml-7">
								{contactsData.locationAddress}
							</p>
						) : null}
					</header>
					<div>
						{isLoading ? (
							<p className="py-4 text-sm text-muted-foreground">
								Loading location contacts...
							</p>
						) : error ? (
							<p className="py-4 text-sm text-destructive">{error}</p>
						) : hasLocationContacts ? (
							<div className="flex flex-col divide-y">
								{contactsData.locationContacts.map((contact) => (
									<ContactRow
										key={contact.id}
										name={contact.name}
										title={contact.title}
										email={contact.email}
										phone={contact.phone}
										priority="Location priority"
									/>
								))}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
								<p className="text-sm font-medium text-foreground">
									No location contacts
								</p>
								<p className="text-sm text-muted-foreground">
									Contacts linked to this location will appear here.
								</p>
							</div>
						)}
					</div>
				</section>

				<section className="space-y-4">
					<header className="flex flex-col gap-1 border-b pb-4">
						<div className="flex items-center gap-2">
							<Building2 className="h-5 w-5 text-muted-foreground" />
							<h2 className="text-lg font-semibold tracking-tight text-foreground">
								{contactsData.companyName || "Company contacts"}
							</h2>
							<Badge
								variant="secondary"
								className="rounded-full px-2 py-0.5 text-[10px] font-normal tracking-wide text-muted-foreground uppercase"
							>
								Corporate backup
							</Badge>
						</div>
					</header>
					<div>
						{isLoading ? (
							<p className="py-4 text-sm text-muted-foreground">
								Loading company contacts...
							</p>
						) : companyContactsWithoutLocationDupes.length > 0 ? (
							<div className="flex flex-col divide-y">
								{companyContactsWithoutLocationDupes.map((contact) => (
									<ContactRow
										key={contact.id}
										name={contact.name || "Unnamed"}
										title={contact.title}
										email={contact.email}
										phone={contact.phone}
									/>
								))}
							</div>
						) : (
							<div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
								<Users className="h-4 w-4" />
								<span>No additional company contacts to show.</span>
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
