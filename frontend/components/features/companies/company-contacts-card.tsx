"use client";

import { Crown, Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";
import { CompanyContactDialog } from "@/components/features/companies/company-contact-dialog";
import { ConfirmDialog, MetaBadge } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { isForbiddenError } from "@/lib/api/client";
import { companiesAPI } from "@/lib/api/companies";
import { useToast } from "@/lib/hooks/use-toast";
import type { CompanyContact } from "@/lib/types/company";

interface CompanyContactsCardProps {
	companyId: string;
	contacts: CompanyContact[];
	canManageContacts: boolean;
	onContactsUpdated: () => void | Promise<void>;
}

export function CompanyContactsCard({
	companyId,
	contacts,
	canManageContacts,
	onContactsUpdated,
}: CompanyContactsCardProps) {
	const sortedContacts = useMemo(
		() =>
			[...contacts].sort((a, b) => {
				const nameA = (a.name ?? "").localeCompare(b.name ?? "", undefined, {
					sensitivity: "base",
				});
				if (nameA !== 0) return nameA;
				return a.id.localeCompare(b.id);
			}),
		[contacts],
	);

	const [loading, setLoading] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [contactToDelete, setContactToDelete] = useState<CompanyContact | null>(
		null,
	);
	const { toast } = useToast();

	const handleCreate = async (data: {
		name?: string;
		email?: string;
		phone?: string;
		title?: string;
		notes?: string;
		isPrimary: boolean;
	}) => {
		setLoading(true);
		try {
			await companiesAPI.createContact(companyId, data);
			toast({
				title: "Contact added",
				description: "Company contact saved successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to add contact",
					variant: "destructive",
				});
			}
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (
		contactId: string,
		data: {
			name?: string;
			email?: string;
			phone?: string;
			title?: string;
			notes?: string;
			isPrimary: boolean;
		},
	) => {
		setLoading(true);
		try {
			await companiesAPI.updateContact(companyId, contactId, data);
			toast({
				title: "Contact updated",
				description: "Company contact updated successfully.",
			});
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to update contact",
					variant: "destructive",
				});
			}
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!contactToDelete) return;
		setLoading(true);
		try {
			await companiesAPI.deleteContact(companyId, contactToDelete.id);
			toast({
				title: "Contact deleted",
				description: "Company contact removed successfully.",
			});
			setDeleteDialogOpen(false);
			setContactToDelete(null);
			await onContactsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to delete contact",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<header className="flex items-center justify-between border-b pb-4">
				<h2 className="text-xl font-semibold tracking-tight">
					Company Contacts
				</h2>
				{canManageContacts && (
					<CompanyContactDialog
						trigger={
							<Button size="sm" disabled={loading} className="shrink-0">
								<Plus className="mr-2 h-4 w-4" />
								Add Contact
							</Button>
						}
						onSubmit={handleCreate}
					/>
				)}
			</header>
			<div className="space-y-4">
				{sortedContacts.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
						<div className="rounded-full bg-muted/50 p-3 text-muted-foreground">
							<User className="h-5 w-5" />
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								No corporate contacts
							</p>
							<p className="text-sm text-muted-foreground">
								Add executive or corporate contacts who oversee the entire
								account.
							</p>
						</div>
						{canManageContacts && (
							<CompanyContactDialog
								trigger={
									<Button
										variant="outline"
										size="sm"
										className="mt-2"
										disabled={loading}
									>
										<Plus className="mr-2 h-4 w-4" />
										Add first contact
									</Button>
								}
								onSubmit={handleCreate}
							/>
						)}
					</div>
				) : (
					<div className="flex flex-col divide-y">
						{sortedContacts.map((contact) => (
							<div
								key={contact.id}
								className="group flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
							>
								<div className="flex flex-col items-start gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="font-semibold text-foreground">
											{contact.name || "Unnamed"}
										</p>
										{contact.isPrimary && (
											<MetaBadge
												icon={Crown}
												className="bg-primary/10 text-primary uppercase tracking-wider"
											>
												Primary
											</MetaBadge>
										)}
										{contact.title && <MetaBadge>{contact.title}</MetaBadge>}
									</div>
									<div className="mt-2.5 flex flex-wrap items-center gap-2">
										{contact.email && (
											<Button
												variant="secondary"
												size="sm"
												className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground shadow-none max-w-full"
												asChild
											>
												<a
													href={`mailto:${contact.email}`}
													className="flex items-center min-w-0"
												>
													<Mail className="mr-1.5 h-3 w-3 shrink-0" />
													<span className="truncate">{contact.email}</span>
												</a>
											</Button>
										)}
										{contact.phone && (
											<Button
												variant="secondary"
												size="sm"
												className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground shadow-none max-w-full"
												asChild
											>
												<a
													href={`tel:${contact.phone}`}
													className="flex items-center min-w-0"
												>
													<Phone className="mr-1.5 h-3 w-3 shrink-0" />
													<span className="truncate">{contact.phone}</span>
												</a>
											</Button>
										)}
									</div>
									{contact.notes && (
										<p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-xl">
											{contact.notes}
										</p>
									)}
								</div>
								{canManageContacts && (
									<div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
										<CompanyContactDialog
											contact={contact}
											trigger={
												<Button
													size="icon"
													variant="ghost"
													className="h-8 w-8"
													disabled={loading}
													aria-label={`Edit contact ${contact.name || "Unnamed"}`}
												>
													<Pencil className="h-4 w-4" />
												</Button>
											}
											onSubmit={(data) => handleUpdate(contact.id, data)}
										/>
										<Button
											size="icon"
											variant="ghost"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											disabled={loading}
											aria-label={`Delete contact ${contact.name || "Unnamed"}`}
											onClick={() => {
												setContactToDelete(contact);
												setDeleteDialogOpen(true);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
			{canManageContacts && (
				<ConfirmDialog
					open={deleteDialogOpen}
					onOpenChange={(open) => {
						setDeleteDialogOpen(open);
						if (!open) setContactToDelete(null);
					}}
					onConfirm={handleDelete}
					title="Delete Contact"
					description={`This will permanently delete "${contactToDelete?.name || "Unnamed"}".`}
					confirmText="Delete"
					variant="destructive"
					loading={loading}
				/>
			)}
		</div>
	);
}
