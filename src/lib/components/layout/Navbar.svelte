<script lang="ts">
	import {
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		DarkMode,
		Button,
		Dropdown,
		DropdownItem,
		DropdownDivider,
		DropdownHeader,
		Avatar
	} from 'flowbite-svelte';
	import {
		UserCircleOutline,
		ArrowRightToBracketOutline,
		PlusOutline,
		FileLinesOutline,
		UsersOutline,
		TruckOutline,
		UserOutline,
		BarsOutline,
		GlobeOutline
	} from 'flowbite-svelte-icons';
	import { t, locale, setLocale, locales } from '$lib/i18n';

	interface User {
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	}

	let { user = null }: { user: User | null } = $props();

	// Display only first name, fallback to email prefix
	const displayName = $derived(
		user?.firstName || user?.email?.split('@')[0] || 'User'
	);

	const initials = $derived(
		user?.firstName
			? user.firstName[0].toUpperCase()
			: user?.email?.[0]?.toUpperCase() || 'U'
	);

	// Get current locale info
	const currentLocale = $derived(locales.find(l => l.code === $locale) || locales[0]);
</script>

<Navbar class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
	<NavBrand href="/">
		<span class="self-center text-xl font-semibold whitespace-nowrap dark:text-white">RouteWise</span>
	</NavBrand>

	<div class="flex items-center gap-2 md:order-2">
		<!-- Quick Actions Menu (hamburger with app actions) -->
		{#if user}
			<button
				id="actions-menu-button"
				class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
				aria-label="Quick actions"
			>
				<BarsOutline class="w-5 h-5" />
			</button>
			<Dropdown triggeredBy="#actions-menu-button" class="w-56 !bg-white dark:!bg-gray-800">
				<DropdownHeader>
					<span class="text-sm font-semibold text-gray-900 dark:text-white">{$t('nav.quickActions') || 'Quick Actions'}</span>
				</DropdownHeader>
				<DropdownItem href="/quotations/new" class="flex items-center gap-3 !text-gray-900 dark:!text-white">
					<PlusOutline class="w-4 h-4 text-primary-600 dark:text-primary-400" />
					<span>{$t('quotations.newQuotation')}</span>
				</DropdownItem>
				<DropdownItem href="/clients?action=new" class="flex items-center gap-3 !text-gray-900 dark:!text-white">
					<UsersOutline class="w-4 h-4 text-green-600 dark:text-green-400" />
					<span>{$t('clients.addClient')}</span>
				</DropdownItem>
				<DropdownItem href="/vehicles?action=new" class="flex items-center gap-3 !text-gray-900 dark:!text-white">
					<TruckOutline class="w-4 h-4 text-purple-600 dark:text-purple-400" />
					<span>{$t('vehicles.addVehicle')}</span>
				</DropdownItem>
				<DropdownItem href="/drivers?action=new" class="flex items-center gap-3 !text-gray-900 dark:!text-white">
					<UserOutline class="w-4 h-4 text-orange-600 dark:text-orange-400" />
					<span>{$t('drivers.addDriver')}</span>
				</DropdownItem>
				<DropdownDivider />
				<DropdownItem href="/quotations" class="flex items-center gap-3 !text-gray-900 dark:!text-white">
					<FileLinesOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
					<span>{$t('quotations.title')}</span>
				</DropdownItem>
			</Dropdown>
		{/if}

		<!-- Language Switcher -->
		<button
			id="lang-menu-button"
			class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
			aria-label="Change language"
		>
			<span class="text-sm">{currentLocale.flag}</span>
		</button>
		<Dropdown triggeredBy="#lang-menu-button" class="w-40 !bg-white dark:!bg-gray-800">
			{#each locales as loc}
				<DropdownItem
					onclick={() => setLocale(loc.code)}
					class="flex items-center gap-2 !text-gray-900 dark:!text-white {$locale === loc.code ? 'bg-gray-100 dark:bg-gray-700' : ''}"
				>
					<span>{loc.flag}</span>
					<span>{loc.name}</span>
				</DropdownItem>
			{/each}
		</Dropdown>

		<DarkMode class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" />

		{#if user}
			<button
				id="user-menu-button"
				class="flex items-center gap-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-full p-1 pr-3 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
			>
				<Avatar size="sm" class="bg-primary-600 text-white">{initials}</Avatar>
				<span class="hidden md:inline text-gray-700 dark:text-gray-300">{displayName}</span>
			</button>
			<Dropdown triggeredBy="#user-menu-button" class="w-48 !bg-white dark:!bg-gray-800">
				<div class="px-4 py-3">
					<span class="block text-sm font-medium text-gray-900 dark:text-white">{displayName}</span>
					<span class="block text-sm text-gray-500 truncate dark:text-gray-400">{user.email}</span>
				</div>
				<DropdownDivider />
				<DropdownItem href="/settings" class="!text-gray-900 dark:!text-white">{$t('nav.settings')}</DropdownItem>
				<DropdownDivider />
				<DropdownItem href="/auth/logout" class="!text-red-600 dark:!text-red-400">
					{$t('nav.logout')}
				</DropdownItem>
			</Dropdown>
		{:else}
			<Button href="/auth/login" size="sm" class="hidden md:flex">
				<ArrowRightToBracketOutline class="w-4 h-4 mr-2" />
				{$t('auth.login')}
			</Button>
			<Button href="/auth/login" size="sm" class="md:hidden" pill>
				<UserCircleOutline class="w-5 h-5" />
			</Button>
		{/if}

		<NavHamburger />
	</div>

	<NavUl>
		<NavLi href="/">{$t('nav.dashboard')}</NavLi>
		<NavLi href="/quotations">{$t('nav.quotations')}</NavLi>
		<NavLi href="/clients">{$t('nav.clients')}</NavLi>
		<NavLi href="/vehicles">{$t('nav.vehicles')}</NavLi>
		<NavLi href="/drivers">{$t('nav.drivers')}</NavLi>
		<NavLi href="/settings">{$t('nav.settings')}</NavLi>
	</NavUl>
</Navbar>
