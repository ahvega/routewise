import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '$convex/_generated/api';
import type { Id } from '$convex/_generated/dataModel';

const convex = new ConvexHttpClient(env.PUBLIC_CONVEX_URL || '');

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe subscription events:
 * - checkout.session.completed: Initial subscription creation
 * - customer.subscription.updated: Plan changes, renewals
 * - customer.subscription.deleted: Cancellations
 * - invoice.payment_succeeded: Successful payments
 * - invoice.payment_failed: Failed payments
 */

// Plan mapping from Stripe price IDs to plan names
function getPlanFromPriceId(priceId: string): { plan: string; billingCycle: string } {
	const priceMap: Record<string, { plan: string; billingCycle: string }> = {
		[env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly']: { plan: 'starter', billingCycle: 'monthly' },
		[env.STRIPE_PRICE_STARTER_YEARLY || 'price_starter_yearly']: { plan: 'starter', billingCycle: 'yearly' },
		[env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly']: { plan: 'professional', billingCycle: 'monthly' },
		[env.STRIPE_PRICE_PROFESSIONAL_YEARLY || 'price_professional_yearly']: { plan: 'professional', billingCycle: 'yearly' },
		[env.STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly']: { plan: 'business', billingCycle: 'monthly' },
		[env.STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly']: { plan: 'business', billingCycle: 'yearly' },
		[env.STRIPE_PRICE_FOUNDER_LIFETIME || 'price_founder_lifetime']: { plan: 'founder', billingCycle: 'lifetime' },
	};
	return priceMap[priceId] || { plan: 'trial', billingCycle: 'monthly' };
}

// Verify Stripe webhook signature
async function verifyStripeSignature(body: string, signature: string): Promise<boolean> {
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		console.warn('STRIPE_WEBHOOK_SECRET not configured, skipping signature verification');
		return true; // Skip verification in development
	}

	try {
		// Simple HMAC verification (for production, use Stripe SDK)
		const crypto = await import('crypto');
		const elements = signature.split(',');
		const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
		const signatures = elements.filter(e => e.startsWith('v1=')).map(e => e.slice(3));

		if (!timestamp || signatures.length === 0) {
			return false;
		}

		const signedPayload = `${timestamp}.${body}`;
		const expectedSignature = crypto
			.createHmac('sha256', webhookSecret)
			.update(signedPayload)
			.digest('hex');

		return signatures.some(sig => sig === expectedSignature);
	} catch (err) {
		console.error('Signature verification failed:', err);
		return false;
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature') || '';

	// Verify webhook signature
	const isValid = await verifyStripeSignature(body, signature);
	if (!isValid) {
		console.error('Invalid Stripe webhook signature');
		return new Response(JSON.stringify({ error: 'Invalid signature' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let event;
	try {
		event = JSON.parse(body);
	} catch (err) {
		console.error('Failed to parse webhook body:', err);
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	console.log(`Processing Stripe event: ${event.type}`);

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object;
				const tenantId = session.metadata?.tenantId as Id<'tenants'>;

				if (!tenantId) {
					console.error('No tenantId in checkout session metadata');
					break;
				}

				// Get subscription details
				const subscriptionId = session.subscription;
				if (subscriptionId && session.mode === 'subscription') {
					// Subscription checkout - fetch subscription details
					// In production, you'd fetch from Stripe API
					const priceId = session.metadata?.priceId || '';
					const { plan, billingCycle } = getPlanFromPriceId(priceId);

					await convex.mutation(api.subscriptions.updateFromStripe, {
						tenantId,
						subscriptionId,
						status: 'active',
						plan,
						billingCycle,
						currentPeriodStart: Date.now(),
						currentPeriodEnd: billingCycle === 'yearly'
							? Date.now() + 365 * 24 * 60 * 60 * 1000
							: Date.now() + 30 * 24 * 60 * 60 * 1000,
					});
				} else if (session.mode === 'payment') {
					// One-time payment (Founder lifetime deal)
					const paymentIntentId = session.payment_intent;
					if (paymentIntentId) {
						await convex.mutation(api.subscriptions.redeemFounderDeal, {
							tenantId,
							paymentIntentId,
						});
					}
				}
				break;
			}

			case 'customer.subscription.updated': {
				const subscription = event.data.object;
				const tenantId = subscription.metadata?.tenantId as Id<'tenants'>;

				if (!tenantId) {
					console.error('No tenantId in subscription metadata');
					break;
				}

				const priceId = subscription.items?.data?.[0]?.price?.id || '';
				const { plan, billingCycle } = getPlanFromPriceId(priceId);

				await convex.mutation(api.subscriptions.updateFromStripe, {
					tenantId,
					subscriptionId: subscription.id,
					status: subscription.status === 'active' ? 'active' :
						subscription.status === 'past_due' ? 'past_due' :
						subscription.status === 'canceled' ? 'cancelled' : 'inactive',
					plan,
					billingCycle,
					currentPeriodStart: subscription.current_period_start * 1000,
					currentPeriodEnd: subscription.current_period_end * 1000,
				});
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object;
				const tenantId = subscription.metadata?.tenantId as Id<'tenants'>;

				if (!tenantId) {
					console.error('No tenantId in subscription metadata');
					break;
				}

				await convex.mutation(api.subscriptions.cancelSubscription, {
					tenantId,
					cancelAtPeriodEnd: false,
				});
				break;
			}

			case 'invoice.payment_succeeded': {
				const invoice = event.data.object;
				const subscriptionId = invoice.subscription;

				if (subscriptionId) {
					// Payment successful, subscription should already be updated
					console.log(`Payment succeeded for subscription: ${subscriptionId}`);
				}
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object;
				const tenantId = invoice.subscription_details?.metadata?.tenantId as Id<'tenants'>;

				if (tenantId) {
					// Mark subscription as past_due
					await convex.mutation(api.subscriptions.updateFromStripe, {
						tenantId,
						subscriptionId: invoice.subscription || '',
						status: 'past_due',
						plan: 'trial', // Will be corrected on next successful payment
						billingCycle: 'monthly',
						currentPeriodStart: Date.now(),
						currentPeriodEnd: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 day grace period
					});
				}
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return new Response(JSON.stringify({ received: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Error processing webhook:', err);
		return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
