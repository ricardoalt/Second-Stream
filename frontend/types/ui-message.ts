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
