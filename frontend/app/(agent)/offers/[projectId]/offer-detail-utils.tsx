import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function shouldShowInsightsRefreshFailedNotice(
	queryParamValue: string | null,
) {
	return queryParamValue === "1";
}

export function removeInsightsRefreshFailedFromHref(href: string) {
	const url = new URL(href);
	if (!url.searchParams.has("insightsRefreshFailed")) {
		return null;
	}

	url.searchParams.delete("insightsRefreshFailed");
	const search = url.searchParams.toString();

	return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

export function OfferInsightsRefreshFailedNotice() {
	return (
		<Alert variant="warning">
			<AlertTriangle className="size-4" aria-hidden />
			<AlertTitle>Discovery completed with delayed insights</AlertTitle>
			<AlertDescription>
				Discovery completed and this Offer is open, but insights could not be
				generated yet. You can continue now and refresh insights when ready.
			</AlertDescription>
		</Alert>
	);
}

export function resolveOfferDetailHeaderTitle(detail: {
	displayTitle: string | null;
	offerId: string;
}) {
	const candidate = detail.displayTitle?.trim();
	if (candidate) {
		return candidate;
	}

	return "Offer";
}
