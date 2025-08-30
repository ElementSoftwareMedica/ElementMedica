export const TEMPLATE_EXAMPLES = {
  attestato: `
<div style="text-align: center;">
  <h1>Attestato di Partecipazione</h1>
  <h2>ATTESTATO</h2>
  <p>Si certifica che</p>
  <h3>{{dipendente_nome}} {{dipendente_cognome}}</h3>
  <p>ha partecipato con successo al corso</p>
  <h3>"{{corso_nome}}"</h3>
  <p>della durata di {{Ore corso}} ore</p>
  <p>svoltosi dal {{data_1}} al {{data_2}}</p>
  
  <div style="margin-top: 40px;">
    <p>{{data_generazione_template}}</p>
    <p>Firma del Responsabile</p>
    <p>_______________________</p>
  </div>
</div>`,

  lettera_incarico: `
<div>
  <h1>Lettera di Incarico</h1>
  
  <p>Spett.le {{formatore_nome}} {{formatore_cognome}}<br>
  {{formatore_indirizzo}}<br>
  {{formatore_cap}} {{formatore_citta}} ({{formatore_provincia}})</p>

  <p><strong>Oggetto: Incarico per attività di docenza</strong></p>

  <p>Con la presente si conferisce a {{formatore_nome}} {{formatore_cognome}}, nato/a a {{formatore_luogo_nascita}} il {{formatore_data_nascita}}, l'incarico di svolgere attività di docenza per il corso "{{corso_nome}}" da tenersi presso {{luogo}}.</p>

  <p>L'incarico prevede lo svolgimento delle seguenti attività:</p>
  <ul>
    <li>Predisposizione del materiale didattico</li>
    <li>Svolgimento delle lezioni frontali</li>
    <li>Valutazione dei partecipanti</li>
  </ul>

  <p><strong>Periodo di svolgimento:</strong> dal {{PRIMA_DATA}} al {{ULTIMA_DATA}}<br>
  <strong>Ore di docenza:</strong> {{ORE_TOTALI}}<br>
  <strong>Compenso:</strong> € {{COMPENSO_TOTALE}} (comprensivo di oneri fiscali e previdenziali)</p>

  <p>Cordiali saluti,</p>

  <p>{{data_generazione_template}}</p>

  <p>Il Responsabile<br>
  _______________________</p>
</div>`,

  registro_presenze: `
<div>
  <h1>Registro Presenze</h1>
  
  <div style="text-align: center;">
    <h2>REGISTRO PRESENZE</h2>
    <h3>Corso: "{{corso_nome}}"</h3>
  </div>

  <p><strong>Data:</strong> _______________<br>
  <strong>Orario:</strong> dalle ________ alle ________<br>
  <strong>Docente:</strong> {{formatore_nome}} {{formatore_cognome}}<br>
  <strong>Sede:</strong> {{luogo}}</p>

  <h2>Elenco Partecipanti</h2>

  <table border="1" style="width: 100%; border-collapse: collapse;">
    <tr>
      <th style="width: 5%; text-align: center;">N.</th>
      <th style="width: 40%;">Cognome e Nome</th>
      <th style="width: 25%;">Firma Entrata</th>
      <th style="width: 25%;">Firma Uscita</th>
    </tr>
    <tr><td style="text-align: center;">1</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">2</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">3</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">4</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">5</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">6</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">7</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">8</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">9</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">10</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">11</td><td></td><td></td><td></td></tr>
    <tr><td style="text-align: center;">12</td><td></td><td></td><td></td></tr>
  </table>

  <p style="margin-top: 30px;">Firma del docente: ______________________</p>
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
  
  <p class="data">{{data_generazione_template}}</p>
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