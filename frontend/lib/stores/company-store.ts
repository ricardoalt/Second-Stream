/**
 * Company store - Zustand state management for companies
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
	type ArchivedFilter,
	companiesAPI,
	locationsAPI,
} from "@/lib/api/companies";
import type {
	CompanyContact,
	CompanyCreate,
	CompanyDetail,
	CompanySummary,
	CompanyUpdate,
	LocationCreate,
	LocationSummary,
} from "@/lib/types/company";
import { getErrorMessage, logger } from "@/lib/utils/logger";

interface CompanyState {
	// State
	companies: CompanySummary[];
	currentCompany: CompanyDetail | null;
	loading: boolean;
	error: string | null;
	archivedFilter: ArchivedFilter;
	companiesLoadedScope: ArchivedFilter | null;
	companiesLoadSucceeded: boolean;
	_companiesRequestId: number;

	// Actions
	loadCompanies: (archived?: ArchivedFilter) => Promise<void>;
	loadCompany: (id: string) => Promise<void>;
	createCompany: (data: CompanyCreate) => Promise<CompanyDetail>;
	createCompanyContact: (
		companyId: string,
		data: {
			name?: string;
			email?: string;
			phone?: string;
			title?: string;
			notes?: string;
			isPrimary: true;
		},
	) => Promise<CompanyContact>;
	createLocation: (
		companyId: string,
		data: LocationCreate,
	) => Promise<LocationSummary>;
	updateCompany: (id: string, data: CompanyUpdate) => Promise<CompanyDetail>;
	deleteCompany: (id: string) => Promise<void>;
	archiveCompany: (id: string) => Promise<void>;
	restoreCompany: (id: string) => Promise<void>;
	purgeCompany: (id: string, confirmName: string) => Promise<void>;
	setArchivedFilter: (filter: ArchivedFilter) => void;
	clearError: () => void;
	setLoading: (loading: boolean) => void;
	resetStore: () => void;
}

export const useCompanyStore = create<CompanyState>()(
	persist(
		immer((set, get) => ({
			// Initial state
			companies: [],
			currentCompany: null,
			loading: false,
			error: null,
			archivedFilter: "active",
			companiesLoadedScope: null,
			companiesLoadSucceeded: false,
			_companiesRequestId: 0,

			// Load all companies
			loadCompanies: async (archived?: ArchivedFilter) => {
				const filter = archived ?? get().archivedFilter;
				const requestId = get()._companiesRequestId + 1;
				set((state) => {
					const isScopeChange = state.archivedFilter !== filter;
					state._companiesRequestId = requestId;
					state.loading = true;
					state.error = null;
					state.archivedFilter = filter;
					state.companiesLoadSucceeded = false;
					if (isScopeChange) {
						state.companies = [];
					}
				});

				try {
					const companies = await companiesAPI.list(filter);
					if (get()._companiesRequestId !== requestId) return;
					set((state) => {
						state.companies = companies;
						state.companiesLoadedScope = filter;
						state.companiesLoadSucceeded = true;
						state.loading = false;
					});
				} catch (error) {
					if (get()._companiesRequestId !== requestId) return;
					const message = getErrorMessage(error, "Failed to load companies");
					logger.error("Failed to load companies", error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.companiesLoadSucceeded = false;
						state.loading = false;
					});
					throw error;
				}
			},

			// Load single company with details
			loadCompany: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await companiesAPI.get(id);
					set((state) => {
						state.currentCompany = company;
						state.loading = false;
					});
				} catch (error) {
					const message = getErrorMessage(error, "Failed to load company");
					logger.error(`Failed to load company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Create new company
			createCompany: async (data: CompanyCreate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await companiesAPI.create(data);
					set((state) => {
						state.companies.push(company);
						state.currentCompany = company;
						state.loading = false;
					});
					logger.info(`Company created: ${company.name}`, "CompanyStore");
					return company;
				} catch (error) {
					const message = getErrorMessage(error, "Failed to create company");
					logger.error("Failed to create company", error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Update company
			createCompanyContact: async (companyId, data) => {
				try {
					return await companiesAPI.createContact(companyId, data);
				} catch (error) {
					const message = getErrorMessage(
						error,
						"Failed to create company contact",
					);
					logger.error(
						`Failed to create company contact for ${companyId}`,
						error,
						"CompanyStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			createLocation: async (companyId, data) => {
				try {
					return await locationsAPI.create(companyId, data);
				} catch (error) {
					const message = getErrorMessage(error, "Failed to create location");
					logger.error(
						`Failed to create location for ${companyId}`,
						error,
						"CompanyStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Update company
			updateCompany: async (id: string, data: CompanyUpdate) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					const company = await companiesAPI.update(id, data);
					set((state) => {
						const index = state.companies.findIndex((c) => c.id === id);
						if (index !== -1) {
							state.companies[index] = company;
						}
						if (state.currentCompany?.id === id) {
							state.currentCompany = company;
						}
						state.loading = false;
					});
					logger.info(`Company updated: ${company.name}`, "CompanyStore");
					return company;
				} catch (error) {
					const message = getErrorMessage(error, "Failed to update company");
					logger.error(`Failed to update company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Delete company
			deleteCompany: async (id: string) => {
				set((state) => {
					state.loading = true;
					state.error = null;
				});

				try {
					await companiesAPI.delete(id);
					set((state) => {
						state.companies = state.companies.filter((c) => c.id !== id);
						if (state.currentCompany?.id === id) {
							state.currentCompany = null;
						}
						state.loading = false;
					});
					logger.info(`Company deleted: ${id}`, "CompanyStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to delete company");
					logger.error(`Failed to delete company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
						state.loading = false;
					});
					throw error;
				}
			},

			// Archive company
			archiveCompany: async (id: string) => {
				try {
					await companiesAPI.archiveCompany(id);
					set((state) => {
						state.companies = state.companies.filter((c) => c.id !== id);
						if (state.currentCompany?.id === id) {
							state.currentCompany = {
								...state.currentCompany,
								archivedAt: new Date().toISOString(),
							};
						}
					});
					logger.info(`Company archived: ${id}`, "CompanyStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to archive company");
					logger.error(
						`Failed to archive company ${id}`,
						error,
						"CompanyStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Restore company
			restoreCompany: async (id: string) => {
				try {
					await companiesAPI.restoreCompany(id);
					// Reload company to get updated state
					await get().loadCompany(id);
					logger.info(`Company restored: ${id}`, "CompanyStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to restore company");
					logger.error(
						`Failed to restore company ${id}`,
						error,
						"CompanyStore",
					);
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Purge company permanently
			purgeCompany: async (id: string, confirmName: string) => {
				try {
					await companiesAPI.purgeCompany(id, confirmName);
					set((state) => {
						state.companies = state.companies.filter((c) => c.id !== id);
						if (state.currentCompany?.id === id) {
							state.currentCompany = null;
						}
					});
					logger.info(`Company purged: ${id}`, "CompanyStore");
				} catch (error) {
					const message = getErrorMessage(error, "Failed to purge company");
					logger.error(`Failed to purge company ${id}`, error, "CompanyStore");
					set((state) => {
						state.error = message;
					});
					throw error;
				}
			},

			// Set archived filter and reload
			setArchivedFilter: (filter: ArchivedFilter) => {
				set((state) => {
					state.archivedFilter = filter;
				});
				void get().loadCompanies(filter);
			},

			// Clear error
			clearError: () =>
				set((state) => {
					state.error = null;
				}),

			// Set loading
			setLoading: (loading: boolean) =>
				set((state) => {
					state.loading = loading;
				}),

			resetStore: () => {
				set((state) => {
					state.companies = [];
					state.currentCompany = null;
					state.loading = false;
					state.error = null;
					state.archivedFilter = "active";
					state.companiesLoadedScope = null;
					state.companiesLoadSucceeded = false;
					state._companiesRequestId = 0;
				});
				if (typeof window !== "undefined") {
					localStorage.removeItem("waste-company-store");
				}
			},
		})),
		{
			name: "waste-company-store",
			storage:
				typeof window === "undefined"
					? undefined
					: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				companies: state.companies,
				archivedFilter: state.archivedFilter,
			}),
		},
	),
);
