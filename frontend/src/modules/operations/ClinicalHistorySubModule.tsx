import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Calendar,
  User,
  Stethoscope,
  Scissors,
  FileText,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  CreditCard,
  Pill,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Activity,
  Filter,
  Download,
} from 'lucide-react';
import api from '../../services/api';
import { Patient, VisitHistoryRecord, Procedure, ClinicalNote } from '../../types';
import { PatientSearchSelect } from '../../components/PatientSearchSelect';

interface ClinicalHistorySubModuleProps {
  initialPatient?: Patient | null;
  onNavigateToExamination?: (patient: Patient) => void;
  onNavigateToProcedure?: (patient: Patient) => void;
}

export const ClinicalHistorySubModule: React.FC<ClinicalHistorySubModuleProps> = ({
  initialPatient = null,
  onNavigateToExamination,
  onNavigateToProcedure,
}) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient);
  const [visits, setVisits] = useState<VisitHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Selected visit for full dossier modal
  const [activeDossierVisit, setActiveDossierVisit] = useState<VisitHistoryRecord | null>(null);

  // Expanded visit cards
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});

  const toggleVisitExpand = (id: string) => {
    setExpandedVisits((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchHistory = async (patientId?: string) => {
    setLoading(true);
    try {
      const url = patientId ? `/procedures/history?patientId=${patientId}` : '/procedures/history';
      const res = await api.get(url);
      if (res.data.success) {
        setVisits(res.data.visits || []);
        // Expand first visit by default if available
        if (res.data.visits?.length > 0) {
          setExpandedVisits({ [res.data.visits[0].id]: true });
        }
      }
    } catch (err) {
      console.error('Error fetching clinical history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(selectedPatient?.id);
  }, [selectedPatient]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalConsultations = 0;
    let totalProcedures = 0;
    let totalInvoicedFee = 0;

    visits.forEach((v) => {
      totalConsultations += v.clinicalNotes?.length || 0;
      totalProcedures += v.procedures?.length || 0;
      v.procedures?.forEach((p) => {
        if (p.operationInvoice) {
          totalInvoicedFee += p.operationInvoice.totalAmount;
        }
      });
    });

    return {
      totalVisits: visits.length,
      totalConsultations,
      totalProcedures,
      totalInvoicedFee,
    };
  }, [visits]);

  // Filtered visits based on date or keyword
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const matchesDate = !filterDate || v.visitDate === filterDate;
      const q = searchKeyword.toLowerCase().trim();
      const matchesKeyword =
        !q ||
        v.patient?.name.toLowerCase().includes(q) ||
        v.patient?.patientCode.toLowerCase().includes(q) ||
        v.consultingDoctors.some((d) => d.name.toLowerCase().includes(q)) ||
        v.procedures.some((p) => (p.procedureName || '').toLowerCase().includes(q)) ||
        v.clinicalNotes.some((cn) => cn.chiefComplaints.toLowerCase().includes(q) || cn.diagnosis.toLowerCase().includes(q));

      return matchesDate && matchesKeyword;
    });
  }, [visits, filterDate, searchKeyword]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Clinical & Treatment History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View comprehensive chronological records of patient consultations, doctor findings, recommendations, and performed procedures.
          </p>
        </div>

        {selectedPatient && onNavigateToExamination && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToExamination(selectedPatient)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>New Examination</span>
            </button>
            {onNavigateToProcedure && (
              <button
                type="button"
                onClick={() => onNavigateToProcedure(selectedPatient)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>New Procedure</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Patient Filter & Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Patient Selector */}
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Filter by Patient</span>
            </label>
            {selectedPatient && (
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Show All Patients
              </button>
            )}
          </div>
          <PatientSearchSelect
            selectedPatient={selectedPatient}
            onSelect={(p) => setSelectedPatient(p)}
          />
        </div>

        {/* Quick Date Filter & Search */}
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Doctor, complaint, procedure..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="w-44">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Visit Date</label>
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const headers = ['Visit Date', 'Patient Name', 'Patient ID', 'Doctors', 'Chief Complaints', 'Diagnosis', 'Procedures', 'Total Fee (INR)'];
              const rows = filteredVisits.map((v) => {
                const note = v.clinicalNotes?.[0] || (v as any).patientPrimaryNote;
                const procNames = (v.procedures || []).map((p: any) => `${p.procedureName} (₹${p.charges})`).join('; ');
                const totalFee = (v.procedures || []).reduce((s: number, p: any) => s + (p.charges || 0), 0);
                return [
                  v.visitDate || '',
                  v.patient?.name || '',
                  v.patient?.patientCode || '',
                  (v.consultingDoctors || []).map((d: any) => d.name).join(', '),
                  note?.chiefComplaints || '',
                  note?.diagnosis || '',
                  procNames || 'None',
                  String(totalFee),
                ];
              });
              const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Clinical-History-${filterDate || 'All-Dates'}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="mt-5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            title="Download clinical history as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clinical Visits</div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.totalVisits}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consultations / Notes</div>
          <div className="text-xl font-black text-blue-700 mt-1">{metrics.totalConsultations}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Procedures Performed</div>
          <div className="text-xl font-black text-teal-700 mt-1">{metrics.totalProcedures}</div>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoiced Total</div>
          <div className="text-xl font-black text-emerald-700 mt-1">₹{metrics.totalInvoicedFee.toLocaleString()}</div>
        </div>
      </div>

      {/* Chronological Visits Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading clinical history records...
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">No clinical history records found for the current selection.</p>
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const isExpanded = !!expandedVisits[visit.id];
            const primaryNote = visit.clinicalNotes[0] || (visit as any).patientPrimaryNote || ((visit.procedures.find((p: any) => p.clinicalNote) as any)?.clinicalNote);
            const isNoteLinked = visit.clinicalNotes.length === 0 && !!primaryNote;
            const primaryDoctor = visit.consultingDoctors[0]?.name || primaryNote?.doctor?.user?.fullName || 'Attending Doctor';

            return (
              <div
                key={visit.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition"
              >
                {/* Visit Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900">
                        Visit Date: {new Date(visit.visitDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{visit.patient?.name}</span>
                      <span className="font-mono text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {visit.patient?.patientCode}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-medium">
                        Dr. {primaryDoctor.replace(/^Dr\.?\s*/i, '')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {visit.procedures.length} {visit.procedures.length === 1 ? 'Procedure' : 'Procedures'}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">
                      {visit.clinicalNotes.length > 0 ? visit.clinicalNotes.length : (primaryNote ? 1 : 0)}{' '}
                      {visit.clinicalNotes.length === 1 || (!visit.clinicalNotes.length && primaryNote) ? 'Examination' : 'Examinations'}
                      {isNoteLinked && ' (Patient Profile)'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveDossierVisit(visit)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Full Dossier</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleVisitExpand(visit.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Visit Body */}
                {isExpanded && (
                  <div className="p-5 space-y-5">
                    {/* 1. Patient Complaints */}
                    <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>1. Patient Reported Complaints</span>
                        </h4>
                        {primaryNote?.durationOfComplaint && (
                          <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Duration: {primaryNote.durationOfComplaint}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {primaryNote ? (
                          primaryNote.chiefComplaints.split(',').map((c, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold"
                            >
                              {c.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No formal complaints logged.</span>
                        )}
                      </div>

                      {primaryNote?.patientDescription && (
                        <p className="text-xs text-slate-700 italic bg-white/80 p-2.5 rounded-lg border border-blue-100">
                          "{primaryNote.patientDescription}"
                        </p>
                      )}
                    </div>

                    {/* 2. Clinical Examination Findings */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                        <span>2. Clinical Examination Findings & Diagnosis</span>
                      </h4>

                      {primaryNote?.clinicalFindings && primaryNote.clinicalFindings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {primaryNote.clinicalFindings.map((f: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{f.finding}</span>
                                {f.severity && (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      f.severity === 'Severe'
                                        ? 'bg-rose-100 text-rose-800'
                                        : f.severity === 'Moderate'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {f.severity}
                                  </span>
                                )}
                              </div>
                              {f.toothNumber && (
                                <div className="text-[11px] font-semibold text-slate-600">
                                  Affected Area: <span className="font-mono text-slate-800">#{f.toothNumber}</span>
                                </div>
                              )}
                              {f.details && <p className="text-xs text-slate-600">{f.details}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                          <strong>Diagnosis:</strong> {primaryNote?.diagnosis || 'Routine Evaluation'}
                        </div>
                      )}
                    </div>

                    {/* 3. Recommended Treatments Plan */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>3. Recommended Treatments Plan</span>
                      </h4>

                      {primaryNote?.recommendedTreatments && primaryNote.recommendedTreatments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {primaryNote.recommendedTreatments.map((t: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-amber-900">{t.treatment}</span>
                                {t.priority && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800">
                                    {t.priority}
                                  </span>
                                )}
                              </div>
                              {t.advice && <p className="text-xs text-slate-700">{t.advice}</p>}
                              {t.plannedDate && (
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Planned Date: {new Date(t.plannedDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                          <strong>Recommendations:</strong>{' '}
                          {primaryNote?.treatmentRecommendations || 'None specifically logged.'}
                        </div>
                      )}
                    </div>

                    {/* 4. Procedures Actually Performed */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-blue-600" />
                          <span>4. Procedures Actually Performed ({visit.procedures.length})</span>
                        </h4>
                      </div>

                      {visit.procedures.length === 0 ? (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic">
                          No procedures recorded during this consultation visit.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-2.5 pl-3">Procedure Name</th>
                                <th className="p-2.5">Code</th>
                                <th className="p-2.5">Dentist</th>
                                <th className="p-2.5">Tooth #</th>
                                <th className="p-2.5">Fee</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5 pr-3">Billing Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {visit.procedures.map((proc) => (
                                <tr key={proc.id} className="hover:bg-slate-50/70">
                                  <td className="p-2.5 pl-3">
                                    <div className="font-bold text-slate-900">
                                      {proc.procedureName || proc.procedureMaster?.name || 'Procedure'}
                                    </div>
                                    {proc.clinicalNotes && (
                                      <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs">{proc.clinicalNotes}</div>
                                    )}
                                  </td>
                                  <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                                    {proc.procedureCode}
                                  </td>
                                  <td className="p-2.5 text-slate-700">
                                    {proc.doctor?.user?.fullName
                                      ? `Dr. ${proc.doctor.user.fullName}`
                                      : proc.dentistName || '—'}
                                  </td>
                                  <td className="p-2.5 font-mono">
                                    {proc.toothNumber ? `#${proc.toothNumber}` : '—'}
                                  </td>
                                  <td className="p-2.5 font-bold text-slate-800">₹{proc.charges}</td>
                                  <td className="p-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        proc.status === 'COMPLETED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {proc.status}
                                    </span>
                                  </td>
                                  <td className="p-2.5 pr-3">
                                    {proc.operationInvoice ? (
                                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                                        Invoiced ({proc.operationInvoice.paymentStatus})
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">Pending Billing</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* 5. Prescribed Medications (Clinical Notes Only) */}
                    {(() => {
                      const visitPrescribedMeds =
                        visit.prescribedMedications && visit.prescribedMedications.length > 0
                          ? visit.prescribedMedications
                          : (visit.procedures || [])
                              .flatMap((p: any) => p.prescribedMedications || [])
                              .filter(
                                (m: any, idx: number, arr: any[]) =>
                                  m &&
                                  m.name &&
                                  arr.findIndex(
                                    (x: any) =>
                                      x.name === m.name &&
                                      x.dosage === m.dosage &&
                                      x.frequency === m.frequency
                                  ) === idx
                              );

                      if (visitPrescribedMeds.length === 0) return null;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-emerald-600" />
                              <span>5. Prescribed Medications ({visitPrescribedMeds.length})</span>
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full normal-case">
                                Clinical Notes Only
                              </span>
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {visitPrescribedMeds.map((med: any, mIdx: number) => (
                              <div
                                key={mIdx}
                                className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-emerald-200/80 text-emerald-900 flex items-center justify-center text-[10px] font-bold">
                                      {mIdx + 1}
                                    </span>
                                    <span>{med.name}</span>
                                  </span>
                                  {med.dosage && (
                                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      {med.dosage}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                                  {med.frequency && (
                                    <div>
                                      <span className="text-slate-400">Freq:</span>{' '}
                                      <strong className="text-slate-700">{med.frequency}</strong>
                                    </div>
                                  )}
                                  {med.duration && (
                                    <div>
                                      <span className="text-slate-400">Duration:</span>{' '}
                                      <strong className="text-slate-700">{med.duration}</strong>
                                    </div>
                                  )}
                                  {med.instructions && (
                                    <div>
                                      <span className="text-slate-400">Instructions:</span>{' '}
                                      <strong className="text-slate-700">{med.instructions}</strong>
                                    </div>
                                  )}
                                </div>

                                {med.notes && (
                                  <p className="text-[11px] text-slate-500 italic bg-white/70 p-1.5 rounded-lg border border-emerald-100">
                                    Note: {med.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Prescriptions / Pharmacy Sales if any */}
                    {visit.prescriptions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-slate-500" />
                          <span>6. Dispensed Pharmacy Items & Sales</span>
                        </h4>
                        <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 text-xs space-y-1">
                          {visit.prescriptions.map((sale: any) => (
                            <div key={sale.id} className="flex items-center justify-between">
                              <span className="font-semibold text-emerald-900">
                                Invoice #{sale.invoiceNumber} (₹{sale.totalAmount})
                              </span>
                              <span className="text-[11px] text-emerald-700">
                                {sale.items?.length || 0} medicines dispensed
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FULL VISIT DOSSIER MODAL */}
      {activeDossierVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Clinical Visit Dossier
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  {activeDossierVisit.patient?.name} ({activeDossierVisit.patient?.patientCode})
                </h3>
                <div className="text-xs text-blue-100 flex items-center gap-2 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Visit Date: {new Date(activeDossierVisit.visitDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{activeDossierVisit.patient?.gender}, {activeDossierVisit.patient?.age} yrs</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDossierVisit(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Doctor Header */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-semibold">Consulting Clinician:</span>{' '}
                  <strong className="text-slate-900">
                    Dr. {activeDossierVisit.consultingDoctors[0]?.name || 'Attending Doctor'}
                  </strong>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {activeDossierVisit.consultingDoctors[0]?.specialization || 'DENTAL'}
                </span>
              </div>

              {/* Complaints */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">Chief Complaints</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">
                    {activeDossierVisit.clinicalNotes[0]?.chiefComplaints || 'Routine Evaluation'}
                  </div>
                  {activeDossierVisit.clinicalNotes[0]?.detailedMedicalHistory && (
                    <div className="text-slate-600 whitespace-pre-line text-[11px]">
                      {activeDossierVisit.clinicalNotes[0].detailedMedicalHistory}
                    </div>
                  )}
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">Clinical Examination Findings</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-slate-900 font-semibold">
                    {activeDossierVisit.clinicalNotes[0]?.diagnosis}
                  </div>
                  {activeDossierVisit.clinicalNotes[0]?.observations && (
                    <div className="text-slate-600 whitespace-pre-line text-[11px]">
                      {activeDossierVisit.clinicalNotes[0].observations}
                    </div>
                  )}
                </div>
              </div>

              {/* Treatments & Advice */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">
                  Recommended Treatment Plan & Advice
                </h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-slate-900 font-semibold">
                    {activeDossierVisit.clinicalNotes[0]?.treatmentRecommendations || 'None logged.'}
                  </div>
                  {activeDossierVisit.clinicalNotes[0]?.advice && (
                    <div className="text-slate-600 text-[11px]">
                      <strong>Advice:</strong> {activeDossierVisit.clinicalNotes[0].advice}
                    </div>
                  )}
                </div>
              </div>

              {/* Performed Procedures */}
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 uppercase tracking-wide">
                  Procedures Actually Performed ({activeDossierVisit.procedures.length})
                </h4>
                {activeDossierVisit.procedures.length === 0 ? (
                  <p className="text-slate-400 italic">No surgical or dental procedures performed during this visit.</p>
                ) : (
                  <div className="space-y-2">
                    {activeDossierVisit.procedures.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{p.procedureName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.procedureCode} {p.toothNumber ? `• Tooth #${p.toothNumber}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900">₹{p.charges}</div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prescribed Medications (Clinical Notes Only) in Dossier */}
              {(() => {
                const dossierMeds =
                  activeDossierVisit.prescribedMedications && activeDossierVisit.prescribedMedications.length > 0
                    ? activeDossierVisit.prescribedMedications
                    : (activeDossierVisit.procedures || [])
                        .flatMap((p: any) => p.prescribedMedications || [])
                        .filter(
                          (m: any, idx: number, arr: any[]) =>
                            m &&
                            m.name &&
                            arr.findIndex(
                              (x: any) =>
                                x.name === m.name &&
                                x.dosage === m.dosage &&
                                x.frequency === m.frequency
                            ) === idx
                        );

                if (dossierMeds.length === 0) return null;

                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Prescribed Medications ({dossierMeds.length})</span>
                      </h4>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Clinical Documentation Only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {dossierMeds.map((med: any, idx: number) => (
                        <div key={idx} className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            {med.dosage && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                {med.dosage}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {med.frequency && <span>Freq: {med.frequency} • </span>}
                            {med.duration && <span>Duration: {med.duration} • </span>}
                            {med.instructions && <span>Take: {med.instructions}</span>}
                          </div>
                          {med.notes && (
                            <p className="text-[11px] text-slate-500 italic bg-white/70 p-1.5 rounded border border-emerald-100">
                              {med.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveDossierVisit(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
