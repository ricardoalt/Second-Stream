// Internal field names remain "sector/subsector" for API compatibility
// UI labels show "Industry/Sub-Industry" to users

export type Sector =
	| "manufacturing_industrial"
	| "automotive_transportation"
	| "chemicals_pharmaceuticals"
	| "oil_gas_energy"
	| "mining_metals_materials"
	| "construction_infrastructure"
	| "packaging_paper_printing"
	| "food_beverage"
	| "agriculture_forestry"
	| "retail_wholesale_distribution"
	| "healthcare_medical"
	| "electronics_it_ewaste"
	| "utilities_public_services"
	| "hospitality_commercial_services"
	| "education_institutions"
	| "logistics_transportation_services"
	| "environmental_waste_services"
	| "consumer_goods_fmcg"
	| "financial_commercial_offices"
	| "specialty_high_risk";

export type KnownSubsector =
	// Manufacturing & Industrial
	| "automotive_manufacturing"
	| "aerospace_manufacturing"
	| "electronics_manufacturing"
	| "appliance_manufacturing"
	| "machinery_equipment_manufacturing"
	| "metal_fabrication"
	| "plastics_manufacturing"
	| "rubber_manufacturing"
	| "textile_manufacturing"
	| "furniture_manufacturing"
	// Automotive & Transportation
	| "automotive_oems"
	| "auto_parts_manufacturers"
	| "vehicle_assembly_plants"
	| "repair_maintenance_shops"
	| "fleet_operators"
	| "tire_manufacturers"
	| "rail_transportation"
	| "shipbuilding_repair"
	| "aviation_mro"
	// Chemicals & Pharmaceuticals
	| "chemical_manufacturing"
	| "specialty_chemicals"
	| "petrochemicals"
	| "pharmaceutical_manufacturing"
	| "biotech_manufacturing"
	| "paints_coatings"
	| "adhesives_sealants"
	| "fertilizer_production"
	| "industrial_gases"
	// Oil, Gas & Energy
	| "oil_exploration_production"
	| "oil_refining"
	| "natural_gas_processing"
	| "fuel_distribution"
	| "lubricant_manufacturing"
	| "power_generation"
	| "renewable_energy"
	| "battery_manufacturing"
	| "energy_storage_systems"
	// Mining, Metals & Materials
	| "mining_operations"
	| "mineral_processing"
	| "steel_mills"
	| "aluminum_smelters"
	| "foundries"
	| "metal_recycling_facilities"
	| "precious_metals_refining"
	| "cement_manufacturing"
	| "glass_manufacturing"
	// Construction & Infrastructure
	| "construction_companies"
	| "demolition_contractors"
	| "infrastructure_projects"
	| "civil_engineering"
	| "road_bridge_construction"
	| "concrete_production"
	| "asphalt_production"
	| "building_materials_suppliers"
	// Packaging, Paper & Printing
	| "packaging_manufacturers"
	| "corrugated_cardboard_plants"
	| "paper_mills"
	| "printing_companies"
	| "label_manufacturing"
	| "pulp_processing"
	| "flexible_packaging"
	// Food & Beverage
	| "food_processing"
	| "beverage_bottling"
	| "breweries_distilleries"
	| "dairy_processing"
	| "meat_poultry_processing"
	| "bakeries"
	| "cold_storage"
	| "agricultural_processing"
	// Agriculture & Forestry
	| "farms_agribusiness"
	| "crop_processing"
	| "animal_feed_production"
	| "forestry_operations"
	| "sawmills"
	| "wood_processing"
	| "pulp_timber_production"
	// Retail, Wholesale & Distribution
	| "retail_chains"
	| "warehouses_distribution"
	| "ecommerce_fulfillment"
	| "wholesale_distributors"
	| "cold_chain_logistics"
	// Healthcare & Medical
	| "hospitals"
	| "clinics"
	| "medical_laboratories"
	| "medical_device_manufacturing"
	| "pharmaceutical_distribution"
	| "veterinary_facilities"
	| "research_institutions"
	// Electronics, IT & E-Waste
	| "electronics_manufacturers"
	| "semiconductor_fabrication"
	| "data_centers"
	| "it_service_providers"
	| "telecom_operators"
	| "consumer_electronics_recyclers"
	| "battery_recyclers"
	// Utilities & Public Services
	| "water_treatment"
	| "wastewater_treatment"
	| "municipal_services"
	| "public_works"
	| "utilities_maintenance"
	// Hospitality & Commercial Services
	| "hotels_resorts"
	| "restaurants_food_service"
	| "catering_services"
	| "event_venues"
	| "commercial_kitchens"
	// Education & Institutions
	| "universities_colleges"
	| "schools"
	| "research_centers"
	| "government_facilities"
	| "military_installations"
	// Logistics & Transportation Services
	| "logistics_companies"
	| "freight_forwarders"
	| "shipping_companies"
	| "ports_terminals"
	| "airports"
	| "courier_services"
	// Environmental & Waste Services
	| "waste_collection"
	| "recycling_facilities"
	| "hazardous_waste_handlers"
	| "composting_operations"
	| "landfill_operators"
	| "environmental_remediation"
	// Consumer Goods & FMCG
	| "consumer_packaged_goods"
	| "cosmetics_manufacturing"
	| "household_products"
	| "personal_care_products"
	// Financial & Commercial Offices
	| "corporate_offices"
	| "banks_financial_institutions"
	| "call_centers"
	| "shared_service_centers"
	// Specialty & High-Risk
	| "explosives_manufacturing"
	| "defense_contractors"
	| "nuclear_facilities"
	| "semiconductor_chemical_processing"
	// General fallback
	| "other";

