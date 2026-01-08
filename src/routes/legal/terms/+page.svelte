<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';

	const lastUpdated = '27 de noviembre de 2024';
	const companyName = 'RouteWise';
	const companyEmail = 'legal@routewise.hn';
	const companyAddress = 'San Pedro Sula, Honduras';
</script>

<svelte:head>
	<title>Términos de Servicio - {companyName}</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-8 px-4">
	<a href="/" class="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-6">
		<ArrowLeftOutline class="w-4 h-4 mr-2" />
		Volver al inicio
	</a>

	<Card class="max-w-none !p-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Términos de Servicio</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Última actualización: {lastUpdated}</p>

		<div class="prose prose-gray dark:prose-invert max-w-none space-y-6">
			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Aceptación de los Términos</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Al acceder y utilizar la plataforma {companyName} ("el Servicio"), usted acepta estar sujeto a estos Términos de Servicio ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
				</p>
				<p class="text-gray-600 dark:text-gray-300">
					Estos Términos aplican a todos los usuarios, visitantes y otras personas que accedan o utilicen el Servicio, incluyendo empresas de transporte, operadores de flotas, y agencias de turismo.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Descripción del Servicio</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					{companyName} es una plataforma de Software como Servicio (SaaS) que proporciona:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>Gestión de cotizaciones de transporte</li>
					<li>Cálculo de rutas y costos operativos</li>
					<li>Administración de flotas vehiculares</li>
					<li>Gestión de conductores y clientes</li>
					<li>Generación de itinerarios y facturas</li>
					<li>Reportes y análisis de operaciones</li>
					<li>Integración con servicios de mapas y geolocalización</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Registro y Cuentas</h2>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.1 Requisitos de Registro</h3>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Para utilizar el Servicio, debe registrarse proporcionando información precisa, completa y actualizada. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
				</p>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.2 Elegibilidad</h3>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					El Servicio está destinado a empresas legalmente constituidas y personas mayores de 18 años con capacidad legal para celebrar contratos vinculantes.
				</p>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">3.3 Responsabilidad de la Cuenta</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Usted es responsable de todas las actividades que ocurran bajo su cuenta. Debe notificarnos inmediatamente sobre cualquier uso no autorizado de su cuenta.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Uso Aceptable</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Al usar el Servicio, usted se compromete a:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>No violar ninguna ley o regulación aplicable</li>
					<li>No transmitir información falsa, engañosa o fraudulenta</li>
					<li>No interferir con el funcionamiento del Servicio</li>
					<li>No intentar acceder a sistemas o datos sin autorización</li>
					<li>No utilizar el Servicio para actividades ilegales o no éticas</li>
					<li>No revender o redistribuir el Servicio sin autorización</li>
					<li>No cargar contenido malicioso, virus o código dañino</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Planes y Pagos</h2>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">5.1 Suscripciones</h3>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					El Servicio se ofrece mediante planes de suscripción. Los precios, características y límites de cada plan están disponibles en nuestra página de precios y pueden ser modificados con previo aviso.
				</p>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">5.2 Facturación</h3>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Las suscripciones se facturan por adelantado de forma mensual o anual, según el plan seleccionado. Los pagos se procesan en Lempiras Hondureños (HNL) o Dólares Estadounidenses (USD).
				</p>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">5.3 Reembolsos</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Los pagos realizados no son reembolsables, excepto cuando sea requerido por ley. En caso de cancelación, mantendrá acceso al Servicio hasta el final del período facturado.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Propiedad Intelectual</h2>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">6.1 Nuestra Propiedad</h3>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					El Servicio y su contenido original, características y funcionalidad son propiedad de {companyName} y están protegidos por leyes de propiedad intelectual de Honduras y tratados internacionales.
				</p>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">6.2 Sus Datos</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Usted retiene todos los derechos sobre los datos que ingresa en el Servicio. Nos otorga una licencia limitada para usar estos datos únicamente con el propósito de proporcionarle el Servicio.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Privacidad y Datos</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Su privacidad es importante para nosotros. Nuestra <a href="/legal/privacy" class="text-primary-600 hover:text-primary-700 dark:text-primary-400">Política de Privacidad</a> describe cómo recopilamos, usamos y protegemos su información personal.
				</p>
				<p class="text-gray-600 dark:text-gray-300">
					Al usar el Servicio, usted consiente la recopilación y uso de información de acuerdo con nuestra Política de Privacidad.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Disponibilidad del Servicio</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Nos esforzamos por mantener el Servicio disponible las 24 horas del día, los 7 días de la semana. Sin embargo, no garantizamos que el Servicio estará disponible de forma ininterrumpida o libre de errores.
				</p>
				<p class="text-gray-600 dark:text-gray-300">
					Nos reservamos el derecho de suspender o discontinuar el Servicio, temporal o permanentemente, con o sin previo aviso, por mantenimiento, actualizaciones o cualquier otra razón.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Limitación de Responsabilidad</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					En la máxima medida permitida por la ley aplicable, {companyName} no será responsable por:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>Daños indirectos, incidentales, especiales o consecuentes</li>
					<li>Pérdida de beneficios, datos, uso o buena voluntad</li>
					<li>Interrupciones del servicio o pérdida de acceso</li>
					<li>Errores en los cálculos de rutas o costos (que son estimaciones)</li>
					<li>Acciones de terceros o servicios externos integrados</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Indemnización</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Usted acepta indemnizar y mantener indemne a {companyName}, sus directores, empleados y agentes, de cualquier reclamación, daño, pérdida o gasto (incluyendo honorarios legales) que surja de su uso del Servicio o violación de estos Términos.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Terminación</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Podemos terminar o suspender su acceso al Servicio inmediatamente, sin previo aviso, por cualquier razón, incluyendo, sin limitación, si usted incumple estos Términos.
				</p>
				<p class="text-gray-600 dark:text-gray-300">
					Usted puede terminar su cuenta en cualquier momento contactándonos. Tras la terminación, su derecho a usar el Servicio cesará inmediatamente.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Modificaciones</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos sobre cambios significativos mediante correo electrónico o aviso en el Servicio. Su uso continuado del Servicio después de dichos cambios constituye su aceptación de los nuevos Términos.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">13. Ley Aplicable y Jurisdicción</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Honduras, sin consideración a sus disposiciones sobre conflictos de leyes. Cualquier disputa será sometida a la jurisdicción exclusiva de los tribunales competentes de Honduras.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">14. Disposiciones Generales</h2>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li><strong>Acuerdo Completo:</strong> Estos Términos constituyen el acuerdo completo entre usted y {companyName} respecto al Servicio.</li>
					<li><strong>Divisibilidad:</strong> Si alguna disposición de estos Términos es inválida, las demás disposiciones permanecerán en vigor.</li>
					<li><strong>Renuncia:</strong> La falta de ejercicio de cualquier derecho no constituirá una renuncia al mismo.</li>
					<li><strong>Cesión:</strong> Usted no puede ceder estos Términos sin nuestro consentimiento previo por escrito.</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">15. Contacto</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos:
				</p>
				<ul class="list-none text-gray-600 dark:text-gray-300 space-y-1">
					<li><strong>Correo electrónico:</strong> {companyEmail}</li>
					<li><strong>Dirección:</strong> {companyAddress}</li>
				</ul>
			</section>
		</div>
	</Card>
</div>
