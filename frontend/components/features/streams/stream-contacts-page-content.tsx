"use client";

import { ArrowLeft, Building2, Mail, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
		<div className="rounded-lg border bg-surface-container-lowest p-3">
			<div className="flex flex-wrap items-center gap-2">
				<p className="text-sm font-semibold text-foreground">{name}</p>
				{title ? <Badge variant="outline">{title}</Badge> : null}
				{priority ? (
					<Badge variant="secondary" className="rounded-full">
						{priority}
					</Badge>
				) : null}
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-2">
				{email ? (
					<Button variant="outline" size="sm" asChild>
						<a href={`mailto:${email}`}>
							<Mail data-icon="inline-start" aria-hidden />
							{email}
						</a>
					</Button>
				) : null}
				{phone ? (
					<Button variant="outline" size="sm" asChild>
						<a href={`tel:${phone}`}>
							<Phone data-icon="inline-start" aria-hidden />
							{phone}
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
					Prioritizing contacts at the current location first.
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

			<div className="flex-1 space-y-4 overflow-y-auto">
				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader className="gap-2">
						<div className="flex items-center gap-2">
							<MapPin className="size-4 text-muted-foreground" />
							<CardTitle className="text-base">
								{contactsData.locationName || "Current location"}
							</CardTitle>
						</div>
						{contactsData.locationAddress ? (
							<p className="text-xs text-muted-foreground">
								{contactsData.locationAddress}
							</p>
						) : null}
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className="text-sm text-muted-foreground">
								Loading location contacts...
							</p>
						) : error ? (
							<p className="text-sm text-destructive">{error}</p>
						) : hasLocationContacts ? (
							<div className="space-y-3">
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
							<p className="text-sm text-muted-foreground">
								No contacts found at this location.
							</p>
						)}
					</CardContent>
				</Card>

				<Separator />

				<Card className="bg-surface-container-lowest shadow-sm">
					<CardHeader className="gap-2">
						<div className="flex items-center gap-2">
							<Building2 className="size-4 text-muted-foreground" />
							<CardTitle className="text-base">
								{contactsData.companyName || "Company contacts"}
							</CardTitle>
							<Badge variant="outline" className="rounded-full">
								Secondary
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className="text-sm text-muted-foreground">
								Loading company contacts...
							</p>
						) : companyContactsWithoutLocationDupes.length > 0 ? (
							<div className="space-y-3">
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
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Users className="size-4" />
								<span>No additional company contacts to show.</span>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
