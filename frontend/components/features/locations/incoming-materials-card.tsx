"use client";

import {
	Briefcase,
	FileText,
	Package,
	Plus,
	Sparkles,
	Trash2,
	Truck,
} from "lucide-react";
import { useState } from "react";
import { IncomingMaterialDialog } from "@/components/features/locations/incoming-material-dialog";
import { ConfirmDialog } from "@/components/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isForbiddenError } from "@/lib/api/client";
import { locationsAPI } from "@/lib/api/companies";
import { useToast } from "@/lib/hooks/use-toast";
import type {
	IncomingMaterial,
	IncomingMaterialCategory,
} from "@/lib/types/company";
import { INCOMING_MATERIAL_CATEGORY_LABELS } from "@/lib/types/company";
import { cn } from "@/lib/utils";

interface IncomingMaterialsCardProps {
	materials: IncomingMaterial[];
	locationId: string;
	canWriteMaterials: boolean;
	canDeleteMaterials: boolean;
	onMaterialsUpdated: () => void | Promise<void>;
}

function MaterialCardContent({
	material,
	canDeleteMaterials,
	onDelete,
}: {
	material: IncomingMaterial;
	canDeleteMaterials: boolean;
	onDelete: () => void;
}) {
	return (
		<>
			{/* Row 1: Name + Actions */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0 flex-1">
					<Package className="h-4 w-4 text-muted-foreground shrink-0" />
					<span className="text-sm font-semibold truncate">
						{material.name}
					</span>
				</div>
				{canDeleteMaterials && (
					<Button
						size="icon"
						variant="ghost"
						className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 md:opacity-0 max-md:opacity-100 transition-opacity"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
					>
						<Trash2 className="h-4 w-4 text-destructive" />
					</Button>
				)}
			</div>

			{/* Row 2: Category Badge */}
			<div>
				<Badge variant="secondary" className="text-xs">
					{INCOMING_MATERIAL_CATEGORY_LABELS[material.category]}
				</Badge>
			</div>

			{/* Row 3: Volume */}
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Truck className="h-3.5 w-3.5 shrink-0" />
				<span className="truncate">{material.volumeFrequency}</span>
			</div>

			{/* Row 4: Quality (optional) */}
			{material.qualitySpec && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Sparkles className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{material.qualitySpec}</span>
				</div>
			)}

			{/* Row 5: Supplier (optional) */}
			{material.currentSupplier && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Briefcase className="h-3.5 w-3.5 shrink-0" />
					<span className="truncate">{material.currentSupplier}</span>
				</div>
			)}

			{/* Row 6: Notes (optional) */}
			{material.notes && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<FileText className="h-3.5 w-3.5 shrink-0" />
					<span className="line-clamp-1">{material.notes}</span>
				</div>
			)}
		</>
	);
}

