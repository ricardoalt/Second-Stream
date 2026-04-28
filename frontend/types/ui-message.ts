import type { UIMessage } from "ai";
import type { WorkingMemory } from "@/config/working-memory";

export const DATA_NEW_THREAD_CREATED_PART = "data-new-thread-created" as const;
export const DATA_CONVERSATION_TITLE_PART = "data-conversation-title" as const;

type PdfOutput = {
	attachment_id: string;
	filename: string;
	download_url: string;
	view_url: string;
	expires_at: string;
	size_bytes: number;
};

type SafetyCallout = {
	severity: "stop" | "specialist" | "attention";
	sub_stream: string;
	description: string;
	intervention: string | null;
};

export type MyUIMessage = UIMessage<
	unknown,
	{
		"conversation-title": {
			threadId: string;
			title: string;
		};
		"new-thread-created": {
			threadId: string;
			title: string | null;
			createdAt: string;
			updatedAt: string;
		};
	},
	{
		webSearch: {
			input: { query: string };
			output: Array<{
				title: string | null;
				url: string;
				content: string;
				publishedDate?: string;
			}>;
		};
		updateWorkingMemory: {
			input: { memory: WorkingMemory };
			output: { success: boolean };
		};
		generateDiscoveryReport: {
			input: {
				customer: string;
				stream: string;
				snapshot: string;
				gate_status: "OPEN" | "OPEN_CONDITIONAL" | "CLOSED";
				gate_blocker: string | null;
				safety_callouts: SafetyCallout[];
				sections: Array<{
					title: string;
					lead: string;
					body: string;
					close: string | null;
				}>;
				killer_question: { question: string; why_it_matters: string };
				follow_up_questions: Array<{
					question: string;
					why_it_matters: string;
				}>;
				strategic_insight: string;
			};
			output: PdfOutput;
		};
		generateIdeationBrief: {
			input: {
				customer: string;
				stream: string;
				date: string;
				gate_status: "OPEN" | "OPEN_CONDITIONAL" | "CLOSED";
				gate_blocker: string | null;
				sections: Array<{
					title: string;
					lead: string;
					body: string;
					emphasis: "insight" | "caution" | "gap" | null;
					close: string | null;
				}>;
				strategic_insight: string;
				markers_used: Array<"insight" | "caution" | "gap">;
			};
			output: PdfOutput;
		};
		generateAnalyticalRead: {
			input: {
				customer: string;
				stream: string;
				date: string;
				executive_summary: string;
				safety_callouts: SafetyCallout[];
				tables: Array<{
					title: string;
					headers: string[];
					rows: string[][];
				}>;
				strategic_insight: string;
			};
			output: PdfOutput;
		};
		generatePlaybook: {
			input: {
				customer: string;
				stream: string;
				date: string;
				opening_context: string;
				themes: Array<{
					number: number;
					title: string;
					body: string;
					probe_questions: string[];
					why_it_matters: string[];
				}>;
			};
			output: PdfOutput;
		};
	}
>;

export type NewThreadCreatedDataPart = {
	type: typeof DATA_NEW_THREAD_CREATED_PART;
	data: {
		threadId: string;
		title: string | null;
		createdAt: string;
		updatedAt: string;
	};
};

export type ConversationTitleDataPart = {
	type: typeof DATA_CONVERSATION_TITLE_PART;
	data: {
		threadId: string;
		title: string;
	};
};
