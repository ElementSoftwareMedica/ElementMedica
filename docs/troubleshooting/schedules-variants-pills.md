# Schedules: Pillole rischio/tipo non visibili per macrocorsi multi-variante

Sintomo:
- In ScheduleEventModal, selezionando macrocorsi con più varianti (es. "Primo Soccorso"), le sezioni "Livello di Rischio" e "Tipo di Corso" mostrano "Non applicabile" e non compaiono pillole.

Causa:
- Un return anticipato in useCourseVariants impediva il fetch remoto delle varianti quando venivano trovate più varianti localmente, lasciando le varianti senza campi arricchiti (riskLevel/courseType).

Soluzione:
- Rimosso l'early return in `src/components/schedules/hooks/useCourseVariants.ts` per eseguire sempre il fetch remoto e arricchire i dati delle varianti.
- Aggiunto test E2E dedicato che mocka multi-varianti per "Primo Soccorso" e verifica la presenza delle pillole.

Verifica:
- Avviare il dev server, aprire Pianificazioni, selezionare un macrocorsi multi-variante e verificare la comparsa delle pillole.

Note GDPR/Qualità:
- Nessuna credenziale o dato sensibile in log o codice.
- Modifica aderente all’architettura modulare e testabile.