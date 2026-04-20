import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

const THEME_LABELS: Record<string, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
};

type SettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

// Mock working memory - not connected to server
const useWorkingMemory = () => {
	const [memory, setMemory] = useState({
		name: "",
		traits: "",
		anythingElse: "",
	});

	const updateMemory = (newMemory: typeof memory) => {
		setMemory(newMemory);
		// Save to localStorage for persistence
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"secondstream_working_memory",
				JSON.stringify(newMemory),
			);
		}
	};

	// Load from localStorage on mount
	if (typeof window !== "undefined" && !memory.name && !memory.traits) {
		const stored = localStorage.getItem("secondstream_working_memory");
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				setMemory(parsed);
			} catch {
				// ignore parse errors
			}
		}
	}

	return { memory, updateMemory };
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const { theme, setTheme } = useTheme();
	const { memory, updateMemory } = useWorkingMemory();
	const [isPending, setIsPending] = useState(false);

	const [name, setName] = useState(memory.name);
	const [traits, setTraits] = useState(memory.traits);
	const [anythingElse, setAnythingElse] = useState(memory.anythingElse);

	function handleSave() {
		setIsPending(true);

		const parsedTraits = traits
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		updateMemory({
			name: name || "",
			traits: parsedTraits.join(", ") || "",
			anythingElse: anythingElse || "",
		});

		// Simulate API call
		setTimeout(() => {
			setIsPending(false);
			toast.success("Settings saved");
			onOpenChange(false);
		}, 500);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg p-6 gap-6">
				<DialogHeader>
					<DialogTitle className="text-lg">Settings</DialogTitle>
				</DialogHeader>

				<section className="space-y-3">
					<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
						Appearance
					</h3>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Theme</p>
							<p className="text-muted-foreground text-xs">
								Choose how the app looks
							</p>
						</div>
						<Select
							value={theme}
							onValueChange={(value) => {
								if (value) setTheme(value);
							}}
						>
							<SelectTrigger>
								<SelectValue>{THEME_LABELS[theme ?? "system"]}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="system">System</SelectItem>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</section>

				<Separator />

				<section className="space-y-5">
					<div className="space-y-1">
						<h3 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
							Personalization
						</h3>
						<p className="text-muted-foreground text-xs">
							Shared with the assistant across all conversations.
						</p>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="wm-name">Name</Label>
						<Input
							id="wm-name"
							placeholder="What should the assistant call you?"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="wm-traits">Personality traits</Label>
						<Input
							id="wm-traits"
							placeholder="concise, empathetic, curious"
							value={traits}
							onChange={(e) => setTraits(e.target.value)}
						/>
						<p className="text-muted-foreground text-xs">
							Comma-separated. Shapes the assistant&apos;s tone and style.
						</p>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="wm-anything">Additional context</Label>
						<Textarea
							id="wm-anything"
							placeholder="Preferences, project context, constraints..."
							value={anythingElse}
							onChange={(e) => setAnythingElse(e.target.value)}
							rows={4}
						/>
					</div>
				</section>

				<Separator />

				<Button onClick={handleSave} disabled={isPending} className="w-full">
					{isPending ? "Saving..." : "Save personalization"}
				</Button>
			</DialogContent>
		</Dialog>
	);
}
