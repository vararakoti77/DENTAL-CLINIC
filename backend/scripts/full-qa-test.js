const API_BASE = process.env.API_BASE || 'http://localhost:8080/api';

async function req(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function runQA() {
  console.log('===============================================================');
  console.log('🧪 DENTAL CLINIC FULL SYSTEM QA TEST SUITE — AUTOMATED RUN');
  console.log('===============================================================');

  let adminToken = '';
  let doctorToken = '';
  let testPatientId = '';
  let testPatientCode = '';
  let todayAptId = '';
  let tomorrowAptId = '';
  let consultBillId = '';
  let procedureId = '';
  let opBillId = '';
  let medicineId = '';
  let batchId = '';
  let doctorId = '';

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ✓ ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ✗ ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // MODULE 1: AUTHENTICATION & ACCESS CONTROL
    // -------------------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & ACCESS CONTROL ---');
    
    // 1.1 Invalid login rejection
    const invalidLogin = await req('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'wrongpassword' },
    });
    assert(invalidLogin.status === 401 || invalidLogin.status === 400, 'Reject invalid password', `Status: ${invalidLogin.status}`);

    // 1.2 Admin login
    const adminLoginRes = await req('/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' },
    });
    adminToken = adminLoginRes.data.token || adminLoginRes.data.accessToken;
    assert(!!adminToken, 'Admin login (admin/admin123)', `Token received, Role: ${adminLoginRes.data.user?.role}`);

    const authHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 1.3 Doctor login
    const docLoginRes = await req('/auth/login', {
      method: 'POST',
      body: { username: 'dr.rajesh', password: 'doctor123' },
    });
    doctorToken = docLoginRes.data.token || docLoginRes.data.accessToken;
    assert(!!doctorToken, 'Doctor login (dr.rajesh/doctor123)', `Role: ${docLoginRes.data.user?.role}`);

    // Fetch doctors list to get Dr. Rajesh doctor ID
    const docsRes = await req('/reports/doctors', authHeaders);
    const doctorObj = docsRes.data.doctors?.[0];
    assert(!!doctorObj, 'Fetch active specialist doctors', `Found Dr. ${doctorObj?.user?.fullName}, fee: ₹${doctorObj?.consultationFee}`);
    doctorId = doctorObj?.id;

    // -------------------------------------------------------------
    // MODULE 2: PATIENT REGISTRATION & LOOKUP
    // -------------------------------------------------------------
    console.log('\n--- 2. PATIENT REGISTRATION & LOOKUP ---');
    const randomMobile = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
    const patientPayload = {
      name: 'QA Test Patient',
      mobile: randomMobile,
      gender: 'MALE',
      age: 29,
      email: 'qa.test@example.com',
      medicalAlerts: 'Penicillin allergy',
    };

    const patRes = await req('/patients', {
      method: 'POST',
      body: patientPayload,
      ...authHeaders,
    });
    assert(patRes.data.success, 'Register new patient with medical alerts', `Code: ${patRes.data.patient?.patientCode}`);
    testPatientId = patRes.data.patient.id;
    testPatientCode = patRes.data.patient.patientCode;

    // Search patient
    const searchRes = await req(`/patients?query=${testPatientCode}`, authHeaders);
    const foundPatient = (searchRes.data.patients || []).find((p) => p.id === testPatientId);
    assert(!!foundPatient, 'Search patient by unique code', `Found: ${foundPatient?.name} (${foundPatient?.mobile})`);

    // -------------------------------------------------------------
    // MODULE 3: APPOINTMENTS & SCHEDULING (DATE GUARDS & CONFLICTS)
    // -------------------------------------------------------------
    console.log('\n--- 3. APPOINTMENTS & SCHEDULING ---');
    const todayStr = new Date().toISOString().substring(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().substring(0, 10);

    // 3.0 Helper to find free slot
    const getFreeSlot = async (targetDate) => {
      const busyRes = await req(`/appointments/busy-slots?doctorId=${doctorId}&date=${targetDate}`, authHeaders);
      const busyList = (busyRes.data.busySlots || []).map((b) => {
        const d = new Date(b.startTime);
        return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
      });
      const candidates = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];
      for (const c of candidates) {
        if (!busyList.includes(c)) return c;
      }
      return `${Math.floor(Math.random() * 8) + 10}:15`;
    };

    // 3.1 Book Today's Consultation
    const todaySlot = await getFreeSlot(todayStr);
    const todayAptPayload = {
      patientId: testPatientId,
      doctorId,
      specialization: 'DENTAL',
      appointmentDate: todayStr,
      startTime: todaySlot,
      durationMinutes: 30,
      visitType: 'NEW_VISIT',
      procedureName: 'Toothache, Bleeding gums',
      reasonForVisit: 'Severe lower molar pain',
    };
    const aptTodayRes = await req('/appointments', {
      method: 'POST',
      body: todayAptPayload,
      ...authHeaders,
    });
    if (!aptTodayRes.data.success) console.log('aptTodayRes error:', aptTodayRes.status, aptTodayRes.data);
    assert(aptTodayRes.data.success, "Book Today's Consultation Appointment", `Code: ${aptTodayRes.data.appointment?.appointmentCode}, Status: ${aptTodayRes.data.appointment?.status}`);
    todayAptId = aptTodayRes.data.appointment?.id;

    // 3.2 Book Tomorrow's Procedure
    const tmrSlot = await getFreeSlot(tomorrowStr);
    const tmrAptPayload = {
      patientId: testPatientId,
      doctorId,
      specialization: 'DENTAL',
      appointmentDate: tomorrowStr,
      startTime: tmrSlot,
      durationMinutes: 30,
      visitType: 'PROCEDURE',
      procedureName: 'Dental Scaling',
      reasonForVisit: 'Full mouth scaling scheduled',
    };
    const aptTmrRes = await req('/appointments', {
      method: 'POST',
      body: tmrAptPayload,
      ...authHeaders,
    });
    if (!aptTmrRes.data.success) console.log('aptTmrRes error:', aptTmrRes.status, aptTmrRes.data);
    assert(aptTmrRes.data.success, "Book Tomorrow's Procedure Appointment", `Code: ${aptTmrRes.data.appointment?.appointmentCode}, Date: ${tomorrowStr}`);
    tomorrowAptId = aptTmrRes.data.appointment?.id;

    // 3.3 Status Transitions for Today's Visit: SCHEDULED -> IN_PROGRESS
    const startRes = await req(`/appointments/${todayAptId}/status`, {
      method: 'PATCH',
      body: { status: 'IN_PROGRESS' },
      ...authHeaders,
    });
    assert(startRes.data.appointment?.status === 'IN_PROGRESS', "Start visit (Mark IN_PROGRESS / In Chair)");

    // -------------------------------------------------------------
    // MODULE 4: CONSULTATION BILLING & DUPLICATE GUARDS
    // -------------------------------------------------------------
    console.log('\n--- 4. CONSULTATION BILLING & STRICT GUARDS ---');
    const consultBillPayload = {
      patientId: testPatientId,
      doctorId,
      appointmentId: todayAptId,
      consultationFee: doctorObj.consultationFee,
      discount: 0,
      taxRate: 0,
      paidAmount: doctorObj.consultationFee,
      paymentMode: 'CASH',
      notes: 'Initial consultation fee paid in full',
    };

    const billRes = await req('/billing/consultation', {
      method: 'POST',
      body: consultBillPayload,
      ...authHeaders,
    });
    assert(billRes.data.success, 'Generate consultation invoice and receipt', `Invoice: ${billRes.data.bill?.invoiceNumber}, Status: ${billRes.data.bill?.paymentStatus}`);
    consultBillId = billRes.data.bill.id;

    // Verify today's appointment auto-completed
    const checkTodayApt = await req('/appointments', authHeaders);
    const updatedTodayApt = (checkTodayApt.data.appointments || []).find((a) => a.id === todayAptId);
    assert(updatedTodayApt?.status === 'COMPLETED' && !!updatedTodayApt?.consultationBill, "Today's appointment auto-marked COMPLETED & linked to consultationBill");

    // 4.2 DUPLICATE CONSULTATION BILLING GUARD TEST:
    // Attempt to bill this patient again for consultation on the same date!
    const dupRes = await req('/billing/consultation', {
      method: 'POST',
      body: {
        patientId: testPatientId,
        doctorId,
        consultationFee: doctorObj.consultationFee,
        discount: 0,
        taxRate: 0,
        paidAmount: doctorObj.consultationFee,
        paymentMode: 'CASH',
      },
      ...authHeaders,
    });
    assert(
      dupRes.status === 400 && String(dupRes.data?.message || '').includes('already has a consultation bill for today'),
      'Duplicate Consultation Billing Guard',
      `Correctly rejected with 400: "${dupRes.data?.message}"`
    );

    // 4.3 DATE GUARD CHECK: Verify Tomorrow's Procedure Appointment was NOT touched!
    const checkTmrApt = (checkTodayApt.data.appointments || []).find((a) => a.id === tomorrowAptId);
    assert(checkTmrApt?.status === 'SCHEDULED', "DATE GUARD: Tomorrow's appointment remains strictly SCHEDULED (not completed by today's billing!)", `Status: ${checkTmrApt?.status}`);

    // -------------------------------------------------------------
    // MODULE 5: CLINICAL NOTES & DENTAL CHART
    // -------------------------------------------------------------
    console.log('\n--- 5. CLINICAL NOTES & DENTAL FINDINGS ---');
    const notePayload = {
      patientId: testPatientId,
      doctorId,
      appointmentId: todayAptId,
      chiefComplaints: 'Severe lower left molar pain on chewing',
      diagnosis: 'Irreversible Pulpitis tooth #36',
      treatmentPlan: 'Root Canal Treatment & PFM Crown',
      prescription: 'Amoxicillin 500mg TDS x 5 days, Paracetamol 650mg SOS',
      clinicalNotes: 'Cavitation noted on occlusal surface. Recommended RCT next session.',
      teethFindings: [
        { toothNumber: '36', condition: 'Caries' },
        { toothNumber: '11', condition: 'Sound' },
      ],
    };

    const noteRes = await req('/clinical-notes', {
      method: 'POST',
      body: notePayload,
      ...authHeaders,
    });
    assert(noteRes.data.success, 'Save Clinical Notes with Dental Findings & Prescription', `Note ID: ${noteRes.data.note?.id}`);

    // -------------------------------------------------------------
    // MODULE 6: PROCEDURES & MINOR OT OPERATIONS
    // -------------------------------------------------------------
    console.log('\n--- 6. PROCEDURES & MINOR OT OPERATIONS ---');
    const procPayload = {
      patientId: testPatientId,
      doctorId,
      procedureName: 'Dental Scaling',
      procedureDate: todayStr,
      toothNumber: 'All',
      charges: 800,
      clinicalNotes: 'Full mouth supra and subgingival scaling performed with ultrasonic scaler',
      status: 'PLANNED',
    };

    const procRes = await req('/procedures', {
      method: 'POST',
      body: procPayload,
      ...authHeaders,
    });
    assert(procRes.data.success, 'Plan/Schedule Procedure', `Code: ${procRes.data.procedure?.procedureCode}`);
    procedureId = procRes.data.procedure.id;

    // 6.2 Complete Procedure & Create Operation Bill
    const compProcRes = await req(`/procedures/${procedureId}/complete`, {
      method: 'POST',
      body: {
        consumablesFee: 200,
        discount: 0,
        taxRate: 0,
        paidAmount: 1000,
        paymentMode: 'UPI',
      },
      ...authHeaders,
    });
    if (!compProcRes.data.success) console.log('compProcRes error:', compProcRes.status, compProcRes.data);
    const opBill = compProcRes.data.operation?.bill;
    assert(compProcRes.data.success && !!opBill, 'Complete Procedure & Generate Operation Invoice', `Invoice: ${opBill?.invoiceNumber}, Total: ₹${opBill?.totalAmount}, Paid: ₹${opBill?.paidAmount}`);
    opBillId = opBill?.id;

    // 6.3 RE-VERIFY Tomorrow's Appointment is STILL SCHEDULED after procedure billing!
    const recheckApts = await req('/appointments', authHeaders);
    const tmrAptAfterProc = (recheckApts.data.appointments || []).find((a) => a.id === tomorrowAptId);
    assert(tmrAptAfterProc?.status === 'SCHEDULED', "DATE GUARD: Procedure billing strictly preserved Tomorrow's appointment as SCHEDULED", `Status: ${tmrAptAfterProc?.status}`);

    // -------------------------------------------------------------
    // MODULE 7: PHARMACY, INVENTORY & POS SALE
    // -------------------------------------------------------------
    console.log('\n--- 7. PHARMACY, INVENTORY & POS SALE ---');
    
    // 7.1 Add Medicine with Individual Pricing Structure
    const medPayload = {
      medicineName: `QA Test Antibiotic ${Date.now().toString().slice(-4)}`,
      brandName: 'TestCillin',
      packageInfo: 'Strip of 10 Tablets',
      buyingUnit: 'STRIP',
      sellingUnit: 'TABLET',
      unitRatio: 10,
      medicineType: 'TABLET',
      strength: '250mg',
      prescriptionType: 'SCHEDULE_H',
      reorderLevel: 20,
      gstRate: 12.0,
      specialization: 'DENTAL',
    };

    const medRes = await req('/pharmacy/medicines', {
      method: 'POST',
      body: medPayload,
      ...authHeaders,
    });
    assert(medRes.data.success, 'Create Medicine with GST & Unit Ratio', `Code: ${medRes.data.medicine?.itemCode}`);
    medicineId = medRes.data.medicine.id;

    // 7.2 Inward Batch Stock with Purchase & Sale Tax Breakdown
    // Buying Price: 150 before tax (12% GST)
    // Printed MRP: 180
    // Selling Price: 16.071 before tax (12% GST) -> Final Patient Price: 18.00 per unit (180/pack)
    const batchPayload = {
      batchNumber: `BATCH-QA-${Date.now().toString().slice(-4)}`,
      expiryDate: '2028-12-31',
      quantityUnits: 100, // 100 tablets
      purchasePrice: 15.0, // per unit
      mrp: 18.0, // per unit
      sellingPrice: 16.071, // per unit before tax
      gstRate: 12.0, // 12% sale GST
    };

    const stockRes = await req(`/pharmacy/medicines/${medicineId}/batches`, {
      method: 'POST',
      body: batchPayload,
      ...authHeaders,
    });
    assert(stockRes.data.success, 'Inward Batch Stock with Purchase & Sale Tax Rates', `Batch: ${batchPayload.batchNumber}, Units: ${stockRes.data.batch?.quantityInBase}`);
    batchId = stockRes.data.batch?.id;

    // 7.3 Pharmacy Sale (POS Billing)
    const saleItems = [
      {
        medicineId,
        batchStockId: batchId,
        quantity: 10, // 10 tablets
        unitPrice: 16.071,
        gstRate: 12.0,
      },
    ];

    const salePayload = {
      patientId: testPatientId,
      items: saleItems,
      discount: 0,
      paidAmount: 180.0,
      paymentMode: 'CASH',
    };

    const saleRes = await req('/pharmacy/sales', {
      method: 'POST',
      body: salePayload,
      ...authHeaders,
    });
    if (!saleRes.data.success) console.log('saleRes error:', saleRes.status, saleRes.data);
    assert(saleRes.data.success, 'Process Pharmacy POS Sale with Auto-Calculated Sale Tax', `Bill: ${saleRes.data.sale?.invoiceNumber}, Total: ₹${saleRes.data.sale?.grandTotal}, Pending: ₹${saleRes.data.sale?.pendingBalance}`);
    assert(saleRes.data.sale?.pendingBalance === 0, 'Pharmacy Zero Balance Paid Verification', 'Balance: ₹0.00');

    // -------------------------------------------------------------
    // MODULE 8: REPORTS & INVOICE SEARCH AUDIT
    // -------------------------------------------------------------
    console.log('\n--- 8. REPORTS & INVOICE SEARCH AUDIT ---');
    const reportRes = await req('/reports/analytics?period=day', authHeaders);
    assert(reportRes.data.success, 'Generate Daily Collection Report', `Total Revenue Collected: ₹${reportRes.data.summary?.totalRevenueCollected}`);

    // Verify Invoices list API
    const consultBillsList = await req('/billing/consultation', authHeaders);
    const patientBills = (consultBillsList.data.bills || []).filter((b) => b.patientId === testPatientId);
    assert(patientBills.length === 1, 'Verify Patient has strictly 1 Consultation Bill (No duplicates)', `Count: ${patientBills.length}`);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- 9. QA TEARDOWN & PRUNING ---');
    // Delete test patient
    await req(`/patients/${testPatientId}`, { method: 'DELETE', ...authHeaders }).catch(() => null);
    console.log('  [CLEANUP] Pruned QA test patient');

  } catch (criticalErr) {
    console.error('FATAL TEST ERROR:', criticalErr);
    failed++;
  }

  console.log('\n===============================================================');
  console.log(`📊 QA TEST SUMMARY: TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runQA();
