import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
	createState: string | null;
};

export function ClientCreateBanner({ createState }: Props) {
	if (createState === "success") {
		return (
			<Alert>
				<AlertTitle>Client created</AlertTitle>
				<AlertDescription>
					Client created. Primary contact and first location are ready.
				</AlertDescription>
			</Alert>
		);
	}

	if (createState === "partial-contact") {
		return (
			<Alert variant="warning">
				<TriangleAlert className="h-4 w-4" />
				<AlertTitle>Client created with follow-up needed</AlertTitle>
				<AlertDescription>
					Client created, but we couldn&apos;t save the primary contact. The
					first location was not created. Add the primary contact on this client
					before continuing.
				</AlertDescription>
			</Alert>
		);
	}

	if (createState === "partial-location") {
		return (
			<Alert variant="warning">
				<TriangleAlert className="h-4 w-4" />
				<AlertTitle>Client created with follow-up needed</AlertTitle>
				<AlertDescription>
					Client and primary contact created, but we couldn&apos;t save the
					first location. Add the first location on this client before
					continuing.
				</AlertDescription>
			</Alert>
		);
	}

	return null;
}
