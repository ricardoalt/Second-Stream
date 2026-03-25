"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { DiscoveryWizardModal } from "@/components/features/discovery/discovery-wizard-modal";

type DiscoveryWizardContextValue = {
	isOpen: boolean;
	open: () => void;
	close: () => void;
};

const DiscoveryWizardContext =
	createContext<DiscoveryWizardContextValue | null>(null);

export function DiscoveryWizardProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback(() => {
		setIsOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
	}, []);

	const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

	return (
		<DiscoveryWizardContext.Provider value={value}>
			{children}
			<DiscoveryWizardModal open={isOpen} onOpenChange={setIsOpen} />
		</DiscoveryWizardContext.Provider>
	);
}

export function useDiscoveryWizard(): DiscoveryWizardContextValue {
	const context = useContext(DiscoveryWizardContext);

	if (!context) {
		throw new Error(
			"useDiscoveryWizard must be used inside DiscoveryWizardProvider",
		);
	}

	return context;
}
