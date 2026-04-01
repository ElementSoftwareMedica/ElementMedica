/**
 * P65 - Signature Components Module
 * 
 * Componenti per firma digitale grafometrica.
 * 
 * @module components/signature
 */

export { SignaturePad } from './SignaturePad';
export type {
    SignaturePadProps,
    SignaturePadRef,
    SignatureData,
    SignaturePoint,
    BiometricData
} from './SignaturePad';

export { SignatureModal } from './SignatureModal';
export type {
    SignatureModalProps,
    SignatureResult
} from './SignatureModal';

export { SignaturePreferencesConfig } from './SignaturePreferencesConfig';
