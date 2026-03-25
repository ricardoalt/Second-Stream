"use client";

import { PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { DraftStreamRow } from "./types";

type StreamsDraftsTableProps = {
	rows: DraftStreamRow[];
};

export function StreamsDraftsTable({ rows }: StreamsDraftsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow className="bg-surface-container-low">
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Material type
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Process method
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">
						Vol. (tons/mo)
					</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Units</TableHead>
					<TableHead className="px-4 py-3 text-[0.68rem]">Location</TableHead>
					<TableHead className="px-4 py-3 text-right text-[0.68rem]">
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row, index) => (
					<TableRow
						key={row.id}
						className={
							index % 2 === 0 ? "bg-surface" : "bg-surface-container-low"
						}
					>
						<TableCell className="px-4 py-3">
							<Input
								value={row.materialType}
								className="bg-surface-container-highest"
								readOnly
							/>
						</TableCell>
						<TableCell className="px-4 py-3">
							<Input
								value={row.processMethod}
								className="bg-surface-container-highest"
								readOnly
							/>
						</TableCell>
						<TableCell className="px-4 py-3">
							<Input
								value={row.volume}
								className="bg-surface-container-highest"
								readOnly
							/>
						</TableCell>
						<TableCell className="px-4 py-3 text-muted-foreground">
							{row.units}
						</TableCell>
						<TableCell className="px-4 py-3">
							<Select defaultValue={row.location}>
								<SelectTrigger className="bg-surface-container-highest">
									<SelectValue placeholder="Select location" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value={row.location}>{row.location}</SelectItem>
										<SelectItem value="Dallas, TX">Dallas, TX</SelectItem>
										<SelectItem value="Nashville, TN">Nashville, TN</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</TableCell>
						<TableCell className="px-4 py-3">
							<div className="flex items-center justify-end gap-2">
								<Button variant="secondary" size="sm">
									Confirm
								</Button>
								<Button variant="ghost" size="sm">
									<PencilLine data-icon="inline-start" aria-hidden />
									Edit
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Delete draft"
								>
									<Trash2 aria-hidden />
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
