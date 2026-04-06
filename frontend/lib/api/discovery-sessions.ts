import type {
	DiscoverySessionCreateResponse,
	DiscoverySessionResult,
	DiscoverySource,
} from "@/lib/types/discovery";
import { apiClient } from "./client";

const BASE = "/discovery-sessions";

export const discoverySessionsAPI = {
	async create(
		companyId: string,
		assignedOwnerUserId?: string,
	): Promise<DiscoverySessionCreateResponse> {
		return apiClient.post<DiscoverySessionCreateResponse>(BASE, {
			companyId,
			...(assignedOwnerUserId ? { assignedOwnerUserId } : {}),
		});
	},

	async uploadFile(sessionId: string, file: File): Promise<DiscoverySource> {
		return apiClient.uploadFile<DiscoverySource>(
			`${BASE}/${sessionId}/files`,
			file,
		);
	},

	async uploadAudio(
		sessionId: string,
		audioFile: File,
	): Promise<DiscoverySource> {
		const formData = new FormData();
		formData.append("audio_file", audioFile);
		return apiClient.request<DiscoverySource>(`${BASE}/${sessionId}/audio`, {
			method: "POST",
			body: formData,
		});
	},

	async addText(sessionId: string, text: string): Promise<DiscoverySource> {
		return apiClient.post<DiscoverySource>(`${BASE}/${sessionId}/text`, {
			text,
		});
	},

	async start(sessionId: string): Promise<DiscoverySessionResult> {
		return apiClient.post<DiscoverySessionResult>(`${BASE}/${sessionId}/start`);
	},

	async getSession(sessionId: string): Promise<DiscoverySessionResult> {
		return apiClient.get<DiscoverySessionResult>(`${BASE}/${sessionId}`);
	},
};
