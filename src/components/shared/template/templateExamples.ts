export const TEMPLATE_EXAMPLES = {
  attestato: `
<div style="text-align: center;">
  <h1>Attestato di Partecipazione</h1>
  <h2>ATTESTATO</h2>
  <p>Si certifica che</p>
  <h3>{{person.fullName}}</h3>
  <p>ha partecipato con successo al corso</p>
  <h3>"{{course.title}}"</h3>
  <p>della durata di {{course.duration}} ore</p>
  <p>svoltosi dal {{schedule.startDate}} al {{schedule.endDate}}</p>
  
  <div style="margin-top: 40px;">
    <p>{{current.date}}</p>
    <p>Firma del Responsabile</p>
    <p>_______________________</p>
  </div>
</div>`,

  lettera_incarico: `
<div>
  <h1>Lettera di Incarico</h1>
  
  <p>Spett.le {{trainer.firstName}} {{trainer.lastName}}<br>

  <p><strong>Oggetto: Incarico per attività di docenza</strong></p>

  <p>Con la presente si conferisce a {{trainer.fullName}} l'incarico di svolgere attività di docenza per il corso "{{course.title}}" da tenersi presso {{schedule.location}}.</p>

  <p>L'incarico prevede lo svolgimento delle seguenti attività:</p>
  <ul>
    <li>Predisposizione del materiale didattico</li>
    <li>Svolgimento delle lezioni frontali</li>
    <li>Valutazione dei partecipanti</li>
  </ul>

  <p><strong>Periodo di svolgimento:</strong> dal {{schedule.startDate}} al {{schedule.endDate}}<br>
  <strong>Ore di docenza:</strong> {{trainer.totalHours}}<br>
  <strong>Compenso:</strong> {{trainer.totalCompensation|currency:€}}</p>

  <p>Cordiali saluti,</p>

  <p>{{current.date}}</p>

  <p>Il Responsabile<br>
  _______________________</p>
</div>`,

  registro_presenze: `
<div>
  <h1>Registro Presenze</h1>
  
  <div style="text-align: center;">
    <h2>REGISTRO PRESENZE</h2>
    <h3>Corso: "{{course.title}}"</h3>
  </div>

  <p><strong>Data:</strong> {{session.date}}<br>
  <strong>Orario:</strong> dalle {{session.startTime}} alle {{session.endTime}}<br>
  <strong>Docente:</strong> {{trainer.fullName}}<br>
  <strong>Sede:</strong> {{schedule.location}}</p>

  <h2>Elenco Partecipanti</h2>

  {{{table.sessionAttendance}}}
</div>`,

  documento: `
<div class="documento">
  <h1>Documento di Testo</h1>
  
  <h2>Introduzione</h2>
  <p>Questo è un modello di documento di testo. Modifica questo contenuto in base alle tue esigenze.</p>
  
  <h2>Sezione 1</h2>
  <p>Inserisci qui il contenuto della prima sezione.</p>
  
  <h2>Sezione 2</h2>
  <p>Inserisci qui il contenuto della seconda sezione.</p>
  
  <h3>Sottosezione 2.1</h3>
  <p>Puoi aggiungere sottosezioni se necessario.</p>
  
  <h2>Conclusioni</h2>
  <p>Riassumi qui i punti principali del documento.</p>
  
  <p class="data">{{current.date}}</p>
  <p class="firma">Firma: _______________________</p>
</div>

<style>
  .documento {
    font-family: 'Arial', sans-serif;
    line-height: 1.5;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 30px;
  }
  h2 {
    color: #3498db;
    margin-top: 25px;
    margin-bottom: 15px;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
  }
  h3 {
    color: #2980b9;
    margin-top: 20px;
  }
  p {
    margin-bottom: 15px;
  }
  .data {
    margin-top: 40px;
    text-align: right;
    font-style: italic;
  }
  .firma {
    margin-top: 20px;
    text-align: right;
  }
</style>`
};