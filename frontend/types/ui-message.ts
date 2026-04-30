import type { UIMessage } from "ai";
import type { WorkingMemory } from "@/config/working-memory";

export const DATA_NEW_THREAD_CREATED_PART = "data-new-thread-created" as const;
export const DATA_CONVERSATION_TITLE_PART = "data-conversation-title" as const;
export const DATA_AGENT_STATUS_PART = "data-agent-status" as const;

export type PdfOutput = {
	attachment_id: string;
	filename: string;
	download_url: string | null;
	view_url: string | null;
	expires_at: string | null;
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
		"pdf-artifact": {
			artifactType:
				| "generateIdeationBrief"
				| "generateAnalyticalRead"
				| "generatePlaybook";
			output: PdfOutput;
		};
		"agent-status": {
			phase: "preparing-analysis" | "idle";
			label: string;
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
		loadSkill: {
			input: { name: string };
			output: { skill_name: string; status: "loaded" };
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

export type AgentStatusDataPart = {
	type: typeof DATA_AGENT_STATUS_PART;
	data: {
		phase: "preparing-analysis" | "idle";
		label: string;
	};
};
