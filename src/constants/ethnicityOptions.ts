export const ETHNICITY_OPTIONS = [
    { value: '', label: 'Non indicata' },
    { value: 'CAUCASICA_EUROPEA', label: 'Caucasica / europea' },
    { value: 'AFRICANA_AFRODISCENDENTE', label: 'Africana / afro-discendente' },
    { value: 'NORD_EST_ASIATICA', label: 'Nord-est asiatica' },
    { value: 'SUD_EST_ASIATICA', label: 'Sud-est asiatica' },
    { value: 'SUD_ASIATICA', label: 'Sud asiatica' },
    { value: 'MEDIORIENTALE_NORDAFRICANA', label: 'Mediorientale / nord-africana' },
    { value: 'LATINO_AMERICANA', label: 'Latino-americana' },
    { value: 'MISTA_ALTRO', label: 'Mista / altra' },
    { value: 'NON_DICHIARATA', label: 'Preferisce non dichiarare' },
] as const;

export const DEFAULT_ETHNICITY = 'CAUCASICA_EUROPEA';

export const getEthnicityLabel = (value?: string | null) =>
    ETHNICITY_OPTIONS.find(option => option.value === value)?.label || value || '';
