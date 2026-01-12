/**
 * Action Menu Types and Helpers
 *
 * Provides standardized action definitions for kebab menus across the app.
 */

import {
	ArrowRightOutline,
	TrashBinOutline,
	ClipboardOutline,
	PhoneOutline,
	EnvelopeOutline,
	FilePdfOutline,
	PaperPlaneOutline,
	EditOutline,
	CheckCircleOutline,
	CloseCircleOutline,
	CashOutline,
	ClipboardCheckOutline,
	EyeOutline
} from 'flowbite-svelte-icons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = any;

/**
 * Represents a single action item in the ActionMenu
 */
export interface ActionItem {
	/** Unique identifier for the action */
	id: string;
	/** Display label for the action */
	label: string;
	/** Icon component to display (from flowbite-svelte-icons) */
	icon?: IconComponent;
	/** Click handler for the action */
	onClick?: () => void | Promise<void>;
	/** Optional href for navigation actions (uses anchor instead of button) */
	href?: string;
	/** Color variant for the action */
	color?: 'default' | 'danger' | 'success' | 'warning';
	/** Whether the action is disabled */
	disabled?: boolean;
	/** Show a divider before this action */
	dividerBefore?: boolean;
	/** Conditional visibility (false to hide) */
	show?: boolean;
}

/**
 * Props for the ActionMenu component
 */
export interface ActionMenuProps {
	/** Array of action items to display */
	actions: ActionItem[];
	/** Unique ID for the trigger button (used by Dropdown) */
	triggerId: string;
	/** Position of the dropdown */
	position?: 'left' | 'right';
	/** Size variant */
	size?: 'xs' | 'sm' | 'md';
}

// ============================================
// Action Builder Helpers
// ============================================

/**
 * Creates a View/Select action that navigates to a detail page
 */
export function createViewAction(href: string, label = 'Ver'): ActionItem {
	return {
		id: 'view',
		label,
		icon: ArrowRightOutline,
		href,
		color: 'default'
	};
}

/**
 * Creates an Edit action that opens a modal or navigates
 */
export function createEditAction(onClick: () => void, label = 'Editar'): ActionItem {
	return {
		id: 'edit',
		label,
		icon: EditOutline,
		onClick,
		color: 'default'
	};
}

/**
 * Creates a Delete action (always red, with divider)
 */
export function createDeleteAction(
	onClick: () => void,
	disabled = false,
	label = 'Eliminar'
): ActionItem {
	return {
		id: 'delete',
		label,
		icon: TrashBinOutline,
		onClick,
		color: 'danger',
		dividerBefore: true,
		disabled
	};
}

/**
 * Creates a Duplicate action
 */
export function createDuplicateAction(onClick: () => void, label = 'Duplicar'): ActionItem {
	return {
		id: 'duplicate',
		label,
		icon: ClipboardOutline,
		onClick,
		color: 'default'
	};
}

/**
 * Creates a Call action (returns null if no phone)
 */
export function createCallAction(
	phone: string | undefined | null,
	label = 'Llamar'
): ActionItem | null {
	if (!phone) return null;
	return {
		id: 'call',
		label,
		icon: PhoneOutline,
		href: `tel:${phone}`,
		color: 'default'
	};
}

/**
 * Creates an Email action (returns null if no email)
 */
export function createEmailAction(
	email: string | undefined | null,
	label = 'Enviar Email'
): ActionItem | null {
	if (!email) return null;
	return {
		id: 'email',
		label,
		icon: EnvelopeOutline,
		href: `mailto:${email}`,
		color: 'default'
	};
}

/**
 * Formats a phone number for WhatsApp links (removes non-numeric chars except leading +)
 */
export function formatPhoneForWhatsApp(phone: string): string {
	let cleaned = phone.replace(/[^+\d]/g, '');
	if (cleaned.startsWith('+')) {
		cleaned = cleaned.substring(1);
	}
	return cleaned;
}

/**
 * Creates a WhatsApp action (returns null if no phone)
 */
export function createWhatsAppAction(
	phone: string | undefined | null,
	label = 'WhatsApp'
): ActionItem | null {
	if (!phone) return null;
	return {
		id: 'whatsapp',
		label,
		icon: null, // Custom SVG handled in ActionMenu components
		href: `https://wa.me/${formatPhoneForWhatsApp(phone)}`,
		color: 'default'
	};
}

/**
 * Creates a PDF download action
 */
export function createPdfAction(onClick: () => void, label = 'Descargar PDF'): ActionItem {
	return {
		id: 'pdf',
		label,
		icon: FilePdfOutline,
		onClick,
		color: 'default'
	};
}

/**
 * Creates a Send via Email action
 */
export function createSendEmailAction(onClick: () => void, label = 'Enviar por Email'): ActionItem {
	return {
		id: 'send-email',
		label,
		icon: PaperPlaneOutline,
		onClick,
		color: 'default'
	};
}

/**
 * Creates an Approve action (green)
 */
export function createApproveAction(onClick: () => void, label = 'Aprobar'): ActionItem {
	return {
		id: 'approve',
		label,
		icon: CheckCircleOutline,
		onClick,
		color: 'success'
	};
}

/**
 * Creates a Reject/Cancel action
 */
export function createRejectAction(onClick: () => void, label = 'Rechazar'): ActionItem {
	return {
		id: 'reject',
		label,
		icon: CloseCircleOutline,
		onClick,
		color: 'warning'
	};
}

/**
 * Creates a Cancel action
 */
export function createCancelAction(onClick: () => void, label = 'Cancelar'): ActionItem {
	return {
		id: 'cancel',
		label,
		icon: CloseCircleOutline,
		onClick,
		color: 'warning',
		dividerBefore: true
	};
}

/**
 * Creates a Disburse action (for expense advances)
 */
export function createDisburseAction(onClick: () => void, label = 'Desembolsar'): ActionItem {
	return {
		id: 'disburse',
		label,
		icon: CashOutline,
		onClick,
		color: 'default'
	};
}

/**
 * Creates a Settle action (for expense advances)
 */
export function createSettleAction(onClick: () => void, label = 'Liquidar'): ActionItem {
	return {
		id: 'settle',
		label,
		icon: ClipboardCheckOutline,
		onClick,
		color: 'success'
	};
}

/**
 * Creates a View Details action (opens modal)
 */
export function createViewDetailsAction(onClick: () => void, label = 'Ver Detalles'): ActionItem {
	return {
		id: 'view-details',
		label,
		icon: EyeOutline,
		onClick,
		color: 'default'
	};
}

// ============================================
// Helper to filter null actions
// ============================================

/**
 * Filters out null/undefined actions and those with show: false
 */
export function filterActions(actions: (ActionItem | null | undefined)[]): ActionItem[] {
	return actions.filter((action): action is ActionItem => {
		if (!action) return false;
		if (action.show === false) return false;
		return true;
	});
}

/**
 * Creates a divider marker (empty action with dividerBefore)
 * Use this to add visual separation between action groups
 */
export function createDivider(): ActionItem {
	return {
		id: 'divider-' + Math.random().toString(36).substr(2, 9),
		label: '',
		show: false, // Hidden, but dividerBefore on next item handles it
		dividerBefore: true
	};
}
