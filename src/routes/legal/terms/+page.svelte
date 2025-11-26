<script lang="ts">
	import { Card, Button } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';
</script>

<svelte:head>
	<title>Terms of Service | RouteWise</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
	<div class="mb-6">
		<Button href="/" color="light" size="sm">
			<ArrowLeftOutline class="w-4 h-4 mr-2" />
			Back to Home
		</Button>
	</div>

	<Card class="max-w-none !p-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: November 2024</p>

		<div class="prose dark:prose-invert max-w-none space-y-6">
			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
				<p class="text-gray-600 dark:text-gray-300">
					By accessing and using RouteWise ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this Service.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Description of Service</h2>
				<p class="text-gray-600 dark:text-gray-300">
					RouteWise is a transportation quotation and fleet management SaaS platform that provides:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mt-2 space-y-1">
					<li>Transportation quotation generation and management</li>
					<li>Vehicle fleet tracking and cost management</li>
					<li>Driver management and scheduling</li>
					<li>Client relationship management</li>
					<li>Invoice generation and payment tracking</li>
					<li>Business analytics and reporting</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. User Accounts</h2>
				<p class="text-gray-600 dark:text-gray-300">
					To access certain features of the Service, you must create an account. You are responsible for:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mt-2 space-y-1">
					<li>Maintaining the confidentiality of your account credentials</li>
					<li>All activities that occur under your account</li>
					<li>Notifying us immediately of any unauthorized use</li>
					<li>Ensuring your account information is accurate and up-to-date</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Acceptable Use</h2>
				<p class="text-gray-600 dark:text-gray-300">
					You agree not to use the Service to:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mt-2 space-y-1">
					<li>Violate any applicable laws or regulations</li>
					<li>Infringe upon the rights of others</li>
					<li>Transmit malicious code or interfere with the Service</li>
					<li>Attempt to gain unauthorized access to any systems</li>
					<li>Use the Service for any illegal or unauthorized purpose</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Data and Privacy</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Subscription and Payments</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Certain features of the Service require a paid subscription. You agree to:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 mt-2 space-y-1">
					<li>Pay all applicable fees as described at the time of purchase</li>
					<li>Provide accurate billing information</li>
					<li>Authorize recurring charges for subscription services</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Intellectual Property</h2>
				<p class="text-gray-600 dark:text-gray-300">
					The Service and its original content, features, and functionality are owned by RouteWise and are protected by international copyright, trademark, and other intellectual property laws.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Limitation of Liability</h2>
				<p class="text-gray-600 dark:text-gray-300">
					In no event shall RouteWise be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Changes to Terms</h2>
				<p class="text-gray-600 dark:text-gray-300">
					We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Contact Us</h2>
				<p class="text-gray-600 dark:text-gray-300">
					If you have any questions about these Terms, please contact us at:
				</p>
				<p class="text-gray-600 dark:text-gray-300 mt-2">
					<strong>Email:</strong> legal@routewise.app
				</p>
			</section>
		</div>
	</Card>
</div>