export type CustomSubsector = string;

export type Subsector = KnownSubsector | CustomSubsector;

export interface SectorConfig {
	id: Sector;
	label: string;
	subsectors: {
		id: KnownSubsector;
		label: string;
	}[];
	description?: string;
	icon?: string;
}

export const sectorsConfig: SectorConfig[] = [
	{
		id: "manufacturing_industrial",
		label: "Manufacturing & Industrial",
		description:
			"Factories and plants producing goods across various manufacturing sectors",
		subsectors: [
			{ id: "automotive_manufacturing", label: "Automotive Manufacturing" },
			{ id: "aerospace_manufacturing", label: "Aerospace Manufacturing" },
			{ id: "electronics_manufacturing", label: "Electronics Manufacturing" },
			{ id: "appliance_manufacturing", label: "Appliance Manufacturing" },
			{
				id: "machinery_equipment_manufacturing",
				label: "Machinery & Equipment Manufacturing",
			},
			{ id: "metal_fabrication", label: "Metal Fabrication" },
			{ id: "plastics_manufacturing", label: "Plastics Manufacturing" },
			{ id: "rubber_manufacturing", label: "Rubber Manufacturing" },
			{ id: "textile_manufacturing", label: "Textile Manufacturing" },
			{ id: "furniture_manufacturing", label: "Furniture Manufacturing" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "automotive_transportation",
		label: "Automotive & Transportation",
		description:
			"Vehicle manufacturers, parts suppliers, and transportation equipment",
		subsectors: [
			{ id: "automotive_oems", label: "Automotive OEMs" },
			{ id: "auto_parts_manufacturers", label: "Auto Parts Manufacturers" },
			{ id: "vehicle_assembly_plants", label: "Vehicle Assembly Plants" },
			{ id: "repair_maintenance_shops", label: "Repair & Maintenance Shops" },
			{ id: "fleet_operators", label: "Fleet Operators" },
			{ id: "tire_manufacturers", label: "Tire Manufacturers" },
			{ id: "rail_transportation", label: "Rail Transportation Companies" },
			{ id: "shipbuilding_repair", label: "Shipbuilding & Ship Repair" },
			{ id: "aviation_mro", label: "Aviation Maintenance (MRO)" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "chemicals_pharmaceuticals",
		label: "Chemicals & Pharmaceuticals",
		description:
			"Chemical production, pharmaceutical manufacturing, and related industries",
		subsectors: [
			{ id: "chemical_manufacturing", label: "Chemical Manufacturing" },
			{ id: "specialty_chemicals", label: "Specialty Chemicals" },
			{ id: "petrochemicals", label: "Petrochemicals" },
			{
				id: "pharmaceutical_manufacturing",
				label: "Pharmaceutical Manufacturing",
			},
			{ id: "biotech_manufacturing", label: "Biotech Manufacturing" },
			{ id: "paints_coatings", label: "Paints & Coatings" },
			{ id: "adhesives_sealants", label: "Adhesives & Sealants" },
			{ id: "fertilizer_production", label: "Fertilizer Production" },
			{ id: "industrial_gases", label: "Industrial Gases" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "oil_gas_energy",
		label: "Oil, Gas & Energy",
		description:
			"Energy exploration, production, refining, and power generation",
		subsectors: [
			{
				id: "oil_exploration_production",
				label: "Oil Exploration & Production",
			},
			{ id: "oil_refining", label: "Oil Refining" },
			{ id: "natural_gas_processing", label: "Natural Gas Processing" },
			{ id: "fuel_distribution", label: "Fuel Distribution" },
			{ id: "lubricant_manufacturing", label: "Lubricant Manufacturing" },
			{ id: "power_generation", label: "Power Generation (Thermal, Gas)" },
			{ id: "renewable_energy", label: "Renewable Energy (Solar, Wind)" },
			{ id: "battery_manufacturing", label: "Battery Manufacturing" },
			{ id: "energy_storage_systems", label: "Energy Storage Systems" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "mining_metals_materials",
		label: "Mining, Metals & Materials",
		description:
			"Mining operations, metal processing, and materials manufacturing",
		subsectors: [
			{ id: "mining_operations", label: "Mining Operations" },
			{ id: "mineral_processing", label: "Mineral Processing" },
			{ id: "steel_mills", label: "Steel Mills" },
			{ id: "aluminum_smelters", label: "Aluminum Smelters" },
			{ id: "foundries", label: "Foundries" },
			{ id: "metal_recycling_facilities", label: "Metal Recycling Facilities" },
			{ id: "precious_metals_refining", label: "Precious Metals Refining" },
			{ id: "cement_manufacturing", label: "Cement Manufacturing" },
			{ id: "glass_manufacturing", label: "Glass Manufacturing" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "construction_infrastructure",
		label: "Construction & Infrastructure",
		description:
			"Building construction, demolition, and infrastructure development",
		subsectors: [
			{ id: "construction_companies", label: "Construction Companies" },
			{ id: "demolition_contractors", label: "Demolition Contractors" },
			{ id: "infrastructure_projects", label: "Infrastructure Projects" },
			{ id: "civil_engineering", label: "Civil Engineering Firms" },
			{ id: "road_bridge_construction", label: "Road & Bridge Construction" },
			{ id: "concrete_production", label: "Concrete Production" },
			{ id: "asphalt_production", label: "Asphalt Production" },
			{
				id: "building_materials_suppliers",
				label: "Building Materials Suppliers",
			},
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "packaging_paper_printing",
		label: "Packaging, Paper & Printing",
		description: "Packaging production, paper mills, and printing operations",
		subsectors: [
			{ id: "packaging_manufacturers", label: "Packaging Manufacturers" },
			{
				id: "corrugated_cardboard_plants",
				label: "Corrugated Cardboard Plants",
			},
			{ id: "paper_mills", label: "Paper Mills" },
			{ id: "printing_companies", label: "Printing Companies" },
			{ id: "label_manufacturing", label: "Label Manufacturing" },
			{ id: "pulp_processing", label: "Pulp Processing" },
			{ id: "flexible_packaging", label: "Flexible Packaging Manufacturers" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "food_beverage",
		label: "Food & Beverage",
		description: "Food processing, beverage production, and related facilities",
		subsectors: [
			{ id: "food_processing", label: "Food Processing Plants" },
			{ id: "beverage_bottling", label: "Beverage Bottling" },
			{ id: "breweries_distilleries", label: "Breweries & Distilleries" },
			{ id: "dairy_processing", label: "Dairy Processing" },
			{ id: "meat_poultry_processing", label: "Meat & Poultry Processing" },
			{ id: "bakeries", label: "Bakeries" },
			{ id: "cold_storage", label: "Cold Storage Facilities" },
			{ id: "agricultural_processing", label: "Agricultural Processing" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "agriculture_forestry",
		label: "Agriculture & Forestry",
		description: "Farms, agribusiness, forestry, and wood processing",
		subsectors: [
			{ id: "farms_agribusiness", label: "Farms & Agribusiness" },
			{ id: "crop_processing", label: "Crop Processing" },
			{ id: "animal_feed_production", label: "Animal Feed Production" },
			{ id: "forestry_operations", label: "Forestry Operations" },
			{ id: "sawmills", label: "Sawmills" },
			{ id: "wood_processing", label: "Wood Processing Plants" },
			{ id: "pulp_timber_production", label: "Pulp & Timber Production" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "retail_wholesale_distribution",
		label: "Retail, Wholesale & Distribution",
		description: "Retail operations, warehousing, and distribution centers",
		subsectors: [
			{ id: "retail_chains", label: "Retail Chains" },
			{
				id: "warehouses_distribution",
				label: "Warehouses & Distribution Centers",
			},
			{ id: "ecommerce_fulfillment", label: "E-commerce Fulfillment Centers" },
			{ id: "wholesale_distributors", label: "Wholesale Distributors" },
			{ id: "cold_chain_logistics", label: "Cold Chain Logistics" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "healthcare_medical",
		label: "Healthcare & Medical",
		description: "Healthcare facilities, medical manufacturing, and research",
		subsectors: [
			{ id: "hospitals", label: "Hospitals" },
			{ id: "clinics", label: "Clinics" },
			{ id: "medical_laboratories", label: "Medical Laboratories" },
			{
				id: "medical_device_manufacturing",
				label: "Medical Device Manufacturing",
			},
			{
				id: "pharmaceutical_distribution",
				label: "Pharmaceutical Distribution",
			},
			{ id: "veterinary_facilities", label: "Veterinary Facilities" },
			{ id: "research_institutions", label: "Research Institutions" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "electronics_it_ewaste",
		label: "Electronics, IT & E-Waste",
		description:
			"Electronics manufacturing, IT services, and e-waste recycling",
		subsectors: [
			{ id: "electronics_manufacturers", label: "Electronics Manufacturers" },
			{ id: "semiconductor_fabrication", label: "Semiconductor Fabrication" },
			{ id: "data_centers", label: "Data Centers" },
			{ id: "it_service_providers", label: "IT Service Providers" },
			{ id: "telecom_operators", label: "Telecom Operators" },
			{
				id: "consumer_electronics_recyclers",
				label: "Consumer Electronics Recyclers",
			},
			{ id: "battery_recyclers", label: "Battery Recyclers" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "utilities_public_services",
		label: "Utilities & Public Services",
		description: "Water treatment, utilities, and municipal services",
		subsectors: [
			{ id: "water_treatment", label: "Water Treatment Plants" },
			{ id: "wastewater_treatment", label: "Wastewater Treatment Plants" },
			{ id: "municipal_services", label: "Municipal Services" },
			{ id: "public_works", label: "Public Works Departments" },
			{
				id: "utilities_maintenance",
				label: "Utilities Maintenance Operations",
			},
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "hospitality_commercial_services",
		label: "Hospitality & Commercial Services",
		description: "Hotels, restaurants, catering, and commercial food service",
		subsectors: [
			{ id: "hotels_resorts", label: "Hotels & Resorts" },
			{ id: "restaurants_food_service", label: "Restaurants & Food Service" },
			{ id: "catering_services", label: "Catering Services" },
			{ id: "event_venues", label: "Event Venues" },
			{ id: "commercial_kitchens", label: "Commercial Kitchens" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "education_institutions",
		label: "Education & Institutions",
		description:
			"Educational facilities, research centers, and government institutions",
		subsectors: [
			{ id: "universities_colleges", label: "Universities & Colleges" },
			{ id: "schools", label: "Schools" },
			{ id: "research_centers", label: "Research Centers" },
			{ id: "government_facilities", label: "Government Facilities" },
			{ id: "military_installations", label: "Military Installations" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "logistics_transportation_services",
		label: "Logistics & Transportation Services",
		description: "Logistics, freight, shipping, and transportation services",
		subsectors: [
			{ id: "logistics_companies", label: "Logistics Companies" },
			{ id: "freight_forwarders", label: "Freight Forwarders" },
			{ id: "shipping_companies", label: "Shipping Companies" },
			{ id: "ports_terminals", label: "Ports & Terminals" },
			{ id: "airports", label: "Airports" },
			{ id: "courier_services", label: "Courier Services" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "environmental_waste_services",
		label: "Environmental & Waste Services",
		description: "Waste management, recycling, and environmental services",
		subsectors: [
			{ id: "waste_collection", label: "Waste Collection Companies" },
			{ id: "recycling_facilities", label: "Recycling Facilities" },
			{ id: "hazardous_waste_handlers", label: "Hazardous Waste Handlers" },
			{ id: "composting_operations", label: "Composting Operations" },
			{ id: "landfill_operators", label: "Landfill Operators" },
			{
				id: "environmental_remediation",
				label: "Environmental Remediation Firms",
			},
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "consumer_goods_fmcg",
		label: "Consumer Goods & FMCG",
		description: "Consumer packaged goods, cosmetics, and household products",
		subsectors: [
			{
				id: "consumer_packaged_goods",
				label: "Consumer Packaged Goods Manufacturers",
			},
			{ id: "cosmetics_manufacturing", label: "Cosmetics Manufacturing" },
			{ id: "household_products", label: "Household Products" },
			{ id: "personal_care_products", label: "Personal Care Products" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "financial_commercial_offices",
		label: "Financial & Commercial Offices",
		description: "Corporate offices, banks, and shared service operations",
		subsectors: [
			{ id: "corporate_offices", label: "Corporate Offices" },
			{
				id: "banks_financial_institutions",
				label: "Banks & Financial Institutions",
			},
			{ id: "call_centers", label: "Call Centers" },
			{ id: "shared_service_centers", label: "Shared Service Centers" },
			{ id: "other", label: "Other" },
		],
	},
	{
		id: "specialty_high_risk",
		label: "Specialty & High-Risk Industries",
		description:
			"Specialized industries with unique waste handling requirements",
		subsectors: [
			{ id: "explosives_manufacturing", label: "Explosives Manufacturing" },
			{ id: "defense_contractors", label: "Defense Contractors" },
			{ id: "nuclear_facilities", label: "Nuclear Facilities" },
			{
				id: "semiconductor_chemical_processing",
				label: "Semiconductor Chemical Processing",
			},
			{ id: "other", label: "Other" },
		],
	},
];

// Helper functions
export const getSectorConfig = (sectorId: Sector): SectorConfig | undefined => {
	return sectorsConfig.find((sector) => sector.id === sectorId);
};

export const getSubsectors = (
	sectorId: Sector,
): { id: KnownSubsector; label: string }[] => {
	const sector = getSectorConfig(sectorId);
	return sector?.subsectors || [];
};

export const getSectorBySubsector = (
	subsectorId: KnownSubsector,
): SectorConfig | undefined => {
	return sectorsConfig.find((sector) =>
		sector.subsectors.some((subsector) => subsector.id === subsectorId),
	);
};

// Industry groupings for searchable combobox UX
export const SECTOR_GROUPS = {
	production: {
		label: "Production & Manufacturing",
		sectors: [
			"manufacturing_industrial",
			"automotive_transportation",
			"chemicals_pharmaceuticals",
			"oil_gas_energy",
		] as const,
	},
	materials: {
		label: "Materials & Construction",
		sectors: [
			"mining_metals_materials",
			"construction_infrastructure",
			"packaging_paper_printing",
			"consumer_goods_fmcg",
		] as const,
	},
	food: {
		label: "Food & Agriculture",
		sectors: ["food_beverage", "agriculture_forestry"] as const,
	},
	services: {
		label: "Services & Infrastructure",
		sectors: [
			"retail_wholesale_distribution",
			"healthcare_medical",
			"hospitality_commercial_services",
			"education_institutions",
			"logistics_transportation_services",
			"financial_commercial_offices",
		] as const,
	},
	technology: {
		label: "Technology & Specialized",
		sectors: [
			"electronics_it_ewaste",
			"utilities_public_services",
			"environmental_waste_services",
			"specialty_high_risk",
		] as const,
	},
} as const;

export type SectorGroupKey = keyof typeof SECTOR_GROUPS;

export function getSectorsByGroup(groupKey: SectorGroupKey): SectorConfig[] {
	const group = SECTOR_GROUPS[groupKey];
	return group.sectors
		.map((id) => sectorsConfig.find((s) => s.id === id))
		.filter((s): s is SectorConfig => s !== undefined);
}
