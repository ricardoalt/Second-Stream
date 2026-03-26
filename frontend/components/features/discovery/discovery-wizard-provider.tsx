"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { DiscoveryWizard } from "@/components/features/discovery-wizard/discovery-wizard";
import { useCompanyStore } from "@/lib/stores/company-store";

type DiscoveryWizardContextValue = {
	isOpen: boolean;
	open: () => void;
	openWithText: (text: string) => void;
	close: () => void;
};

const DiscoveryWizardContext =
	createContext<DiscoveryWizardContextValue | null>(null);

export function DiscoveryWizardProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [defaultText, setDefaultText] = useState<string | undefined>(undefined);
	const companyId = useCompanyStore((state) => state.currentCompany?.id);

	const open = useCallback(() => {
		setDefaultText(undefined);
		setIsOpen(true);
	}, []);

	const openWithText = useCallback((text: string) => {
		setDefaultText(text);
		setIsOpen(true);
	}, []);

	const close = useCallback(() => {
		setIsOpen(false);
		setDefaultText(undefined);
	}, []);

	const handleWizardOpenChange = useCallback((openState: boolean) => {
		setIsOpen(openState);
		if (!openState) {
			setDefaultText(undefined);
		}
	}, []);

	const value = useMemo(
		() => ({ isOpen, open, openWithText, close }),
		[isOpen, open, openWithText, close],
	);

	return (
		<DiscoveryWizardContext.Provider value={value}>
			{children}
			<DiscoveryWizard
				open={isOpen}
				onOpenChange={handleWizardOpenChange}
				{...(defaultText !== undefined ? { defaultText } : {})}
				{...(companyId ? { defaultCompanyId: companyId } : {})}
			/>
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
