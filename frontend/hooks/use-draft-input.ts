import { useCallback, useRef, useSyncExternalStore } from "react";
import { DEFAULT_MODEL_ID, MODEL_ID_SET } from "@/config/models";

const STORAGE_KEY = "draft-composer";

export function buildDraftStorageKey(scopeKey: string): string {
	return `${STORAGE_KEY}:${scopeKey}`;
}

type DraftState = {
	text: string;
	modelId: string;
	webSearchEnabled: boolean;
};

const DEFAULT_DRAFT: DraftState = {
	text: "",
	modelId: DEFAULT_MODEL_ID,
	webSearchEnabled: false,
};

// --- Helpers ---

function readDraft(storageKey: string): DraftState {
	try {
		const raw = localStorage.getItem(storageKey);
		if (raw) {
			const parsed = JSON.parse(raw) as DraftState;
			return {
				text:
					typeof parsed.text === "string" ? parsed.text : DEFAULT_DRAFT.text,
				modelId: MODEL_ID_SET.has(parsed.modelId)
					? parsed.modelId
					: DEFAULT_DRAFT.modelId,
				webSearchEnabled:
					typeof parsed.webSearchEnabled === "boolean"
						? parsed.webSearchEnabled
						: DEFAULT_DRAFT.webSearchEnabled,
			};
		}
	} catch {
		// corrupted data, fall through
	}
	return DEFAULT_DRAFT;
}

function persistDraft(storageKey: string, partial: Partial<DraftState>) {
	const current = readDraft(storageKey);
	const next = { ...current, ...partial };
	localStorage.setItem(storageKey, JSON.stringify(next));
	return next;
}

// --- External store for settings (modelId, webSearchEnabled) ---
// Text is intentionally excluded from the reactive store to avoid
// re-render loops (text is written on every keystroke).

type SettingsState = {
	modelId: string;
	webSearchEnabled: boolean;
};

let settingsListeners: Array<() => void> = [];
let settingsCache: SettingsState | null = null;

function emitSettingsChange() {
	settingsCache = null; // bust cache
	for (const listener of settingsListeners) {
		listener();
	}
}

function subscribeSettings(listener: () => void) {
	settingsListeners = [...settingsListeners, listener];
	return () => {
		settingsListeners = settingsListeners.filter((l) => l !== listener);
	};
}

function getSettingsSnapshotForKey(storageKey: string): SettingsState {
	if (settingsCache) {
		return settingsCache;
	}

	const draft = readDraft(storageKey);
	settingsCache = {
		modelId: draft.modelId,
		webSearchEnabled: draft.webSearchEnabled,
	};
	return settingsCache;
}

const SERVER_SETTINGS_SNAPSHOT: SettingsState = {
	modelId: DEFAULT_DRAFT.modelId,
	webSearchEnabled: DEFAULT_DRAFT.webSearchEnabled,
};

function getSettingsServerSnapshot(): SettingsState {
	return SERVER_SETTINGS_SNAPSHOT;
}

// --- Debounced text writer ---

let textDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Write text to localStorage with debounce. Does NOT trigger any React
 * re-renders — the text value is "fire and forget" into storage.
 */
function debouncedSetText(storageKey: string, text: string, delayMs = 300) {
	if (textDebounceTimer) {
		clearTimeout(textDebounceTimer);
	}
	textDebounceTimer = setTimeout(() => {
		persistDraft(storageKey, { text });
		textDebounceTimer = null;
	}, delayMs);
}

/** Flush any pending debounced text write immediately. */
function flushText() {
	if (textDebounceTimer) {
		clearTimeout(textDebounceTimer);
		textDebounceTimer = null;
	}
}

// --- Hook ---

export function useDraftInput(scopeKey: string) {
	const storageKey = buildDraftStorageKey(scopeKey);
	const settings = useSyncExternalStore(
		subscribeSettings,
		() => getSettingsSnapshotForKey(storageKey),
		getSettingsServerSnapshot,
	);

	// Read initial text once on first render (not reactive).
	const initialTextRef = useRef<string | null>(null);
	if (initialTextRef.current === null) {
		initialTextRef.current = readDraft(storageKey).text;
	}

	const setText = useCallback(
		(text: string) => {
			debouncedSetText(storageKey, text);
		},
		[storageKey],
	);

	const setModelId = useCallback(
		(modelId: string) => {
			persistDraft(storageKey, { modelId });
			emitSettingsChange();
		},
		[storageKey],
	);

	const setWebSearchEnabled = useCallback(
		(webSearchEnabled: boolean) => {
			persistDraft(storageKey, { webSearchEnabled });
			emitSettingsChange();
		},
		[storageKey],
	);

	const clear = useCallback(() => {
		flushText();
		persistDraft(storageKey, { text: "" });
		// No emitSettingsChange — text is not part of the reactive store.
	}, [storageKey]);

	return {
		/** Initial text value — read once, not reactive. Use as initialInput. */
		initialText: initialTextRef.current,
		modelId: settings.modelId,
		webSearchEnabled: settings.webSearchEnabled,
		setText,
		setModelId,
		setWebSearchEnabled,
		clear,
	};
}
