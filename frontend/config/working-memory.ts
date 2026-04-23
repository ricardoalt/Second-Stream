/**
 * Working memory type for the chat agent's memory-update tool.
 *
 * Represents the structured memory that the agent maintains about the user,
 * organization, and conversation context. Used by WorkingMemoryUpdate
 * component to render tool-invocation parts from the stream.
 */
export interface WorkingMemory {
	summary: string;
	keyFacts: string[];
	preferences: string[];
}
