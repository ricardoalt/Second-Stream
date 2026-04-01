import type { WorkspaceQuestionId } from "@/lib/types/workspace";

export type StreamWorkspacePhase = 1 | 2 | 3 | 4;

export type StreamQuestionInputType =
	| "short_text"
	| "long_text"
	| "single_select"
	| "number"
	| "boolean"
	| "date"
	| "open_question";

export interface StreamQuestionDefinition {
	id: WorkspaceQuestionId;
	number: number;
	phase: StreamWorkspacePhase;
	section: string;
	label: string;
	type: StreamQuestionInputType;
	required: boolean;
}

export interface StreamQuestionPhaseDefinition {
	phase: StreamWorkspacePhase;
	label: string;
	description: string;
	questionIds: WorkspaceQuestionId[];
}

export const STREAM_WORKSPACE_PHASES: StreamQuestionPhaseDefinition[] = [
	{
		phase: 1,
		label: "Stream Snapshot",
		description:
			"Define the material identity, volume, and logistics baseline.",
		questionIds: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"],
	},
	{
		phase: 2,
		label: "Current Handling",
		description:
			"Specify the current economic baseline and disposal environment.",
		questionIds: ["q10", "q11", "q12", "q13", "q14"],
	},
	{
		phase: 3,
		label: "Technical Confidence",
		description:
			"Review composition metrics and certification requirements to ensure regulatory compatibility.",
		questionIds: ["q15", "q16", "q17", "q18", "q19", "q20"],
	},
	{
		phase: 4,
		label: "Project Driver",
		description:
			"Identify hidden value levers and strategic alignment goals for the waste stream.",
		questionIds: [
			"q21",
			"q22",
			"q23",
			"q24",
			"q25",
			"q26",
			"q27",
			"q28",
			"q29",
			"q30",
			"q31",
		],
	},
];

