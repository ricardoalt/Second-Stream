import { describe, expect, it } from "bun:test";
import { canSubmitPromptMessage, shouldShowLoadingShimmer } from "./chat-utils";

describe("chat-utils", () => {
	it("permite enviar cuando hay texto", () => {
		expect(canSubmitPromptMessage({ text: "Hola", files: [] })).toBe(true);
	});

	it("bloquea envío con solo espacios", () => {
		expect(canSubmitPromptMessage({ text: "   ", files: [] })).toBe(false);
	});

	it("bloquea attachment-only para respetar contrato backend", () => {
		expect(
			canSubmitPromptMessage({
				text: "",
				files: [
					{
						type: "file",
						mediaType: "application/pdf",
						url: "data:application/pdf;base64,AA==",
						filename: "test.pdf",
					},
				],
			}),
		).toBe(false);
	});

	it("muestra shimmer cuando status es submitted", () => {
		expect(shouldShowLoadingShimmer("submitted", [])).toBe(true);
	});

	it("oculta shimmer cuando assistant ya tiene texto", () => {
		expect(
			shouldShowLoadingShimmer("streaming", [
				{
					id: "1",
					role: "assistant",
					parts: [{ type: "text", text: "respuesta" }],
				},
			]),
		).toBe(false);
	});

	it("oculta shimmer cuando assistant ya muestra actividad de tool visible", () => {
		expect(
			shouldShowLoadingShimmer("streaming", [
				{
					id: "1",
					role: "assistant",
					parts: [
						{
							type: "tool-generateIdeationBrief",
							state: "input-available",
							input: undefined,
						},
					],
				},
			]),
		).toBe(false);
	});

	it("mantiene shimmer cuando solo hay carga de skills interna sin texto visible", () => {
		expect(
			shouldShowLoadingShimmer("streaming", [
				{
					id: "1",
					role: "assistant",
					parts: [
						{
							type: "tool-loadSkill",
							state: "input-available",
							toolCallId: "call-skill",
							toolName: "loadSkill",
							input: { name: "discovery-reporting" },
						},
					],
				},
			]),
		).toBe(true);
	});

	it("oculta shimmer cuando carga de skills interna ya tiene texto visible", () => {
		expect(
			shouldShowLoadingShimmer("streaming", [
				{
					id: "1",
					role: "assistant",
					parts: [
						{ type: "text", text: "Aquí está tu respuesta." },
						{
							type: "tool-loadSkill",
							state: "output-available",
							toolCallId: "call-skill",
							toolName: "loadSkill",
							output: { skill_name: "discovery-reporting", status: "loaded" },
						},
					],
				},
			]),
		).toBe(false);
	});
});
