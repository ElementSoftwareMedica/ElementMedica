-- P65: Cleanup Legacy - Rimuove tabella ValoreCampoVisita non utilizzata
-- La tabella non è mai stata usata in produzione, i dati visita sono in Visita.datiStrutturati

-- Rimuovi la tabella legacy ValoreCampoVisita
DROP TABLE IF EXISTS "valori_campi_visita";

-- Nota: TemplateCampoVisita viene mantenuto perché usato dal catalogo prestazioni
-- I campi legacy su Visita (anamnesi, esamiObiettivo, etc.) vengono mantenuti per retrocompatibilità
-- ma non sono più la fonte primaria per export CDA (usa datiStrutturati + HL7 tags)
