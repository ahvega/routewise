/**
 * Default vehicle makes and models commonly used in Latin American transportation
 * This list serves as the base, tenants can add custom makes/models that get stored in their parameters
 */

export interface VehicleMakeModel {
	make: string;
	models: string[];
}

export const DEFAULT_VEHICLE_MAKES: VehicleMakeModel[] = [
	// Buses and Commercial Vehicles
	{
		make: 'Mercedes-Benz',
		models: [
			'Sprinter',
			'Vito',
			'OF 1721',
			'OF 1724',
			'O 500',
			'O 500 RS',
			'O 500 RSD',
			'Tourismo',
			'Travego'
		]
	},
	{
		make: 'Volvo',
		models: ['B7R', 'B9R', 'B11R', 'B12R', 'B420R', '9700', '9800', '9900']
	},
	{
		make: 'Scania',
		models: ['K310', 'K340', 'K360', 'K380', 'K400', 'K410', 'K440', 'Irizar i6']
	},
	{
		make: 'Marcopolo',
		models: [
			'Paradiso 1200',
			'Paradiso 1350',
			'Paradiso 1600 LD',
			'Paradiso 1800 DD',
			'Viaggio 900',
			'Viaggio 1050',
			'Ideale 770',
			'Torino',
			'Viale'
		]
	},
	{
		make: 'Irizar',
		models: ['i6', 'i6S', 'i8', 'PB', 'Century']
	},
	{
		make: 'Hino',
		models: ['RK8', 'RN8', 'AK8', 'FG', 'FM', 'GH', '500 Series', '700 Series']
	},
	{
		make: 'Hyundai',
		models: [
			'H-1',
			'H-100',
			'H350',
			'Solati',
			'County',
			'Universe',
			'Super Aero City',
			'Tucson',
			'Santa Fe',
			'Palisade'
		]
	},
	{
		make: 'Toyota',
		models: [
			'Hiace',
			'Hiace Commuter',
			'Coaster',
			'Land Cruiser',
			'Fortuner',
			'Hilux',
			'Prado',
			'4Runner',
			'Sequoia',
			'RAV4',
			'Corolla',
			'Camry'
		]
	},
	{
		make: 'Nissan',
		models: [
			'Urvan',
			'NV350',
			'Civilian',
			'Patrol',
			'Pathfinder',
			'X-Trail',
			'Navara',
			'Frontier',
			'Murano',
			'Kicks'
		]
	},
	{
		make: 'Ford',
		models: [
			'Transit',
			'Transit Custom',
			'E-350',
			'E-450',
			'F-150',
			'F-250',
			'F-350',
			'Ranger',
			'Explorer',
			'Expedition',
			'Bronco'
		]
	},
	{
		make: 'Chevrolet',
		models: [
			'Express',
			'Suburban',
			'Tahoe',
			'Traverse',
			'Silverado',
			'Colorado',
			'Trailblazer',
			'Captiva',
			'Equinox',
			'N300',
			'N400'
		]
	},
	{
		make: 'Kia',
		models: [
			'Carnival',
			'Sedona',
			'Sorento',
			'Sportage',
			'Seltos',
			'Telluride',
			'K2500',
			'K2700',
			'Bongo'
		]
	},
	{
		make: 'Honda',
		models: ['Odyssey', 'Pilot', 'Passport', 'CR-V', 'HR-V', 'Accord', 'Civic', 'Ridgeline']
	},
	{
		make: 'Mitsubishi',
		models: ['L300', 'Rosa', 'Fuso', 'Canter', 'Pajero', 'Montero', 'Outlander', 'L200']
	},
	{
		make: 'Isuzu',
		models: ['Elf', 'NQR', 'NPR', 'FRR', 'FVR', 'D-Max', 'MU-X', 'Journey']
	},
	{
		make: 'JAC',
		models: ['Refine', 'Sunray', 'N56', 'N721', 'HFC1035', 'T6', 'T8']
	},
	{
		make: 'Foton',
		models: ['View', 'Toano', 'Tunland', 'Aumark', 'Auman', 'BJ6']
	},
	{
		make: 'Yutong',
		models: ['ZK6107', 'ZK6116', 'ZK6122', 'ZK6127', 'ZK6858', 'ZK6938']
	},
	{
		make: 'King Long',
		models: ['XMQ6127', 'XMQ6117', 'XMQ6900', 'XMQ6119', 'XMQ6129']
	},
	{
		make: 'Golden Dragon',
		models: ['XML6127', 'XML6102', 'XML6957', 'XML6125']
	},
	{
		make: 'Zhongtong',
		models: ['LCK6127', 'LCK6108', 'LCK6939']
	},
	// Luxury and Specialty
	{
		make: 'Prevost',
		models: ['H3-45', 'X3-45', 'H3-41']
	},
	{
		make: 'MCI',
		models: ['J4500', 'D4505', 'D45 CRT LE']
	},
	{
		make: 'Van Hool',
		models: ['CX35', 'CX45', 'TX45']
	},
	{
		make: 'Setra',
		models: ['S 515 HD', 'S 516 HD', 'S 517 HD', 'S 531 DT']
	},
	// Vans for smaller groups
	{
		make: 'Dodge',
		models: ['Grand Caravan', 'Durango', 'Ram ProMaster', 'Ram 1500', 'Ram 2500']
	},
	{
		make: 'Volkswagen',
		models: ['Transporter', 'Crafter', 'Caravelle', 'Multivan', 'Amarok', 'Tiguan']
	},
	{
		make: 'Renault',
		models: ['Master', 'Trafic', 'Kangoo', 'Duster', 'Koleos']
	},
	{
		make: 'Peugeot',
		models: ['Boxer', 'Expert', 'Traveller', 'Partner', '5008', '3008']
	},
	{
		make: 'Fiat',
		models: ['Ducato', 'Scudo', 'Doblo', 'Fiorino']
	},
	{
		make: 'Iveco',
		models: ['Daily', 'Eurocargo', 'Stralis', 'Trakker']
	},
	{
		make: 'MAN',
		models: ['TGE', 'TGL', 'TGM', 'TGS', 'TGX', 'Lions Coach']
	},
	{
		make: 'Neoplan',
		models: ['Cityliner', 'Skyliner', 'Tourliner', 'Starliner']
	}
];

/**
 * Get all unique makes from the default list
 */
export function getDefaultMakes(): string[] {
	return DEFAULT_VEHICLE_MAKES.map((v) => v.make).sort();
}

/**
 * Get models for a specific make from the default list
 */
export function getDefaultModels(make: string): string[] {
	const found = DEFAULT_VEHICLE_MAKES.find((v) => v.make.toLowerCase() === make.toLowerCase());
	return found ? found.models.sort() : [];
}

/**
 * Merge default makes with custom tenant makes
 */
export function getMergedMakes(customMakes?: VehicleMakeModel[]): string[] {
	const allMakes = new Set(getDefaultMakes());
	if (customMakes) {
		customMakes.forEach((cm) => allMakes.add(cm.make));
	}
	return Array.from(allMakes).sort();
}

/**
 * Get models for a make, merging default and custom
 */
export function getMergedModels(make: string, customMakes?: VehicleMakeModel[]): string[] {
	const models = new Set(getDefaultModels(make));
	if (customMakes) {
		const customMake = customMakes.find((cm) => cm.make.toLowerCase() === make.toLowerCase());
		if (customMake) {
			customMake.models.forEach((m) => models.add(m));
		}
	}
	return Array.from(models).sort();
}
