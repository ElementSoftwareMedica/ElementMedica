import { lazy } from 'react';

const FormazioneImpostazioniPageLazy = lazy(
    () => import('./FormazioneImpostazioniPage')
);

export default FormazioneImpostazioniPageLazy;
