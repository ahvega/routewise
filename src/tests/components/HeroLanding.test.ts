import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HeroLanding from '$lib/components/landing/HeroLanding.svelte';

// Mock the $t function to return the key
vi.mock('$lib/i18n', () => ({
	t: {
		subscribe: (fn: (value: (key: string) => string) => void) => {
			fn((key: string) => key);
			return () => {};
		}
	}
}));

describe('HeroLanding Component', () => {
	it('renders the landing page with main elements', () => {
		render(HeroLanding);

		// Check for pretitle
		expect(screen.getByText('landing.pretitle')).toBeInTheDocument();

		// Check for title
		expect(screen.getByText('landing.title')).toBeInTheDocument();

		// Check for subtitle
		expect(screen.getByText('landing.subtitle')).toBeInTheDocument();

		// Check for description
		expect(screen.getByText('landing.description')).toBeInTheDocument();
	});

	it('renders the Get Started CTA button', () => {
		render(HeroLanding);

		// Check for CTA button
		expect(screen.getByText('landing.getStarted')).toBeInTheDocument();
	});

	it('renders the closing message', () => {
		render(HeroLanding);

		// Check for closing message
		expect(screen.getByText('landing.closingMessage')).toBeInTheDocument();
	});

	it('renders all feature items', () => {
		render(HeroLanding);

		// Check for feature items
		expect(screen.getByText('landing.features.routes')).toBeInTheDocument();
		expect(screen.getByText('landing.features.pricing')).toBeInTheDocument();
		expect(screen.getByText('landing.features.currency')).toBeInTheDocument();
		expect(screen.getByText('landing.features.fleet')).toBeInTheDocument();
	});

	it('has proper login link for existing users', () => {
		render(HeroLanding);

		// Check for "Already have an account?" section
		expect(screen.getByText('landing.alreadyHaveAccount')).toBeInTheDocument();
		expect(screen.getByText('landing.signIn')).toBeInTheDocument();
	});

	it('has CTA link pointing to auth/login', () => {
		render(HeroLanding);

		// Check for links to auth/login
		const getStartedLink = screen.getByRole('link', { name: /landing.getStarted/i });
		expect(getStartedLink).toHaveAttribute('href', '/auth/login');
	});
});
