"use client";

import {
	Building2,
	CheckCircle,
	Loader2,
	Plus,
	RefreshCcw,
	XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgCard } from "@/components/features/admin";
import {
	EmptyState,
	FadeIn,
	FilterBar,
	HoverLift,
	KpiCard,
	PageHeader,
	PageShell,
	Pressable,
	StaggerContainer,
	StaggerItem,
	StatRail,
} from "@/components/patterns";

const EditOrgModal = dynamic(
	() =>
		import("@/components/features/admin/edit-org-modal").then(
			(mod) => mod.EditOrgModal,
		),
	{ ssr: false, loading: () => null },
);

const ConfirmArchiveDialog = dynamic(
	() =>
		import("@/components/patterns/dialogs/confirm-archive-dialog").then(
			(mod) => mod.ConfirmArchiveDialog,
		),
	{ ssr: false, loading: () => null },
);

const ConfirmRestoreDialog = dynamic(
	() =>
		import("@/components/patterns/dialogs/confirm-restore-dialog").then(
			(mod) => mod.ConfirmRestoreDialog,
		),
	{ ssr: false, loading: () => null },
);

const ConfirmOrgPurgeForceDialog = dynamic(
	() =>
		import("@/components/features/admin/confirm-org-purge-force-dialog").then(
			(mod) => mod.ConfirmOrgPurgeForceDialog,
		),
	{ ssr: false, loading: () => null },
);

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Skeleton,
	Switch,
} from "@/components/ui";
import {
	type Organization,
	type OrganizationCreateInput,
	type OrganizationUpdateInput,
	organizationsAPI,
} from "@/lib/api/organizations";
import {
	isOrgArchiveBlockedError,
	resolveOrganizationLifecycleErrorMessage,
	runOrganizationArchiveFlow,
	showOrganizationPurgeForceResultToast,
} from "@/lib/errors/organization-lifecycle";
import { useOrganizationStore } from "@/lib/stores/organization-store";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export default function AdminOrganizationsPage() {
	const { selectedOrgId, loadOrganizations } = useOrganizationStore();
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [showArchived, setShowArchived] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
	const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
	const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
	const [archiveForceMode, setArchiveForceMode] = useState(false);
	const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
	const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
	const [lifecycleLoading, setLifecycleLoading] = useState(false);
	const [form, setForm] = useState({
		name: "",
		slug: "",
		contactEmail: "",
		contactPhone: "",
	});
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const fetchOrganizations = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await organizationsAPI.list({
				includeInactive: showArchived,
			});
			setOrganizations(data);
		} catch {
			toast.error("Failed to load organizations");
		} finally {
			setIsLoading(false);
		}
	}, [showArchived]);

	useEffect(() => {
		fetchOrganizations();
	}, [fetchOrganizations]);

	const stats = useMemo(() => {
		const total = organizations.length;
		const active = organizations.filter((org) => org.isActive).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [organizations]);

	const filteredOrganizations = useMemo(() => {
		let filtered = organizations;

		if (selectedOrgId) {
			filtered = filtered.filter((org) => org.id === selectedOrgId);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(org) =>
					org.name.toLowerCase().includes(query) ||
					org.slug.toLowerCase().includes(query) ||
					org.contactEmail?.toLowerCase().includes(query),
			);
		}

		return filtered;
	}, [organizations, selectedOrgId, searchQuery]);

	const handleNameChange = (value: string) => {
		setForm((prev) => ({
			...prev,
			name: value,
			slug: slugManuallyEdited ? prev.slug : slugify(value),
		}));
	};

	const handleSlugChange = (value: string) => {
		setSlugManuallyEdited(true);
		setForm((prev) => ({ ...prev, slug: slugify(value) }));
	};

	const handleInputChange = (
		field: "contactEmail" | "contactPhone",
		value: string,
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const resetForm = () => {
		setForm({ name: "", slug: "", contactEmail: "", contactPhone: "" });
		setSlugManuallyEdited(false);
	};

	const canSubmitForm = useMemo(() => {
		return form.name.trim() !== "" && form.slug.trim() !== "";
	}, [form.name, form.slug]);

	const handleCreateOrganization = async () => {
		if (!canSubmitForm) return;

		setSubmitting(true);
		try {
			const trimmedEmail = form.contactEmail.trim();
			const trimmedPhone = form.contactPhone.trim();
			const payload: OrganizationCreateInput = {
				name: form.name.trim(),
				slug: form.slug.trim(),
				...(trimmedEmail ? { contactEmail: trimmedEmail } : {}),
				...(trimmedPhone ? { contactPhone: trimmedPhone } : {}),
			};
			const newOrg = await organizationsAPI.create(payload);
			setOrganizations((prev) => [...prev, newOrg]);
			await loadOrganizations();
			toast.success(`Organization "${newOrg.name}" created`);
			setCreateModalOpen(false);
			resetForm();
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to create organization";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleUpdateOrganization = async (
		orgId: string,
		data: OrganizationUpdateInput,
	) => {
		try {
			const updated = await organizationsAPI.update(orgId, data);
			setOrganizations((prev) =>
				prev.map((org) => (org.id === orgId ? updated : org)),
			);
			await loadOrganizations();
			toast.success("Organization updated");
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: "Failed to update organization";
			toast.error(message);
			throw error;
		}
	};

	const refreshAfterLifecycle = async () => {
		await fetchOrganizations();
		await loadOrganizations();
	};

	const handleArchive = async (force = false) => {
		if (!selectedOrg) return;
		setLifecycleLoading(true);
		try {
			await runOrganizationArchiveFlow({
				archive: organizationsAPI.archive,
				orgId: selectedOrg.id,
				orgName: selectedOrg.name,
				forceDeactivateUsers: force,
			});
			setArchiveDialogOpen(false);
			setArchiveForceMode(false);
			setSelectedOrg(null);
			await refreshAfterLifecycle();
		} catch (error: unknown) {
			if (isOrgArchiveBlockedError(error) && !force) {
				setArchiveForceMode(true);
				return;
			}
			const message = resolveOrganizationLifecycleErrorMessage(error);
			if (message) toast.error(message);
		} finally {
			setLifecycleLoading(false);
		}
	};

	const handleRestore = async () => {
		if (!selectedOrg) return;
		setLifecycleLoading(true);
		try {
			await organizationsAPI.restore(selectedOrg.id);
			toast.success(`Organization "${selectedOrg.name}" restored`);
			setRestoreDialogOpen(false);
			setSelectedOrg(null);
			await refreshAfterLifecycle();
		} catch (error: unknown) {
			const message = resolveOrganizationLifecycleErrorMessage(error);
			if (message) toast.error(message);
		} finally {
			setLifecycleLoading(false);
		}
	};

	const handlePurgeForce = async (payload: {
		confirmName: string;
		confirmPhrase: string;
		reason: string;
		ticketId: string;
	}) => {
		if (!selectedOrg) return;
		setLifecycleLoading(true);
		try {
			const result = await organizationsAPI.purgeForce(selectedOrg.id, payload);
			showOrganizationPurgeForceResultToast(selectedOrg.name, result);
			setPurgeDialogOpen(false);
			setSelectedOrg(null);
			await refreshAfterLifecycle();
		} catch (error: unknown) {
			const message = resolveOrganizationLifecycleErrorMessage(error);
			if (message) toast.error(message);
		} finally {
			setLifecycleLoading(false);
		}
	};

	return (
		<PageShell>
			<FadeIn direction="up">
				<PageHeader
					title="Organizations"
					subtitle="Manage tenant organizations and their users."
					icon={Building2}
					actions={
						<div className="flex items-center gap-2">
							<Pressable>
								<Button
									variant="outline"
									size="icon"
									onClick={fetchOrganizations}
									disabled={isLoading}
									aria-label="Refresh organizations list"
								>
									<RefreshCcw
										className={`size-4 ${isLoading ? "animate-spin" : ""}`}
									/>
								</Button>
							</Pressable>
							<Pressable>
								<Button onClick={() => setCreateModalOpen(true)}>
									<Plus className="size-4 mr-2" />
									New Organization
								</Button>
							</Pressable>
						</div>
					}
				/>
			</FadeIn>

			<StatRail columns={3}>
				<HoverLift>
					<KpiCard title="Total" value={stats.total} icon={Building2} />
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Active"
						value={stats.active}
						icon={CheckCircle}
						variant="success"
					/>
				</HoverLift>
				<HoverLift>
					<KpiCard
						title="Inactive"
						value={stats.inactive}
						icon={XCircle}
						variant="muted"
					/>
				</HoverLift>
			</StatRail>

			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
				<FilterBar
					search={{
						value: searchQuery,
						onChange: setSearchQuery,
						placeholder: "Search organizations…",
					}}
					activeFilterCount={searchQuery ? 1 : 0}
					onClear={() => setSearchQuery("")}
					className="flex-1"
				/>
				<div className="flex items-center gap-2 rounded-md border px-3 py-2 shrink-0">
					<Switch checked={showArchived} onCheckedChange={setShowArchived} />
					<Label className="text-sm font-normal">Show archived</Label>
				</div>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="p-6 border rounded-lg space-y-4">
							<div className="flex items-start gap-4">
								<Skeleton className="h-14 w-14 rounded-xl" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-24" />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<Skeleton className="h-12" />
								<Skeleton className="h-12" />
							</div>
							<Skeleton className="h-9 w-full" />
						</div>
					))}
				</div>
			) : filteredOrganizations.length === 0 ? (
				<EmptyState
					icon={Building2}
					title={
						searchQuery
							? "No organizations found"
							: selectedOrgId
								? "No organization matches"
								: "No organizations yet"
					}
					description={
						searchQuery
							? "Try adjusting your search."
							: "Create your first organization to get started."
					}
					action={
						!searchQuery && !selectedOrgId ? (
							<Button onClick={() => setCreateModalOpen(true)}>
								<Plus className="size-4 mr-2" />
								Create Organization
							</Button>
						) : undefined
					}
				/>
			) : (
				<StaggerContainer
					staggerDelay={0.06}
					className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
				>
					{filteredOrganizations.map((org) => (
						<StaggerItem key={org.id}>
							<HoverLift>
								<OrgCard
									organization={org}
									onEdit={(org) => setEditingOrg(org)}
									actionLoading={lifecycleLoading}
									onArchive={(org) => {
										setSelectedOrg(org);
										setArchiveDialogOpen(true);
									}}
									onRestore={(org) => {
										setSelectedOrg(org);
										setRestoreDialogOpen(true);
									}}
									onPurge={(org) => {
										setSelectedOrg(org);
										setPurgeDialogOpen(true);
									}}
								/>
							</HoverLift>
						</StaggerItem>
					))}
				</StaggerContainer>
			)}

			<Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Organization</DialogTitle>
						<DialogDescription>
							Add a new tenant organization to the platform
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name *</Label>
							<Input
								id="name"
								placeholder="Acme Corporation"
								value={form.name}
								onChange={(e) => handleNameChange(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="slug">Slug *</Label>
							<Input
								id="slug"
								placeholder="acme-corp"
								value={form.slug}
								onChange={(e) => handleSlugChange(e.target.value)}
								className="font-mono"
							/>
							<p className="text-xs text-muted-foreground">
								Auto-generated from name. URL-friendly identifier.
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<Input
								id="contactEmail"
								type="email"
								placeholder="admin@acme.com"
								value={form.contactEmail}
								onChange={(e) =>
									handleInputChange("contactEmail", e.target.value)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="contactPhone">Contact Phone</Label>
							<Input
								id="contactPhone"
								placeholder="+1 555 123 4567"
								value={form.contactPhone}
								onChange={(e) =>
									handleInputChange("contactPhone", e.target.value)
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setCreateModalOpen(false);
								resetForm();
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateOrganization}
							disabled={!canSubmitForm || submitting}
						>
							{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{submitting ? "Creating..." : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<EditOrgModal
				open={!!editingOrg}
				onOpenChange={(open) => !open && setEditingOrg(null)}
				organization={editingOrg}
				onSubmit={handleUpdateOrganization}
			/>

			<ConfirmArchiveDialog
				open={archiveDialogOpen}
				onOpenChange={(open) => {
					setArchiveDialogOpen(open);
					if (!open) {
						setSelectedOrg(null);
						setArchiveForceMode(false);
					}
				}}
				onConfirm={() => handleArchive(false)}
				onForceConfirm={() => handleArchive(true)}
				entityType="organization"
				entityName={selectedOrg?.name ?? ""}
				loading={lifecycleLoading}
				hasActiveUsers={archiveForceMode}
			/>

			<ConfirmRestoreDialog
				open={restoreDialogOpen}
				onOpenChange={(open) => {
					setRestoreDialogOpen(open);
					if (!open) setSelectedOrg(null);
				}}
				onConfirm={handleRestore}
				entityType="organization"
				entityName={selectedOrg?.name ?? ""}
				loading={lifecycleLoading}
			/>

			<ConfirmOrgPurgeForceDialog
				open={purgeDialogOpen}
				onOpenChange={(open) => {
					setPurgeDialogOpen(open);
					if (!open) setSelectedOrg(null);
				}}
				onConfirm={handlePurgeForce}
				orgName={selectedOrg?.name ?? ""}
				orgSlug={selectedOrg?.slug ?? ""}
				loading={lifecycleLoading}
			/>
		</PageShell>
	);
}
