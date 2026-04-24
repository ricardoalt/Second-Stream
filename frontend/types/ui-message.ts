import type { UIMessage } from "ai";
import type { WorkingMemory } from "@/config/working-memory";

export const DATA_NEW_THREAD_CREATED_PART = "data-new-thread-created" as const;
export const DATA_CONVERSATION_TITLE_PART = "data-conversation-title" as const;

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
				safety_callouts: Array<{
					severity: "stop" | "specialist" | "attention";
					sub_stream: string;
					description: string;
					intervention: string | null;
				}>;
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
			output: {
				attachment_id: string;
				filename: string;
				download_url: string;
				expires_at: string;
				size_bytes: number;
			};
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