export const STREAM_WORKSPACE_QUESTIONS: StreamQuestionDefinition[] = [
	{
		id: "q1",
		number: 1,
		phase: 1,
		section: "Stream Snapshot",
		label: "Secondary stream name",
		type: "short_text",
		required: true,
	},
	{
		id: "q2",
		number: 2,
		phase: 1,
		section: "Stream Snapshot",
		label: "What process generates this stream?",
		type: "short_text",
		required: true,
	},
	{
		id: "q3",
		number: 3,
		phase: 1,
		section: "Stream Snapshot",
		label: "Is this stream recurring or one-time?",
		type: "single_select",
		required: true,
	},
	{
		id: "q4",
		number: 4,
		phase: 1,
		section: "Stream Snapshot",
		label: "How much is generated?",
		type: "number",
		required: true,
	},
	{
		id: "q5",
		number: 5,
		phase: 1,
		section: "Stream Snapshot",
		label: "Unit of measure",
		type: "single_select",
		required: true,
	},
	{
		id: "q6",
		number: 6,
		phase: 1,
		section: "Stream Snapshot",
		label: "How often is it generated?",
		type: "single_select",
		required: true,
	},
	{
		id: "q7",
		number: 7,
		phase: 1,
		section: "Stream Snapshot",
		label: "Facility location (Pre-filled)",
		type: "short_text",
		required: true,
	},
	{
		id: "q8",
		number: 8,
		phase: 1,
		section: "Stream Snapshot",
		label: "How is it currently packaged or stored?",
		type: "single_select",
		required: true,
	},
	{
		id: "q9",
		number: 9,
		phase: 1,
		section: "Stream Snapshot",
		label: "Desired timeline for first pickup or solution",
		type: "single_select",
		required: true,
	},
	{
		id: "q10",
		number: 10,
		phase: 2,
		section: "Current Handling",
		label: "What is currently happening to this stream?",
		type: "single_select",
		required: true,
	},
	{
		id: "q11",
		number: 11,
		phase: 2,
		section: "Current Handling",
		label: "Current service provider / vendor",
		type: "short_text",
		required: true,
	},
	{
		id: "q12",
		number: 12,
		phase: 2,
		section: "Current Handling",
		label: "Current total management cost",
		type: "number",
		required: true,
	},
	{
		id: "q13",
		number: 13,
		phase: 2,
		section: "Current Handling",
		label: "Cost unit",
		type: "single_select",
		required: true,
	},
	{
		id: "q14",
		number: 14,
		phase: 2,
		section: "Current Handling",
		label: "Is the stream already sold or reused in a low-value outlet?",
		type: "boolean",
		required: true,
	},
	{
		id: "q15",
		number: 15,
		phase: 3,
		section: "Technical Confidence",
		label: "Regulatory status",
		type: "single_select",
		required: true,
	},
	{
		id: "q16",
		number: 16,
		phase: 3,
		section: "Technical Confidence",
		label: "Is the composition generally consistent from load to load?",
		type: "single_select",
		required: true,
	},
	{
		id: "q17",
		number: 17,
		phase: 3,
		section: "Technical Confidence",
		label: "Top 3 components, if known",
		type: "long_text",
		required: true,
	},
	{
		id: "q18",
		number: 18,
		phase: 3,
		section: "Technical Confidence",
		label: "Known contaminants or impurities",
		type: "long_text",
		required: true,
	},
	{
		id: "q19",
		number: 19,
		phase: 3,
		section: "Technical Confidence",
		label: "Has this stream ever been rejected for reuse or recycling?",
		type: "boolean",
		required: true,
	},
	{
		id: "q20",
		number: 20,
		phase: 3,
		section: "Technical Confidence",
		label: "If yes, what caused rejection?",
		type: "long_text",
		required: true,
	},
	{
		id: "q21",
		number: 21,
		phase: 4,
		section: "Project Driver",
		label: "Biggest pain point this stream creates",
		type: "long_text",
		required: true,
	},
	{
		id: "q22",
		number: 22,
		phase: 4,
		section: "Project Driver",
		label: "Primary goal for this project",
		type: "single_select",
		required: true,
	},
	{
		id: "q23",
		number: 23,
		phase: 4,
		section: "Project Driver",
		label: "Why now?",
		type: "long_text",
		required: true,
	},
	{
		id: "q24",
		number: 24,
		phase: 4,
		section: "Project Driver",
		label: "Is the customer open to alternatives beyond disposal?",
		type: "boolean",
		required: true,
	},
	{
		id: "q25",
		number: 25,
		phase: 4,
		section: "Project Driver",
		label: "Internal initiative tied to this project",
		type: "single_select",
		required: true,
	},
	{
		id: "q26",
		number: 26,
		phase: 4,
		section: "Later-stage commercial fields",
		label: "Contract expiry with current vendor",
		type: "date",
		required: true,
	},
	{
		id: "q27",
		number: 27,
		phase: 4,
		section: "Later-stage commercial fields",
		label: "Decision-maker role",
		type: "single_select",
		required: true,
	},
	{
		id: "q28",
		number: 28,
		phase: 4,
		section: "Later-stage commercial fields",
		label: "Most important buying criterion",
		type: "single_select",
		required: true,
	},
	{
		id: "q29",
		number: 29,
		phase: 4,
		section: "Later-stage commercial fields",
		label: "Are similar streams generated at other sites?",
		type: "boolean",
		required: true,
	},
	{
		id: "q30",
		number: 30,
		phase: 4,
		section: "Later-stage commercial fields",
		label: "Are other secondary streams also in scope?",
		type: "boolean",
		required: true,
	},
	{
		id: "q31",
		number: 31,
		phase: 4,
		section: "Later-stage commercial fields",
		label:
			"Manufacturing process / Additional insights on answer to question 2",
		type: "open_question",
		required: true,
	},
];

export const STREAM_WORKSPACE_QUESTIONS_BY_PHASE: Record<
	StreamWorkspacePhase,
	StreamQuestionDefinition[]
> = {
	1: STREAM_WORKSPACE_QUESTIONS.filter((question) => question.phase === 1),
	2: STREAM_WORKSPACE_QUESTIONS.filter((question) => question.phase === 2),
	3: STREAM_WORKSPACE_QUESTIONS.filter((question) => question.phase === 3),
	4: STREAM_WORKSPACE_QUESTIONS.filter((question) => question.phase === 4),
};