function MaterialCard({
	material,
	canWriteMaterials,
	canDeleteMaterials,
	onEdit,
	onDelete,
}: {
	material: IncomingMaterial;
	canWriteMaterials: boolean;
	canDeleteMaterials: boolean;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const baseClasses = "group border rounded-lg p-3 space-y-2 transition-shadow";

	if (canWriteMaterials) {
		return (
			<button
				type="button"
				className={cn(baseClasses, "cursor-pointer hover:shadow-md text-left")}
				onClick={onEdit}
			>
				<MaterialCardContent
					material={material}
					canDeleteMaterials={canDeleteMaterials}
					onDelete={onDelete}
				/>
			</button>
		);
	}

	return (
		<div className={baseClasses}>
			<MaterialCardContent
				material={material}
				canDeleteMaterials={canDeleteMaterials}
				onDelete={onDelete}
			/>
		</div>
	);
}

export function IncomingMaterialsCard({
	materials,
	locationId,
	canWriteMaterials,
	canDeleteMaterials,
	onMaterialsUpdated,
}: IncomingMaterialsCardProps) {
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [materialToDelete, setMaterialToDelete] =
		useState<IncomingMaterial | null>(null);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [materialToEdit, setMaterialToEdit] = useState<IncomingMaterial | null>(
		null,
	);
	const [loading, setLoading] = useState(false);
	const { toast } = useToast();

	const handleCreate = async (data: {
		name: string;
		category: IncomingMaterialCategory;
		volumeFrequency: string;
		qualitySpec?: string;
		currentSupplier?: string;
		notes?: string;
	}) => {
		setLoading(true);
		try {
			await locationsAPI.createIncomingMaterial(locationId, data);
			toast({
				title: "Material added",
				description: "Incoming material saved successfully.",
			});
			await onMaterialsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error ? error.message : "Failed to add material",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (
		materialId: string,
		data: {
			name: string;
			category: IncomingMaterialCategory;
			volumeFrequency: string;
			qualitySpec?: string;
			currentSupplier?: string;
			notes?: string;
		},
	) => {
		setLoading(true);
		try {
			await locationsAPI.updateIncomingMaterial(locationId, materialId, data);
			toast({
				title: "Material updated",
				description: "Incoming material updated successfully.",
			});
			await onMaterialsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: "Failed to update material",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!materialToDelete) return;
		setLoading(true);
		try {
			await locationsAPI.deleteIncomingMaterial(
				locationId,
				materialToDelete.id,
			);
			toast({
				title: "Material deleted",
				description: "Incoming material removed successfully.",
			});
			setDeleteDialogOpen(false);
			setMaterialToDelete(null);
			await onMaterialsUpdated();
		} catch (error) {
			if (!isForbiddenError(error)) {
				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: "Failed to delete material",
					variant: "destructive",
				});
			}
		} finally {
			setLoading(false);
		}
	};

	const isEmpty = materials.length === 0;

	const openEditDialog = (material: IncomingMaterial) => {
		setMaterialToEdit(material);
		setEditDialogOpen(true);
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle className="text-xl font-semibold">
					Incoming Materials
				</CardTitle>
				{canWriteMaterials && (
					<IncomingMaterialDialog
						trigger={
							<Button size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Add Material
							</Button>
						}
						onSubmit={handleCreate}
					/>
				)}
			</CardHeader>
			<CardContent>
				{isEmpty ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
						<p className="text-sm text-muted-foreground mb-4">
							Add materials to track what this location consumes
						</p>
						{canWriteMaterials && (
							<IncomingMaterialDialog
								trigger={
									<Button variant="outline" size="sm">
										<Plus className="h-4 w-4 mr-2" />
										Add First Material
									</Button>
								}
								onSubmit={handleCreate}
							/>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{materials.map((material) => (
							<MaterialCard
								key={material.id}
								material={material}
								canWriteMaterials={canWriteMaterials}
								canDeleteMaterials={canDeleteMaterials}
								onEdit={() => openEditDialog(material)}
								onDelete={() => {
									setMaterialToDelete(material);
									setDeleteDialogOpen(true);
								}}
							/>
						))}
					</div>
				)}
			</CardContent>

			{/* Edit Dialog - controlled externally for card click */}
			{canWriteMaterials && materialToEdit && (
				<IncomingMaterialDialog
					material={materialToEdit}
					open={editDialogOpen}
					onOpenChange={(open) => {
						setEditDialogOpen(open);
						if (!open) setMaterialToEdit(null);
					}}
					onSubmit={(data) => handleUpdate(materialToEdit.id, data)}
				/>
			)}

			{canDeleteMaterials && (
				<ConfirmDialog
					open={deleteDialogOpen}
					onOpenChange={(open) => {
						setDeleteDialogOpen(open);
						if (!open) setMaterialToDelete(null);
					}}
					onConfirm={handleDelete}
					title="Delete Incoming Material"
					description={`This will permanently delete "${materialToDelete?.name}".`}
					confirmText="Delete"
					variant="destructive"
					loading={loading}
				/>
			)}
		</Card>
	);
}
