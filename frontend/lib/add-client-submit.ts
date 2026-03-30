import {
	type AddClientFlowDeps,
	type AddClientFlowResult,
	buildClientCreateHandoffUrl,
	runAddClientFlow,
} from "@/lib/add-client-flow";
import type { AddClientFormData } from "@/lib/forms/schemas";

export type AddClientSubmitResult = AddClientFlowResult & {
	handoffUrl: string;
};

export async function submitAddClientAndBuildHandoff(
	data: AddClientFormData,
	deps: AddClientFlowDeps,
): Promise<AddClientSubmitResult> {
	const result = await runAddClientFlow(data, deps);

	return {
		...result,
		handoffUrl: buildClientCreateHandoffUrl(
			result.companyId,
			result.createState,
		),
	};
}
