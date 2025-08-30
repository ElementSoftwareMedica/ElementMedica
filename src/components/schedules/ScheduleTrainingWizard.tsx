import React, { useState, useEffect } from 'react';
import AsyncSelect from 'react-select/async';
import { apiGet } from '../../api/api';

const deliveryModes = [
  { value: 'in-person', label: 'In presenza' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Ibrido' },
];

interface CourseOption {
  value: string;
  label: string;
  certifications: string[];
}

interface TrainerOption {
  value: string;
  label: string;
  certifications: string[];
}

const ScheduleTrainingWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    course: null as CourseOption | null,
    trainer: null as TrainerOption | null,
    coTrainer: null as TrainerOption | null,
    requiredCerts: [] as string[],
    dates: [{ date: '', start: '', end: '' }],
    location: '',
    deliveryMode: '',
    notes: '',
    companies: [] as string[],
    persons: [] as string[],
  });
  const [companiesList, setCompaniesList] = useState<Array<{id: string; name: string; employees_count?: number; industry?: string}>>([]);
  const [personsList, setPersonsList] = useState<Array<{id: string; firstName: string; lastName: string; email?: string; company?: {name: string}}>>([]);
  const [personSearch, setPersonSearch] = useState('');

  // Load courses from backend
  const loadCourses = async (inputValue: string) => {
    interface CourseResponse {
      id: string;
      title: string;
      certifications?: string;
    }
    const data = await apiGet(`/courses?search=${encodeURIComponent(inputValue)}`) as CourseResponse[];
    return data.map((course: CourseResponse) => ({
      value: course.id,
      label: course.title,
      certifications: course.certifications ? course.certifications.split(',').map((c: string) => c.trim()) : [],
    })) as CourseOption[];
  };

  // Load trainers from backend, filter by certifications if needed
  const loadTrainers = async (inputValue: string) => {
    interface TrainerResponse {
      id: string;
      firstName: string;
      lastName: string;
      certifications?: string[];
    }
    const data = await apiGet(`/trainers?search=${encodeURIComponent(inputValue)}`) as TrainerResponse[];
    if (form.course && form.course.certifications && form.course.certifications.length > 0) {
      return data
        .filter((trainer: TrainerResponse) => Array.isArray(trainer.certifications) && form.course!.certifications.every((cert: string) => trainer.certifications!.includes(cert)))
        .map((trainer: TrainerResponse) => ({
          value: trainer.id,
          label: `${trainer.firstName} ${trainer.lastName}`,
          certifications: trainer.certifications || [],
        })) as TrainerOption[];
    }
    return data.map((trainer: TrainerResponse) => ({
      value: trainer.id,
      label: `${trainer.firstName} ${trainer.lastName}`,
      certifications: trainer.certifications,
    })) as TrainerOption[];
  };

  // When course changes, update requiredCerts
  useEffect(() => {
    if (form.course && form.course.certifications) {
      setForm(f => ({ ...f, requiredCerts: form.course!.certifications }));
    } else {
      setForm(f => ({ ...f, requiredCerts: [] }));
    }
    // Reset trainer if course changes
    setForm(f => ({ ...f, trainer: null }));
  }, [form.course]);

  useEffect(() => {
    if (step === 2 && companiesList.length === 0) {
      apiGet('/companies')
        .then((data: unknown) => {
          const companies = data as { id: string; name: string; employees_count?: number; industry?: string; }[];
          setCompaniesList(companies);
        })
        .catch(console.error);
    }
  }, [step, companiesList.length]);

  useEffect(() => {
    if (step === 3 && form.companies.length > 0) {
      apiGet(`/api/v1/persons?companyIds=${form.companies.join(',')}&roleType=EMPLOYEE`)
        .then((response: unknown) => {
          const data = response as { persons?: { id: string; firstName: string; lastName: string; email?: string; company?: { name: string; }; }[] };
          setPersonsList(data.persons || []);
        })
        .catch(console.error);
    }
  }, [step, form.companies]);

  const filteredPersons = personsList.filter((person: { id: string; firstName: string; lastName: string; email?: string; company?: { name: string; }; }) =>
    personSearch === '' ||
    person.firstName.toLowerCase().includes(personSearch.toLowerCase()) ||
    person.lastName.toLowerCase().includes(personSearch.toLowerCase()) ||
    person.email?.toLowerCase().includes(personSearch.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
      {/* Stepper */}
      <div className="flex justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 text-center">
            <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</div>
            <div className={`mt-2 text-sm font-medium ${step === s ? 'text-blue-600' : 'text-gray-500'}`}>{s === 1 ? 'Dettagli Evento' : s === 2 ? 'Aziende' : 'Persone'}</div>
          </div>
        ))}
      </div>

      {/* Step 1: Event Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo di Corso</label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadCourses}
              placeholder="Seleziona un corso"
              isClearable
              styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
              onChange={course => setForm(f => ({ ...f, course }))}
              value={form.course}
            />
          </div>
          {/* Required certifications (placeholder) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificazioni Richieste</label>
            <div className="flex flex-wrap gap-2">
              {/* Render requiredCerts as badges */}
              {form.requiredCerts.length === 0 ? <span className="text-gray-400">Nessuna</span> : form.requiredCerts.map((cert: string) => (
                <span key={cert} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">{cert}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Docente</label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadTrainers}
              placeholder="Seleziona un docente"
              isClearable
              styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
              onChange={trainer => setForm(f => ({ ...f, trainer }))}
              value={form.trainer}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Co-docente</label>
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={loadTrainers}
              placeholder="Seleziona un co-docente"
              isClearable
              styles={{ menu: base => ({ ...base, zIndex: 9999 }) }}
              onChange={coTrainer => setForm(f => ({ ...f, coTrainer }))}
              value={form.coTrainer}
            />
          </div>
          {/* Multi-date picker (placeholder) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date e Orari</label>
            {form.dates.map((d, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input type="date" className="border rounded px-2 py-1" value={d.date} onChange={e => setForm(f => { const dates = [...f.dates]; dates[i].date = e.target.value; return { ...f, dates }; })} />
                <input type="time" className="border rounded px-2 py-1" value={d.start} onChange={e => setForm(f => { const dates = [...f.dates]; dates[i].start = e.target.value; return { ...f, dates }; })} />
                <input type="time" className="border rounded px-2 py-1" value={d.end} onChange={e => setForm(f => { const dates = [...f.dates]; dates[i].end = e.target.value; return { ...f, dates }; })} />
                <button type="button" className="text-red-500" onClick={() => setForm(f => ({ ...f, dates: f.dates.filter((_, j) => j !== i) }))}>✕</button>
              </div>
            ))}
            <button type="button" className="text-blue-600 hover:underline text-sm" onClick={() => setForm(f => ({ ...f, dates: [...f.dates, { date: '', start: '', end: '' }] }))}>+ Aggiungi data</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Luogo</label>
            <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modalità di erogazione</label>
            <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value={form.deliveryMode} onChange={e => setForm(f => ({ ...f, deliveryMode: e.target.value }))}>
              <option value="">Seleziona modalità</option>
              {deliveryModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
      )}

      {/* Step 2: Companies */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Seleziona Aziende</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            {companiesList.length === 0 ? (
              <div className="text-gray-400">Nessuna azienda trovata.</div>
            ) : (
              companiesList.map(company => (
                <label key={company.id} className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.companies.includes(company.id)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        companies: e.target.checked
                          ? [...f.companies, company.id]
                          : f.companies.filter((id: string) => id !== company.id)
                      }));
                    }}
                  />
                  <div>
                    <div className="font-medium text-gray-800">{company.name}</div>
                    <div className="text-xs text-gray-500">
                      {company.employees_count || 0} persone
                      {company.industry && ` · ${company.industry}`}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 3: Persons */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Seleziona Persone</h2>
          <input
            type="text"
            placeholder="Cerca persone..."
            className="mb-3 w-full border rounded px-3 py-2"
            value={personSearch}
            onChange={e => setPersonSearch(e.target.value)}
          />
          <button
            type="button"
            className="mb-2 px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm"
            onClick={() => setForm(f => ({ ...f, persons: filteredPersons.map((person: { id: string; firstName: string; lastName: string; email?: string; company?: { name: string; }; }) => person.id) }))}
          >
            Seleziona Tutti
          </button>
          <div className="bg-gray-50 rounded-lg p-4 max-h-72 overflow-y-auto">
            {filteredPersons.length === 0 ? (
              <div className="text-gray-400">Nessuna persona trovata.</div>
            ) : (
              filteredPersons.map(person => (
                <label key={person.id} className="flex items-center gap-3 py-2 border-b last:border-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.persons.includes(person.id)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        persons: e.target.checked
                          ? [...f.persons, person.id]
                          : f.persons.filter((id: string) => id !== person.id)
                      }));
                    }}
                  />
                  <div>
                    <div className="font-medium text-gray-800">{person.firstName} {person.lastName}</div>
                    <div className="text-xs text-gray-500">{person.email}</div>
                    <div className="text-xs text-gray-400">{person.company?.name}</div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step navigation */}
      <div className="flex justify-between mt-8">
        {step > 1 ? <button className="px-4 py-2 rounded border" onClick={() => setStep(s => s - 1)}>Indietro</button> : <span />}
        {step < 3 ? <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setStep(s => s + 1)}>Avanti</button> : <button className="px-4 py-2 rounded bg-blue-600 text-white">Conferma</button>}
      </div>
    </div>
  );
};

export default ScheduleTrainingWizard;