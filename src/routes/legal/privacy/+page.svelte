<script lang="ts">
	import { Card } from 'flowbite-svelte';
	import { ArrowLeftOutline } from 'flowbite-svelte-icons';

	const lastUpdated = '27 de noviembre de 2024';
	const companyName = 'RouteWise';
	const companyEmail = 'privacidad@routewise.hn';
	const companyAddress = 'San Pedro Sula, Honduras';
</script>

<svelte:head>
	<title>Política de Privacidad - {companyName}</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-8 px-4">
	<a href="/" class="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-6">
		<ArrowLeftOutline class="w-4 h-4 mr-2" />
		Volver al inicio
	</a>

	<Card class="max-w-none !p-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Política de Privacidad</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Última actualización: {lastUpdated}</p>

		<div class="prose prose-gray dark:prose-invert max-w-none space-y-6">
			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">1. Introducción</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					En {companyName}, respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos su información cuando utiliza nuestra plataforma de gestión de transporte.
				</p>
				<p class="text-gray-600 dark:text-gray-300">
					Al utilizar nuestros servicios, usted acepta las prácticas descritas en esta política. Le recomendamos leer este documento detenidamente.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">2. Información que Recopilamos</h2>
				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">2.1 Información que Usted Proporciona</h3>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
					<li><strong>Datos de registro:</strong> Nombre, correo electrónico, contraseña, nombre de empresa</li>
					<li><strong>Información de perfil:</strong> Número de teléfono, dirección, logo de empresa</li>
					<li><strong>Datos de clientes:</strong> Información de contacto de sus clientes para cotizaciones</li>
					<li><strong>Datos de vehículos:</strong> Información de su flota vehicular</li>
					<li><strong>Datos de conductores:</strong> Información de su personal de conducción</li>
					<li><strong>Datos financieros:</strong> Información de facturación y métodos de pago</li>
				</ul>

				<h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">2.2 Información Recopilada Automáticamente</h3>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li><strong>Datos de uso:</strong> Páginas visitadas, funciones utilizadas, frecuencia de uso</li>
					<li><strong>Datos técnicos:</strong> Dirección IP, tipo de navegador, sistema operativo, dispositivo</li>
					<li><strong>Cookies:</strong> Identificadores para mejorar su experiencia (ver sección de Cookies)</li>
					<li><strong>Datos de ubicación:</strong> Información de geolocalización para cálculo de rutas</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">3. Cómo Usamos su Información</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Utilizamos su información para los siguientes propósitos:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>Proporcionar y mantener nuestros servicios de gestión de transporte</li>
					<li>Procesar cotizaciones, itinerarios y facturas</li>
					<li>Calcular rutas y costos operativos</li>
					<li>Gestionar su cuenta y suscripción</li>
					<li>Enviar comunicaciones relacionadas con el servicio</li>
					<li>Mejorar y personalizar su experiencia</li>
					<li>Analizar el uso para mejorar nuestros productos</li>
					<li>Prevenir fraudes y garantizar la seguridad</li>
					<li>Cumplir con obligaciones legales</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">4. Compartición de Información</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					No vendemos ni alquilamos su información personal. Podemos compartir información en las siguientes circunstancias:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li><strong>Proveedores de servicios:</strong> Empresas que nos ayudan a operar (hosting, procesamiento de pagos, envío de correos)</li>
					<li><strong>Integraciones de terceros:</strong> Google Maps para cálculo de rutas y visualización de mapas</li>
					<li><strong>Requisitos legales:</strong> Cuando sea requerido por ley o autoridades competentes</li>
					<li><strong>Protección de derechos:</strong> Para proteger nuestros derechos, propiedad o seguridad</li>
					<li><strong>Transacciones corporativas:</strong> En caso de fusión, adquisición o venta de activos</li>
				</ul>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">5. Seguridad de los Datos</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Implementamos medidas de seguridad técnicas y organizativas para proteger su información:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>Encriptación de datos en tránsito (HTTPS/TLS)</li>
					<li>Encriptación de datos sensibles en reposo</li>
					<li>Controles de acceso basados en roles</li>
					<li>Monitoreo de seguridad continuo</li>
					<li>Copias de seguridad regulares</li>
					<li>Autenticación segura con WorkOS</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300 mt-3">
					Sin embargo, ningún método de transmisión por Internet es 100% seguro. No podemos garantizar seguridad absoluta.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">6. Retención de Datos</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Retenemos su información mientras su cuenta esté activa o según sea necesario para:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li>Proporcionar nuestros servicios</li>
					<li>Cumplir con obligaciones legales (registros fiscales: 5 años en Honduras)</li>
					<li>Resolver disputas</li>
					<li>Hacer cumplir nuestros acuerdos</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300 mt-3">
					Tras la cancelación de su cuenta, eliminaremos o anonimizaremos sus datos dentro de 90 días, excepto cuando la ley requiera retención adicional.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">7. Sus Derechos</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Usted tiene los siguientes derechos sobre sus datos personales:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li><strong>Acceso:</strong> Solicitar una copia de sus datos personales</li>
					<li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
					<li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos</li>
					<li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
					<li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos</li>
					<li><strong>Limitación:</strong> Restringir el procesamiento en ciertas circunstancias</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300 mt-3">
					Para ejercer estos derechos, contáctenos en {companyEmail}.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">8. Cookies y Tecnologías Similares</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Utilizamos cookies y tecnologías similares para:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4 mb-4">
					<li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del servicio (autenticación, sesión)</li>
					<li><strong>Cookies de preferencias:</strong> Recordar su configuración (idioma, tema oscuro)</li>
					<li><strong>Cookies analíticas:</strong> Entender cómo usa el servicio para mejorarlo</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300">
					Puede configurar su navegador para rechazar cookies, aunque esto puede afectar la funcionalidad del servicio.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">9. Servicios de Terceros</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Nuestro servicio integra las siguientes plataformas de terceros:
				</p>
				<ul class="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-2 ml-4">
					<li><strong>Google Maps:</strong> Para cálculo de rutas y visualización de mapas (sujeto a la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" class="text-primary-600 hover:text-primary-700 dark:text-primary-400">Política de Privacidad de Google</a>)</li>
					<li><strong>WorkOS:</strong> Para autenticación y gestión de identidad</li>
					<li><strong>Convex:</strong> Para almacenamiento de datos en tiempo real</li>
					<li><strong>Vercel:</strong> Para hospedaje de la aplicación</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300 mt-3">
					Cada uno de estos servicios tiene sus propias políticas de privacidad que le recomendamos revisar.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">10. Transferencias Internacionales</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Sus datos pueden ser transferidos y procesados en servidores ubicados fuera de Honduras. Nos aseguramos de que cualquier transferencia internacional cumpla con los estándares de protección de datos apropiados y se realice con proveedores que ofrezcan garantías adecuadas de seguridad.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">11. Menores de Edad</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos intencionalmente información de menores. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos de inmediato.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">12. Cambios a esta Política</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos sobre cambios significativos mediante correo electrónico o aviso en el servicio. Le recomendamos revisar esta política regularmente. Su uso continuado del servicio después de los cambios constituye su aceptación de la política actualizada.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">13. Ley Aplicable</h2>
				<p class="text-gray-600 dark:text-gray-300">
					Esta Política de Privacidad se rige por las leyes de la República de Honduras. Para cualquier disputa relacionada con la privacidad de sus datos, se someterá a la jurisdicción de los tribunales competentes de Honduras.
				</p>
			</section>

			<section>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">14. Contacto</h2>
				<p class="text-gray-600 dark:text-gray-300 mb-3">
					Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos, puede contactarnos:
				</p>
				<ul class="list-none text-gray-600 dark:text-gray-300 space-y-1">
					<li><strong>Responsable de Privacidad:</strong> {companyName}</li>
					<li><strong>Correo electrónico:</strong> {companyEmail}</li>
					<li><strong>Dirección:</strong> {companyAddress}</li>
				</ul>
				<p class="text-gray-600 dark:text-gray-300 mt-4">
					También puede revisar nuestros <a href="/legal/terms" class="text-primary-600 hover:text-primary-700 dark:text-primary-400">Términos de Servicio</a> para información adicional sobre el uso de nuestra plataforma.
				</p>
			</section>
		</div>
	</Card>
</div>
