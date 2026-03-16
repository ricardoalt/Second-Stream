"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SaveStatus = "idle" | "saving" | "saved";

interface NotesCardProps {
	value: string;
	onChange: (value: string) => void;
}

export function NotesCard({ value, onChange }: NotesCardProps) {
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleChange = useCallback(
		(next: string) => {
			onChange(next);
			setSaveStatus("saving");

			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				setSaveStatus("saved");
			}, 800);
		},
		[onChange],
	);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">Notes</CardTitle>
					<span
						className="flex items-center gap-1 text-xs text-muted-foreground"
						aria-live="polite"
					>
						{saveStatus === "saving" && (
							<>
								<Loader2 className="h-3 w-3 animate-spin" />
								Saving...
							</>
						)}
						{saveStatus === "saved" && (
							<>
								<CheckCircle2 className="h-3 w-3 text-success" />
								Saved
							</>
						)}
					</span>
				</div>
			</CardHeader>
			<CardContent>
				<Label htmlFor="proposal-notes" className="sr-only">
					Notes
				</Label>
				<Textarea
					id="proposal-notes"
					rows={6}
					value={value}
					onChange={(e) => handleChange(e.target.value)}
					placeholder="Add notes about this proposal..."
					className="resize-y"
				/>
			</CardContent>
		</Card>
	);
}
