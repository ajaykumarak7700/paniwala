// ===== RENDER BOOKING LIST =====
function payStatus(b){
  if(b.remain<=0)return{label:'भुगतान पूर्ण',cls:'badge-paid',card:'paid'};
  if(b.paid>0)return{label:'आंशिक',cls:'badge-partial',card:'partial'};
  return{label:'बकाया',cls:'badge-unpaid',card:'unpaid'};
}

function bookingCardHTML(b){
  const st=payStatus(b);
  return`<div class="booking-card ${st.card}">
    <div class="card-header">
      <div><div class="card-name">👤 ${b.name}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">${b.slipNo} • ${fmtDate(b.bookingDate)}</div></div>
      <span class="card-badge ${st.cls}">${st.label}</span>
    </div>
    <div class="card-info">
      <span>📱 ${b.mobile}</span><span>🎉 ${b.eventType}</span>
      <span>📅 ${fmtDate(b.eventDate)}</span><span>🫙 ${b.jars} जार | 🍾 ${b.bottles||0} बोतल</span>
      <span>💧 ${b.water||0} ली.</span><span>💰 ₹${b.total}</span>
      <span>✅ ₹${b.paid}</span><span style="color:var(--red)">⏳ ₹${b.remain}</span>
    </div>
    <div class="card-actions">
      ${!b.isConfirmed ? `<button class="action-btn" onclick="confirmBooking('${b.id}')" style="background:var(--blue);color:#fff;flex:2">✅ गाड़ी कन्फर्म</button>` : (((b.jars - (b.jarsReturned||0) > 0) || (b.bottles - (b.bottlesReturned||0) > 0) || b.remain > 0) ? `<button class="action-btn" onclick="openSettlementModal('${b.id}')" style="background:var(--orange);color:#fff;flex:2">📦 हिसाब पूरा करें</button>` : `<span class="action-btn" style="background:#E8F5E9;color:#2E7D32;flex:2;cursor:default">✅ फ़ाइनल क्लोज्ड</span>`)}
      <button class="action-btn btn-pdf" onclick="generatePDF('${b.id}')">📄 PDF</button>
      <button class="action-btn btn-wa" onclick="shareWhatsApp('${b.id}')">💬 WA</button>
      <button class="action-btn btn-pay" onclick="openPayModal('${b.id}')">💰 भुगतान</button>
      <button class="action-btn btn-jar" onclick="openJarModal('${b.id}')">🫙 जार</button>
      <button class="action-btn btn-edit" onclick="editBooking('${b.id}')">✏️</button>
      <button class="action-btn btn-del" onclick="deleteBooking('${b.id}')">🗑️</button>
    </div>
  </div>`;
}

function emptyHTML(icon,msg){return`<div class="empty-state"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;}

function renderBookingList(){
  const q=(document.getElementById('searchBooking')?.value||'').toLowerCase();
  let list=[...DB.bookings];
  
  // Sort by eventDate Ascending (Earliest upcoming dates first)
  list.sort((a,b) => {
    if(a.eventDate !== b.eventDate) return a.eventDate.localeCompare(b.eventDate);
    return a.slipNo.localeCompare(b.slipNo);
  });

  if(q) {
    list=list.filter(b=>b.name.toLowerCase().includes(q)||b.mobile.includes(q)||b.eventDate.includes(q)||b.slipNo.toLowerCase().includes(q));
  }
  const el=document.getElementById('bookingList');
  if(el)el.innerHTML=list.length?list.map(bookingCardHTML).join(''):emptyHTML('📋','कोई बुकिंग नहीं');
}

// ===== DASHBOARD =====
function renderDashboard(){
  const t=today(),m=monthStr();
  const todayB=DB.bookings.filter(b=>b.bookingDate===t);
  const trashTodayB=(DB.trash||[]).filter(b=>b.bookingDate===t && b.isConfirmed); // only confirmed trash
  
  const upcoming=DB.bookings.filter(b=>b.eventDate>t).slice(0,5);
  
  const todayE=todayB.reduce((s,b)=>s+b.paid,0) + trashTodayB.reduce((s,b)=>s+b.paid,0);
  const pending=DB.bookings.reduce((s,b)=>s+b.remain,0);
  
  const todayExtra = (DB.extraIncome||[]).filter(i=>i.date===t).reduce((s,i)=>s+i.amount,0);
  const monthExtra = (DB.extraIncome||[]).filter(i=>i.date?.startsWith(m)).reduce((s,i)=>s+i.amount,0);

  const todayExp = (DB.extraExpense||[]).filter(e=>e.date===t).reduce((s,e)=>s+e.amount,0);
  const monthExp = (DB.extraExpense||[]).filter(e=>e.date?.startsWith(m)).reduce((s,e)=>s+e.amount,0);

  let monthE = 0;
  // Sum payments from active bookings
  DB.bookings.forEach(b => {
    if (b.payments) {
      b.payments.forEach(p => {
        if (p.date && p.date.startsWith(m)) monthE += p.amount;
      });
    }
  });
  // Sum payments from trash bookings (only if confirmed)
  (DB.trash||[]).forEach(b => {
    if (b.isConfirmed && b.payments) {
      b.payments.forEach(p => {
        if (p.date && p.date.startsWith(m)) monthE += p.amount;
      });
    }
  });
  const confirmedB = DB.bookings.filter(b => b.isConfirmed);
  const itemsOut=confirmedB.reduce((s,b)=>s+(b.jars-(b.jarsReturned||0))+(b.bottles-(b.bottlesReturned||0)),0);
  const pendingItems=confirmedB.filter(b=>(b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0).length;

  document.getElementById('statTodayBookings').textContent=todayB.length;
  document.getElementById('statTodayEarning').textContent='₹'+(todayE + todayExtra - todayExp);
  document.getElementById('statPending').textContent='₹'+pending;
  document.getElementById('statMonthEarning').textContent='₹'+(monthE + monthExtra - monthExp);
  document.getElementById('statTotalJars').textContent = DB.settings.totalJars || 0;
  document.getElementById('statTotalBottles').textContent = DB.settings.totalBottles || 0;
  document.getElementById('statJarsOut').textContent=itemsOut;
  document.getElementById('statPendingJars').textContent=pendingItems;

  const reminders=[];
  DB.bookings.forEach(b=>{
    // Only reminders for past event dates (Sata bitne ke baad ka bakaya)
    if(b.eventDate < t) {
      // 1. Money Pending
      if(b.remain > 0) {
        reminders.push({type:'pay', text:`💰 ₹${b.remain} बकाया: ${b.name}`, booking:b});
      }
      // 2. Items Pending
      if(b.isConfirmed && ((b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0)) {
        reminders.push({type:'item', text:`⚠️ सामान बाकी: ${b.name}`, booking:b});
      }
    }
  });

  const rbox=document.getElementById('reminderBox');
  const rlist=document.getElementById('reminderList');
  if(rbox && rlist) {
    if(reminders.length){
      rbox.style.display='block';
      rlist.innerHTML=reminders.slice(0,10).map(r=>{
        const b = r.booking;
        const msg = encodeURIComponent(buildWAMsg(b));
        
        // Calculate days passed since event
        const eventD = new Date(b.eventDate);
        const todayD = new Date(t);
        const diffTime = todayD - eventD;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const daysText = diffDays > 0 ? `${diffDays} दिन पहले` : 'आज ही';

        return `
        <div class="reminder-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff;border-radius:10px;margin-bottom:8px;box-shadow:0 2px 5px rgba(0,0,0,0.05);border-left:4px solid ${r.type==='pay'?'#C62828':'#FF9800'}">
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px">${r.text}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
              <span style="font-size:11px;color:#888;font-weight:600">🕒 ${daysText}</span>
              <span style="font-size:11px;color:#aaa">|</span>
              <span style="font-size:11px;color:#666">📱 ${b.mobile}</span>
            </div>
          </div>
          <div style="display:flex;gap:12px">
            <a href="tel:${b.mobile}" style="text-decoration:none;background:#E3F2FD;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:18px">📞</a>
            <a href="https://wa.me/91${b.mobile}?text=${msg}" target="_blank" style="text-decoration:none;background:#E8F5E9;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:18px">💬</a>
          </div>
        </div>`;
      }).join('');
    }else rbox.style.display='none';
  }

  initCalendar();

  // document.getElementById('upcomingList').innerHTML=upcoming.length?upcoming.map(bookingCardHTML).join(''):emptyHTML('📅','कोई आगामी बुकिंग नहीं');
  document.getElementById('todayList').innerHTML=todayB.length?todayB.map(bookingCardHTML).join(''):emptyHTML('🗓️','आज कोई बुकिंग नहीं');
  
  if(typeof renderCalendar === 'function') renderCalendar();
}

function renderFullStatement() {
  const history = [
    ...(DB.extraIncome || []).map(i => ({...i, type: 'income'})),
    ...(DB.extraExpense || []).map(e => ({...e, type: 'expense'}))
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Summary totals
  const totalInc = (DB.extraIncome||[]).reduce((s,i)=>s+i.amount,0);
  const totalExp = (DB.extraExpense||[]).reduce((s,e)=>s+e.amount,0);
  const salaryTotal = (DB.extraExpense||[]).filter(e=>e.category==='salary').reduce((s,e)=>s+e.amount,0);
  const commTotal = (DB.extraExpense||[]).filter(e=>e.category==='commission').reduce((s,e)=>s+e.amount,0);
  const otherExpTotal = (DB.extraExpense||[]).filter(e=>!e.category||e.category==='other').reduce((s,e)=>s+e.amount,0);

  const summaryHtml = `
    <div style="background:#fff;border-radius:14px;padding:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;color:#1565C0;margin-bottom:10px;border-bottom:2px solid #E3F2FD;padding-bottom:8px">📊 सारांश (Summary)</div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid #f0f0f0"><span>📈 कुल आय</span><span style="font-weight:700;color:#2E7D32">₹${totalInc}</span></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid #f0f0f0"><span>🚗 ड्राइवर सैलरी</span><span style="font-weight:700;color:#C62828">- ₹${salaryTotal}</span></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid #f0f0f0"><span>💼 ड्राइवर कमीशन</span><span style="font-weight:700;color:#C62828">- ₹${commTotal}</span></div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid #f0f0f0"><span>📋 अन्य खर्च</span><span style="font-weight:700;color:#C62828">- ₹${otherExpTotal}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:14px;font-weight:800"><span>💎 शुद्ध कुल</span><span style="color:${totalInc-totalExp>=0?'#2E7D32':'#C62828'}">₹${totalInc-totalExp}</span></div>
    </div>
  `;

  const catLabel = (item) => {
    if(item.type==='income') return '📈 अन्य आय';
    const labels = {salary:'🚗 सैलरी', commission:'💼 कमीशन', other:'📋 अन्य खर्च'};
    return labels[item.category] || '📉 खर्च';
  };

  const histEl = document.getElementById('fullFinanceHistory');
  if (histEl) {
    histEl.innerHTML = summaryHtml + (history.length ? history.map(item => `
      <div class="booking-card ${item.type === 'income' ? 'paid' : 'unpaid'}" style="padding:10px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:13px">${catLabel(item)}: <span style="font-size:14px">₹${item.amount}</span></div>
            <div style="font-size:11px;color:#666;margin-top:2px">${item.note || '-'}</div>
          </div>
          <div style="font-size:11px;font-weight:600;color:#888;text-align:right">${fmtDate(item.date)}</div>
        </div>
      </div>
    `).join('') : emptyHTML('📊', 'कोई लेनदेन नहीं'));
  }
}

// ===== EXTRA INCOME / EXPENSE =====
function openIncomeModal(){
  document.getElementById('incomeAmount').value='';
  document.getElementById('incomeNote').value='';
  document.getElementById('incomeDate').value=today();
  document.getElementById('incomeModal').style.display='flex';
}
function closeIncomeModal(e){if(e.target && e.target.id==='incomeModal')document.getElementById('incomeModal').style.display='none';}
function saveExtraIncome(){
  if (!checkPin()) return;
  try {
    const amt=parseFloat(document.getElementById('incomeAmount')?.value) || 0;
    const note=document.getElementById('incomeNote')?.value?.trim() || 'अन्य आय';
    const date=document.getElementById('incomeDate')?.value || today();
    if(amt<=0){showToast('कृपया सही राशि दर्ज करें');return;}
    if(!DB.extraIncome) DB.extraIncome=[];
    DB.extraIncome.push({id:uid(), date, amount:amt, note});
    save();
    document.getElementById('incomeModal').style.display='none';
    showToast('आय सेव हो गई ✅');
    renderDashboard();
  } catch (err) {
    console.error(err);
    showToast('आय सेव करने में त्रुटि: ' + err.message);
  }
}

// ===== EXPENSE MODAL STATE =====
let _expCurrentCategory = 'other';
let _expHistoryShown = 10;

const EXP_LABELS = {
  salary:     '🚗 ड्राइवर को दी गई सैलरी',
  commission: '💼 ड्राइवर को दिया गया कमीशन',
  other:      '📋 अन्य खर्च'
};
const EXP_COLORS = {
  salary:     { bg:'#E8F5E9', border:'#A5D6A7', col:'#2E7D32' },
  commission: { bg:'#FFF3E0', border:'#FFCC80', col:'#E65100' },
  other:      { bg:'#FFEBEE', border:'#EF9A9A', col:'#C62828' }
};

function openExpenseModal(){
  // Reset form
  document.getElementById('expenseAmount').value='';
  document.getElementById('expenseNote').value='';
  document.getElementById('expenseDate').value=today();
  // Show category chooser step
  document.getElementById('expCategoryStep').style.display='block';
  document.getElementById('expFormStep').style.display='none';
  document.getElementById('expenseModal').style.display='flex';
}

function selectExpenseCategory(cat){
  _expCurrentCategory = cat;
  _expHistoryShown = 10;
  // Update label
  document.getElementById('expCategoryLabel').textContent = EXP_LABELS[cat] || cat;
  // Update note placeholder
  const placeholders = {
    salary:     'सैलरी माह / विवरण (Optional)',
    commission: 'बुकिंग नं. / विवरण (Optional)',
    other:      'खर्च का कारण?'
  };
  document.getElementById('expenseNote').placeholder = placeholders[cat] || 'विवरण';
  // Switch step
  document.getElementById('expCategoryStep').style.display='none';
  document.getElementById('expFormStep').style.display='block';
  renderExpHistory();
}

function backToExpenseCategory(){
  document.getElementById('expCategoryStep').style.display='block';
  document.getElementById('expFormStep').style.display='none';
}

function renderExpHistory(){
  const allExp = DB.extraExpense || [];
  // Match entries: new ones have category field; old 'other' entries have no category
  const list = allExp.filter(e => {
    if (_expCurrentCategory === 'other') return !e.category || e.category === 'other';
    return e.category === _expCurrentCategory;
  });
  list.sort((a,b) => b.date.localeCompare(a.date));

  const c = EXP_COLORS[_expCurrentCategory] || EXP_COLORS.other;
  const total = list.length;
  const shown = list.slice(0, _expHistoryShown);

  // Update count badge
  const countEl = document.getElementById('expHistoryCount');
  if(countEl) countEl.textContent = total + ' खर्च';

  const el = document.getElementById('expHistoryList');
  if(!el) return;

  if(!shown.length){
    el.innerHTML = '<div style="text-align:center;padding:18px;color:#aaa;font-size:12px">📭 कोई पुराना रिकॉर्ड नहीं</div>';
    document.getElementById('expMoreBtn').style.display = 'none';
    return;
  }

  let totalShown = 0;
  shown.forEach(x => totalShown += x.amount);

  el.innerHTML = `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:12px;font-weight:700;color:${c.col}">दिखाया गया कुल:</span>
    <span style="font-size:14px;font-weight:800;color:${c.col}">₹${totalShown}</span>
  </div>` +
  shown.map(item => `
    <div style="background:#fff;border-radius:10px;padding:10px 12px;margin-bottom:8px;border-left:4px solid ${c.border};box-shadow:0 1px 4px rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center">
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px;color:${c.col}">₹${item.amount}</div>
        <div style="font-size:11px;color:#666;margin-top:2px">${item.note || '-'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#888;font-weight:600">${fmtDate(item.date)}</div>
      </div>
    </div>
  `).join('');

  document.getElementById('expMoreBtn').style.display = total > _expHistoryShown ? 'block' : 'none';
}

function loadMoreExpHistory(){
  _expHistoryShown += 10;
  renderExpHistory();
}

// ===== DRIVER WALLET =====
function openDriverWallet(){
  renderDriverWallet();
  document.getElementById('driverWalletModal').style.display='flex';
}

function renderDriverWallet(){
  const expenses = DB.extraExpense || [];
  const salaryList = expenses.filter(e => e.category === 'salary');
  const commList   = expenses.filter(e => e.category === 'commission');

  const totalSalary = salaryList.reduce((s,e) => s + e.amount, 0);
  const totalComm   = commList.reduce((s,e) => s + e.amount, 0);
  const totalPaid   = totalSalary + totalComm;

  document.getElementById('dwTotalSalary').textContent = '₹' + totalSalary;
  document.getElementById('dwTotalComm').textContent   = '₹' + totalComm;
  document.getElementById('dwTotalPaid').textContent   = '₹' + totalPaid;

  // Month-wise map
  const monthMap = {};
  [...salaryList, ...commList].forEach(e => {
    const m = (e.date || '').slice(0,7);
    if(!m) return;
    if(!monthMap[m]) monthMap[m] = { salary:0, commission:0, salaryItems:[], commItems:[] };
    if(e.category === 'salary'){
      monthMap[m].salary += e.amount;
      monthMap[m].salaryItems.push(e);
    } else {
      monthMap[m].commission += e.amount;
      monthMap[m].commItems.push(e);
    }
  });

  const sortedMonths = Object.keys(monthMap).sort((a,b) => b.localeCompare(a));

  const hindiMonths = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];

  const cntEl = document.getElementById('dwMonthCount');
  if(cntEl) cntEl.textContent = sortedMonths.length + ' महीने';

  const el = document.getElementById('dwMonthTable');
  if(!el) return;

  if(!sortedMonths.length){
    el.innerHTML = '<div style="text-align:center;padding:24px;color:#aaa;font-size:13px">📭 अभी तक कोई सैलरी/कमीशन दर्ज नहीं हुई<br><span style="font-size:11px;margin-top:6px;display:block">📉 अन्य खर्च जोड़ें से दर्ज करें</span></div>';
    return;
  }

  el.innerHTML = sortedMonths.map(mStr => {
    const [y, mo] = mStr.split('-');
    const mName = hindiMonths[parseInt(mo)-1] + ' ' + y;
    const d = monthMap[mStr];
    const total = d.salary + d.commission;

    // Build detail rows for salary items
    const salDetails = d.salaryItems.map(x =>
      `<div style="font-size:10px;color:#555;padding:2px 0;border-bottom:1px dotted #ddd">
        ${fmtDate(x.date)} — ${x.note || 'सैलरी'} — <b style="color:#2E7D32">₹${x.amount}</b>
      </div>`).join('');
    const commDetails = d.commItems.map(x =>
      `<div style="font-size:10px;color:#555;padding:2px 0;border-bottom:1px dotted #ddd">
        ${fmtDate(x.date)} — ${x.note || 'कमीशन'} — <b style="color:#E65100">₹${x.amount}</b>
      </div>`).join('');

    return `
    <div style="background:#fff;border-radius:14px;padding:14px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.08);border-left:4px solid #1565C0">
      <div style="font-weight:800;font-size:14px;color:#1565C0;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        <span>📅 ${mName}</span>
        <span style="background:#E3F2FD;padding:3px 10px;border-radius:20px;font-size:12px">₹${total}</span>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:1;background:#E8F5E9;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#2E7D32;font-weight:700">🚗 सैलरी</div>
          <div style="font-size:17px;font-weight:900;color:#2E7D32;margin-top:4px">₹${d.salary}</div>
        </div>
        <div style="flex:1;background:#FFF3E0;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#E65100;font-weight:700">💼 कमीशन</div>
          <div style="font-size:17px;font-weight:900;color:#E65100;margin-top:4px">₹${d.commission}</div>
        </div>
        <div style="flex:1;background:#E3F2FD;border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;color:#1565C0;font-weight:700">💰 कुल</div>
          <div style="font-size:17px;font-weight:900;color:#1565C0;margin-top:4px">₹${total}</div>
        </div>
      </div>
      ${salDetails || commDetails ? `
      <details style="margin-top:4px">
        <summary style="font-size:11px;color:#888;cursor:pointer;font-weight:600">📋 विस्तार देखें (${d.salaryItems.length + d.commItems.length} entries)</summary>
        <div style="margin-top:8px;padding:8px;background:#f8f9fc;border-radius:8px">
          ${salDetails}${commDetails}
        </div>
      </details>` : ''}
    </div>`;
  }).join('');
}

function closeExpenseModal(e){
  if(e.target && e.target.id==='expenseModal') document.getElementById('expenseModal').style.display='none';
}

function saveExtraExpense(){
  if (!checkPin()) return;
  try {
    const amt = parseFloat(document.getElementById('expenseAmount')?.value) || 0;
    const note = document.getElementById('expenseNote')?.value?.trim() || EXP_LABELS[_expCurrentCategory] || 'अन्य खर्च';
    const date = document.getElementById('expenseDate')?.value || today();
    if(amt <= 0){ showToast('कृपया सही राशि दर्ज करें'); return; }
    if(!DB.extraExpense) DB.extraExpense = [];
    DB.extraExpense.push({ id:uid(), date, amount:amt, note, category: _expCurrentCategory });
    save();
    // Clear form but stay open — show updated history
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
    document.getElementById('expenseDate').value = today();
    showToast('खर्च सेव हो गया 📉');
    renderDashboard();
    renderExpHistory(); // Refresh in-modal history
  } catch (err) {
    console.error(err);
    showToast('खर्च सेव करने में त्रुटि: ' + err.message);
  }
}

// ===== CALENDAR =====
let currentCalDate = new Date();
function renderCalendar() {
  const y = currentCalDate.getFullYear();
  const m = currentCalDate.getMonth();
  const months = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
  document.getElementById('calMonthYear').textContent = `${months[m]} ${y}`;
  
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = today();
  
  let html = '';
  for(let i=0; i<firstDay; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }
  
  for(let i=1; i<=daysInMonth; i++) {
    const dStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const bks = DB.bookings.filter(b => b.eventDate === dStr);
    
    let isToday = dStr === todayStr ? 'today' : '';
    let badgeHtml = '';
    
    if (bks.length > 0) {
      const isHeavy = bks.length >= 3;
      const cls = isHeavy ? 'heavy' : '';
      badgeHtml = `<div class="cal-badge ${cls}">${bks.length} साटा</div>`;
      isToday += ' has-booking' + (isHeavy ? ' heavy-box' : '');
    }
    
    html += `
      <div class="cal-cell ${isToday}" onclick="openCalDate('${dStr}')">
        <div class="cal-date">${i}</div>
        ${badgeHtml}
      </div>
    `;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function changeCalMonth(dir) {
  currentCalDate.setMonth(currentCalDate.getMonth() + dir);
  renderCalendar();
}

let touchStartX = 0;
function handleTouchStart(e) { 
  touchStartX = e.changedTouches[0].screenX; 
  const banner = document.querySelector('.calendar-banner');
  if(banner) banner.style.transition = 'none';
}
function handleTouchMove(e) {
  const touchCurrentX = e.changedTouches[0].screenX;
  const diff = touchCurrentX - touchStartX;
  const banner = document.querySelector('.calendar-banner');
  if(banner && Math.abs(diff) < 200) { // Limit drag distance
    banner.style.transform = `translateX(${diff}px)`;
  }
}
function handleTouchEnd(e) {
  const touchEndX = e.changedTouches[0].screenX;
  const diff = touchEndX - touchStartX;
  const banner = document.querySelector('.calendar-banner');
  if(!banner) return;
  
  banner.style.transition = 'transform 0.3s ease-out';
  banner.style.transform = 'translateX(0)';
  
  if (Math.abs(diff) > 80) { // Threshold for month change
    if (diff > 0) changeCalMonth(-1);
    else changeCalMonth(1);
  }
}

function openCalDate(dStr) {
  if (dStr < today()) {
    const bks = DB.bookings.filter(b => b.eventDate === dStr);
    if(bks.length === 0) {
      showToast('इस पुरानी तारीख पर कोई साटा नहीं है');
      return;
    }
    showPage('booking');
    switchTab('list', 'booking');
    document.getElementById('searchBooking').value = dStr;
    renderBookingList();
    window.scrollTo(0,0);
  } else {
    if(typeof clearForm === 'function') clearForm(); // Clear any old data first
    showPage('booking');
    switchTab('form', 'booking');
    document.getElementById('eventDate').value = dStr; // Set the clicked date
    if(typeof checkDateAvailability === 'function') checkDateAvailability(); // Check if other bookings exist on this day
    window.scrollTo(0,0);
  }
}

// ===== JARS AND BOTTLES =====
function renderJars(){
  // Jar Stats
  const jTotal=DB.settings.totalJars||0;
  const confirmedB_jars = DB.bookings.filter(b => b.isConfirmed);
  const jOut=confirmedB_jars.reduce((s,b)=>s+(b.jars||0),0);
  const jRet=confirmedB_jars.reduce((s,b)=>s+(b.jarsReturned||0),0);
  document.getElementById('jarTotal').textContent=jTotal;
  document.getElementById('jarOut').textContent=jOut;
  document.getElementById('jarReturned').textContent=jRet;
  document.getElementById('jarPending').textContent=jOut-jRet;
  document.getElementById('setTotalJars').value=jTotal;
  
  // Bottle Stats
  const bTotal=DB.settings.totalBottles||0;
  const confirmedB = DB.bookings.filter(b => b.isConfirmed);
  const bOut=confirmedB.reduce((s,b)=>s+(b.bottles||0),0);
  const bRet=confirmedB.reduce((s,b)=>s+(b.bottlesReturned||0),0);
  if(document.getElementById('bottleTotal')) document.getElementById('bottleTotal').textContent=bTotal;
  if(document.getElementById('bottleOut')) document.getElementById('bottleOut').textContent=bOut;
  if(document.getElementById('bottleReturned')) document.getElementById('bottleReturned').textContent=bRet;
  if(document.getElementById('bottlePending')) document.getElementById('bottlePending').textContent=bOut-bRet;
  if(document.getElementById('setTotalBottles')) document.getElementById('setTotalBottles').value=bTotal;

  // Track List
  const list=confirmedB.filter(b=>(b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0);
  const el=document.getElementById('jarTrackList');
  if(el) el.innerHTML=list.length?list.map(b=>
    `<div class="booking-card partial">
      <div class="card-header"><div class="card-name">👤 ${b.name}</div>
      <span class="card-badge badge-partial">बाकी: ${b.jars-(b.jarsReturned||0)} जार, ${b.bottles-(b.bottlesReturned||0)} बोतल</span></div>
      <div class="card-info"><span>📱 ${b.mobile}</span><span>📅 ${fmtDate(b.eventDate)}</span>
      <span>🫙 जार: ${b.jars} (वापस ${b.jarsReturned||0})</span><span>🍾 बोतल: ${b.bottles||0} (वापस ${b.bottlesReturned||0})</span></div>
      <div class="card-actions"><button class="action-btn btn-jar" onclick="openJarModal('${b.id}')">🫙/🍾 वापसी दर्ज करें</button></div>
    </div>`).join(''):emptyHTML('✅','सभी सामान वापस आ गए!');
}

function setTotalJars(){
  const v=parseInt(document.getElementById('setTotalJars').value);
  if(!v)return;
  DB.settings.totalJars=v;save();renderJars();showToast('जार स्टॉक सेट हो गया ✅');
}

function setTotalBottles(){
  const v=parseInt(document.getElementById('setTotalBottles').value);
  if(!v)return;
  DB.settings.totalBottles=v;save();renderJars();showToast('बोतल स्टॉक सेट हो गया ✅');
}

// ===== PAYMENTS =====
function renderPayments(){
  const q=(document.getElementById('searchPayment')?.value||'').toLowerCase();
  let list=[...DB.bookings];
  if(q)list=list.filter(b=>b.name.toLowerCase().includes(q)||b.mobile.includes(q));
  const pEl=document.getElementById('payList');
  const pdEl=document.getElementById('payPendingList');
  const paEl=document.getElementById('payPaidList');
  if(pEl)pEl.innerHTML=list.length?list.map(bookingCardHTML).join(''):emptyHTML('💰','कोई भुगतान नहीं');
  if(pdEl)pdEl.innerHTML=list.filter(b=>b.remain>0).map(bookingCardHTML).join('')||emptyHTML('✅','कोई बकाया नहीं');
  if(paEl)paEl.innerHTML=list.filter(b=>b.remain<=0).map(bookingCardHTML).join('')||emptyHTML('📋','कोई डेटा नहीं');
}

// ===== REPORTS =====
function renderDailyReport(){
  const d=document.getElementById('reportDate')?.value||today();
  const list=DB.bookings.filter(b=>b.bookingDate===d);
  const el=document.getElementById('dailyReport');
  if(!el)return;
  if(!list.length){el.innerHTML=emptyHTML('📊','इस तिथि पर कोई बुकिंग नहीं');return;}
  const total=list.reduce((s,b)=>s+b.total,0),paid=list.reduce((s,b)=>s+b.paid,0);
  el.innerHTML=`<div class="report-card">
    <div class="report-row"><span>📋 कुल बुकिंग</span><span>${list.length}</span></div>
    <div class="report-row"><span>💰 कुल राशि</span><span>₹${total}</span></div>
    <div class="report-row"><span>✅ प्राप्त</span><span>₹${paid}</span></div>
    <div class="report-row"><span>⏳ बकाया</span><span>₹${total-paid}</span></div>
    <div class="report-row"><span>🫙 जार</span><span>${list.reduce((s,b)=>s+b.jars,0)}</span></div>
  </div>`+list.map(bookingCardHTML).join('');
}

function renderMonthlyReport(){
  const m=document.getElementById('reportMonth')?.value||monthStr();
  const el=document.getElementById('monthlyReport');
  if(!el)return;

  // 1. Cash from Bookings (Payments made this month)
  let cashFromBookings = 0;
  DB.bookings.forEach(b => {
    if (b.payments) {
      b.payments.forEach(p => {
        if (p.date && p.date.startsWith(m)) cashFromBookings += p.amount;
      });
    }
  });

  // 2. Extra Income this month
  const extraInc = (DB.extraIncome||[]).filter(i=>i.date?.startsWith(m)).reduce((s,i)=>s+i.amount,0);
  
  // 3. Extra Expense this month
  const extraExp = (DB.extraExpense||[]).filter(e=>e.date?.startsWith(m)).reduce((s,e)=>s+e.amount,0);

  // 4. Bookings created this month (for context)
  const bookingsCreated = DB.bookings.filter(b=>b.bookingDate?.startsWith(m));
  const totalBookedAmount = bookingsCreated.reduce((s,b)=>s+b.total,0);

  const totalRevenue = cashFromBookings + extraInc;
  const netProfit = totalRevenue - extraExp;

  if (!totalRevenue && !extraExp && !bookingsCreated.length) {
    el.innerHTML = emptyHTML('📊', 'इस माह का कोई डेटा नहीं है');
    return;
  }

  el.innerHTML=`<div class="report-card">
    <div class="modal-title" style="font-size:16px;color:var(--blue);margin-bottom:12px;border-bottom:2px solid var(--blue-light);padding-bottom:8px">📊 ${m} का रिपोर्ट</div>
    
    <div class="report-row"><span>💵 बुकिंग से नकद प्राप्त</span><span>₹${cashFromBookings}</span></div>
    <div class="report-row"><span>📈 अन्य आय (Extra)</span><span>₹${extraInc}</span></div>
    <div class="report-row" style="border-bottom:1px solid #ddd;margin-bottom:8px;font-weight:700">
      <span>💰 कुल कमाई (Revenue)</span>
      <span style="color:var(--green)">₹${totalRevenue}</span>
    </div>
    
    <div class="report-row"><span>📉 अन्य खर्च (Expenses)</span><span style="color:var(--red)">- ₹${extraExp}</span></div>
    
    <div class="report-row" style="font-size:16px;background:var(--blue-light);padding:12px;border-radius:12px;margin-top:10px;border:none">
      <span style="font-weight:800">💎 शुद्ध लाभ (Profit)</span>
      <span style="font-weight:800;color:var(--blue)">₹${netProfit}</span>
    </div>

    <div style="margin-top:20px;padding:12px;background:#f9f9f9;border-radius:10px;border:1px dashed #ccc">
      <div style="font-size:11px;color:#666;font-weight:700;margin-bottom:5px;text-transform:uppercase">मासिक बुकिंग सारांश:</div>
      <div class="report-row" style="border:none;padding:2px 0;font-size:12px"><span>📋 कुल नई बुकिंग</span><span>${bookingsCreated.length}</span></div>
      <div class="report-row" style="border:none;padding:2px 0;font-size:12px"><span>🏢 कुल बुक राशि</span><span>₹${totalBookedAmount}</span></div>
    </div>
  </div>`;
}

function renderCustomerReport(){
  const q=(document.getElementById('searchCustomer')?.value||'').toLowerCase();
  const map={};
  DB.bookings.forEach(b=>{
    if(!map[b.mobile])map[b.mobile]={name:b.name,mobile:b.mobile,count:0,total:0,paid:0};
    map[b.mobile].count++;map[b.mobile].total+=b.total;map[b.mobile].paid+=b.paid;
  });
  let list=Object.values(map);
  if(q)list=list.filter(c=>c.name.toLowerCase().includes(q)||c.mobile.includes(q));
  const el=document.getElementById('customerReport');
  if(el)el.innerHTML=list.length?list.map(c=>
    `<div class="booking-card ${c.total===c.paid?'paid':'partial'}">
      <div class="card-name">👤 ${c.name}</div>
      <div class="card-info"><span>📱 ${c.mobile}</span><span>📋 ${c.count} बुकिंग</span>
      <span>💰 ₹${c.total}</span><span>⏳ ₹${c.total-c.paid} बाकी</span></div>
    </div>`).join(''):emptyHTML('👤','कोई ग्राहक नहीं');
}

function renderRangeReport(){
  const from = document.getElementById('rangeFrom')?.value;
  const to = document.getElementById('rangeTo')?.value;
  const el = document.getElementById('rangeReport');
  if(!el) return;
  if(!from || !to) { el.innerHTML = emptyHTML('📅', 'कृपया शुरुआत और अंत की तारीख चुनें'); return; }
  
  const list = DB.bookings.filter(b => b.bookingDate >= from && b.bookingDate <= to);
  if(!list.length){ el.innerHTML = emptyHTML('📊', 'इस अवधि में कोई बुकिंग नहीं मिली'); return; }
  
  const total = list.reduce((s,b)=>s+b.total,0);
  const paid = list.reduce((s,b)=>s+b.paid,0);
  
  el.innerHTML = `<div class="report-card">
    <div class="modal-title" style="font-size:15px;color:var(--blue);margin-bottom:12px;border-bottom:2px solid var(--blue-light);padding-bottom:8px">📊 ${fmtDate(from)} से ${fmtDate(to)} तक की रिपोर्ट</div>
    <div class="report-row"><span>📋 कुल बुकिंग</span><span>${list.length}</span></div>
    <div class="report-row"><span>💰 कुल राशि</span><span>₹${total}</span></div>
    <div class="report-row"><span>✅ प्राप्त राशि</span><span style="color:var(--green)">₹${paid}</span></div>
    <div class="report-row"><span>⏳ बकाया राशि</span><span style="color:var(--red)">₹${total-paid}</span></div>
    <div class="report-row"><span>🫙 कुल जार</span><span>${list.reduce((s,b)=>s+b.jars,0)}</span></div>
    <div class="report-row"><span>🍾 कुल बोतल</span><span>${list.reduce((s,b)=>s+(b.bottles||0),0)}</span></div>
  </div>` + list.map(bookingCardHTML).join('');
}

// MODALS are handled at the top
function openPayModal(id){document.getElementById('payBookingId').value=id;document.getElementById('payAmount').value='';document.getElementById('payModal').style.display='flex';}
function closePayModal(e){if(e.target.id==='payModal')document.getElementById('payModal').style.display='none';}
async function savePayment(){
  if (!checkPin()) return;
  const id=document.getElementById('payBookingId').value;
  const amt=parseFloat(document.getElementById('payAmount').value);
  if(!amt||amt<=0){showToast('राशि दर्ज करें');return;}
  const idx=DB.bookings.findIndex(b=>b.id===id);if(idx<0)return;
  DB.bookings[idx].paid=(DB.bookings[idx].paid||0)+amt;
  DB.bookings[idx].remain=Math.max(0,DB.bookings[idx].total-DB.bookings[idx].paid);
  if(!DB.bookings[idx].payments)DB.bookings[idx].payments=[];
  DB.bookings[idx].payments.push({date:today(),amount:amt});
  await save();document.getElementById('payModal').style.display='none';
  showToast('भुगतान सेव हो गया ✅');renderPayments();renderDashboard();
}
function openJarModal(id){
  document.getElementById('jarBookingId').value=id;
  document.getElementById('jarsReturned').value='';
  document.getElementById('bottlesReturned').value='';
  document.getElementById('jarModal').style.display='flex';
}
function closeJarModal(e){if(e.target.id==='jarModal')document.getElementById('jarModal').style.display='none';}
function closeSuccessModal(e){if(e.target.id==='successModal')document.getElementById('successModal').style.display='none';}
async function saveJarReturn(){
  if (!checkPin()) return;
  const id=document.getElementById('jarBookingId').value;
  const jR=parseInt(document.getElementById('jarsReturned').value) || 0;
  const bR=parseInt(document.getElementById('bottlesReturned').value) || 0;
  if(jR <= 0 && bR <= 0){showToast('कम से कम एक संख्या दर्ज करें');return;}
  const idx=DB.bookings.findIndex(b=>b.id===id);if(idx<0)return;
  DB.bookings[idx].jarsReturned=Math.min(DB.bookings[idx].jars,(DB.bookings[idx].jarsReturned||0)+jR);
  DB.bookings[idx].bottlesReturned=Math.min(DB.bookings[idx].bottles||0,(DB.bookings[idx].bottlesReturned||0)+bR);
  await save();document.getElementById('jarModal').style.display='none';
  showToast('वापसी दर्ज हो गई ✅');renderJars();renderDashboard();
}

function openSellModal(){
  document.getElementById('sellJars').value='';
  document.getElementById('sellBottles').value='';
  document.getElementById('sellAmount').value='';
  document.getElementById('sellNote').value='';
  document.getElementById('sellModal').style.display='flex';
}
function closeSellModal(e){if(e.target.id==='sellModal')document.getElementById('sellModal').style.display='none';}
async function saveSell(){
  if (!checkPin()) return;
  const sJ=parseInt(document.getElementById('sellJars').value) || 0;
  const sB=parseInt(document.getElementById('sellBottles').value) || 0;
  const amt=parseFloat(document.getElementById('sellAmount').value) || 0;
  const note=document.getElementById('sellNote').value.trim() || 'जार/बोतल बिक्री';
  
  if(sJ <= 0 && sB <= 0){showToast('कम से कम एक जार या बोतल दर्ज करें');return;}
  
  // Decrease stock globally
  if(sJ > 0) DB.settings.totalJars = Math.max(0, DB.settings.totalJars - sJ);
  if(sB > 0) DB.settings.totalBottles = Math.max(0, DB.settings.totalBottles - sB);
  
  // Add Income if amount > 0
  if(amt > 0) {
    if(!DB.extraIncome) DB.extraIncome = [];
    DB.extraIncome.push({ id:uid(), date:today(), amount:amt, note:note });
  }
  
  await save();
  document.getElementById('sellModal').style.display='none';
  showToast('बिक्री सेव हो गई ✅');
  renderDashboard();
}

async function confirmBooking(id){
  const idx=DB.bookings.findIndex(b=>b.id===id);
  if(idx<0) return;
  const b = DB.bookings[idx];

  // Calculate current global stock availability
  const confirmedB = DB.bookings.filter(x => x.isConfirmed);
  const currentJarsOut = confirmedB.reduce((s, x) => s + (x.jars - (x.jarsReturned || 0)), 0);
  const currentBottlesOut = confirmedB.reduce((s, x) => s + (x.bottles - (x.bottlesReturned || 0)), 0);
  
  const totalJars = DB.settings.totalJars || 0;
  const totalBottles = DB.settings.totalBottles || 0;
  
  const availableJars = totalJars - currentJarsOut;
  const availableBottles = totalBottles - currentBottlesOut;

  if (b.jars > availableJars) {
    alert(`❌ स्टॉक में जार उपलब्ध नहीं हैं!\n\nकुल स्टॉक: ${totalJars}\nबाहर: ${currentJarsOut}\nउपलब्ध: ${availableJars}\nजरूरत: ${b.jars}`);
    return;
  }
  if (b.bottles > availableBottles) {
    alert(`❌ स्टॉक में बोतल उपलब्ध नहीं हैं!\n\nकुल स्टॉक: ${totalBottles}\nबाहर: ${currentBottlesOut}\nउपलब्ध: ${availableBottles}\nजरूरत: ${b.bottles}`);
    return;
  }

  if(!confirm('क्या आप इस साटा को कन्फर्म करना चाहते हैं? इसके बाद जार बाहर में जोड़ दिए जाएंगे।')) return;
  
  DB.bookings[idx].isConfirmed=true;
  await save();
  showToast('बुकिंग कन्फर्म हो गई ✅');
  renderDashboard();
  renderBookingList();
  if(currentPage==='jars') renderJars();
}

function openSettlementModal(id){
  const b=DB.bookings.find(x=>x.id===id);
  if(!b) return;
  document.getElementById('settlementId').value=id;
  
  const pJars = b.jars - (b.jarsReturned||0);
  const pBots = b.bottles - (b.bottlesReturned||0);
  let info = `👤 <b style="font-size:15px;color:#1565C0">${b.name}</b><br><br>`;
  
  const itemsPending = pJars > 0 || pBots > 0;
  const moneyPending = b.remain > 0;
  
  if(itemsPending) {
    info += `⚠️ <b>बाकी सामान:</b> ${pJars} जार, ${pBots} बोतल<br>`;
    document.getElementById('settlementItems').checked = false;
    document.getElementById('settlementItems').parentElement.style.display = 'flex';
  } else {
    info += `✅ <b>सभी सामान:</b> वापस आ चुके हैं<br>`;
    document.getElementById('settlementItems').checked = true;
    document.getElementById('settlementItems').parentElement.style.display = 'none';
  }
  
  if(moneyPending) {
    info += `💰 <b>बकाया राशि:</b> ₹${b.remain}`;
    document.getElementById('settlementRemainAmt').textContent = '₹' + b.remain;
    document.getElementById('settlementMoney').checked = false;
    document.getElementById('settlementMoneyDiv').style.display = 'block';
  } else {
    info += `✅ <b>बकाया राशि:</b> कोई बकाया नहीं है`;
    document.getElementById('settlementMoney').checked = true;
    document.getElementById('settlementMoneyDiv').style.display = 'none';
  }
  
  document.getElementById('settlementInfo').innerHTML = info;
  document.getElementById('settlementModal').style.display='flex';
}

async function saveSettlement(){
  if(!checkPin()) return;
  const id=document.getElementById('settlementId').value;
  const idx=DB.bookings.findIndex(b=>b.id===id);
  if(idx<0) return;
  
  const b = DB.bookings[idx];
  let updated = false;
  
  if(document.getElementById('settlementItems').parentElement.style.display !== 'none' && document.getElementById('settlementItems').checked) {
    DB.bookings[idx].jarsReturned = b.jars || 0;
    DB.bookings[idx].bottlesReturned = b.bottles || 0;
    updated = true;
  }
  
  if(document.getElementById('settlementMoneyDiv').style.display !== 'none' && document.getElementById('settlementMoney').checked) {
    const amt = b.remain;
    if(!DB.bookings[idx].payments) DB.bookings[idx].payments=[];
    DB.bookings[idx].payments.push({id:uid(), date:today(), amount:amt, note:'फ़ाइनल हिसाब (Settlement)'});
    DB.bookings[idx].paid += amt;
    DB.bookings[idx].remain = 0;
    updated = true;
  }
  
  if(!updated) {
    showToast('कोई विकल्प नहीं चुना गया');
    return;
  }
  
  await save();
  document.getElementById('settlementModal').style.display='none';
  showToast('हिसाब सफलता पूर्वक सेव हो गया ✅');
  renderDashboard();
  renderBookingList();
  if(typeof renderJars === 'function') renderJars();
  if(typeof renderPayments === 'function') renderPayments();
}

// ===== SETTINGS =====
function openSettings(){
  if (!checkPin()) return;
  document.getElementById('bizName').value=DB.settings.bizName||'';
  document.getElementById('bizTagline').value=DB.settings.bizTagline||'';
  document.getElementById('bizMobile').value=DB.settings.bizMobile||'';
  document.getElementById('bizAddress').value=DB.settings.bizAddress||'';
  document.getElementById('driverMobile').value=DB.settings.driverMobile||'';
  document.getElementById('setAppUser').value=DB.settings.appUser||'7700828989';
  document.getElementById('setAppPass').value=DB.settings.appPass||'Ajay@1522#';
  
  // Firebase (Locked by default)
  const fbs = ['fbApiKey', 'fbDbUrl', 'fbProjectId'];
  fbs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.value = DB.settings[id] || '';
      el.type = 'password';
      el.disabled = true;
    }
  });
  if(document.getElementById('unlockFbBtn')) document.getElementById('unlockFbBtn').style.display = 'block';

  renderTrash();
  document.getElementById('settingsModal').style.display='flex';
}
function closeSettings(e){if(e.target.id==='settingsModal')document.getElementById('settingsModal').style.display='none';}
async function saveSettings(){
  if (!checkPin()) return;
  DB.settings.bizName=document.getElementById('bizName').value.trim()||'आशा एंटरप्राइजेस';
  DB.settings.bizTagline=document.getElementById('bizTagline').value.trim()||'शुद्ध जल';
  DB.settings.bizMobile=document.getElementById('bizMobile').value.trim();
  DB.settings.bizAddress=document.getElementById('bizAddress').value.trim();
  DB.settings.driverMobile=document.getElementById('driverMobile').value.trim();
  
  const newUser = document.getElementById('setAppUser').value.trim();
  const newPass = document.getElementById('setAppPass').value.trim();
  if(newUser) DB.settings.appUser = newUser;
  if(newPass) DB.settings.appPass = newPass;

  // Firebase
  DB.settings.fbApiKey = document.getElementById('fbApiKey').value.trim();
  DB.settings.fbDbUrl = document.getElementById('fbDbUrl').value.trim();
  DB.settings.fbProjectId = document.getElementById('fbProjectId').value.trim();

  await save();
  if(typeof initFirebase === 'function') initFirebase();
  document.getElementById('settingsModal').style.display='none';
  showToast('सेटिंग सेव हो गई और Firebase कनेक्ट हो रहा है ✅');
  renderDashboard();
}

function unlockFirebaseSettings() {
  if (!checkPin()) return;
  const fbs = ['fbApiKey', 'fbDbUrl', 'fbProjectId'];
  fbs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.type = 'text';
      el.disabled = false;
    }
  });
  if(document.getElementById('unlockFbBtn')) document.getElementById('unlockFbBtn').style.display = 'none';
  showToast('Firebase सेटिंग्स अनलॉक हो गईं 🔓');
}

function exportToExcel() {
  if (DB.bookings.length === 0) {
    showToast('निर्यात करने के लिए कोई बुकिंग नहीं है');
    return;
  }

  const headers = [
    'Slip No', 'Customer Name', 'Mobile', 'Address', 'Event Type', 'Event Date', 
    'Booking Date', 'Jars', 'Returned Jars', 'Bottles', 'Returned Bottles', 
    'Total Amount', 'Paid', 'Remaining', 'Confirmed Status', 'Notes'
  ];

  const rows = DB.bookings.map(b => [
    b.slipNo,
    b.name,
    b.mobile,
    (b.address || '').replace(/,/g, ' '),
    b.eventType,
    b.eventDate,
    b.bookingDate,
    b.jars,
    b.jarsReturned || 0,
    b.bottles || 0,
    b.bottlesReturned || 0,
    b.total,
    b.paid,
    b.remain,
    b.isConfirmed ? 'Confirmed' : 'Pending',
    (b.notes || '').replace(/,/g, ' ')
  ]);

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Added BOM for Excel UTF-8 support
  csvContent += headers.join(",") + "\r\n";
  
  rows.forEach(row => {
    csvContent += row.join(",") + "\r\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Jalwala_Backup_${new Date().toLocaleDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('Excel बैकअप डाउनलोड हो गया ✅');
}

// ===== FIREBASE SYNC (Handled in app.js real-time) =====

// ===== WHATSAPP =====
let _waCurrentBookingId = null; // tracks which booking WA share modal is open for

function buildWAMsg(b){
  return `*${DB.settings.bizName||'आशा एंटरप्राइजेस'}*\n` +
    `_${DB.settings.bizTagline||'शुद्ध जल'}_\n\n` +
    `🧾 *पर्ची नं:* ${b.slipNo}\n` +
    `👤 *ग्राहक का नाम:* ${b.name}\n` +
    `📱 *मोबाइल:* ${b.mobile}\n` +
    (b.address ? `🏠 *पता:* ${b.address}\n` : ``) +
    `📅 *कार्यक्रम तिथि:* ${fmtDate(b.eventDate)}\n` +
    `🎉 *कार्यक्रम:* ${b.eventType}\n\n` +
    `📦 *ऑर्डर का विवरण:*\n` +
    `💧 कैम्पर/पानी: ${b.water || 0} लीटर\n` +
    `🫙 जार: ${b.jars || 0}\n` +
    `🍾 बोतल: ${b.bottles || 0}\n\n` +
    `💵 *भुगतान विवरण:*\n` +
    `💰 कुल राशि: ₹${b.total}\n` +
    `✅ प्राप्त (Advance): ₹${b.paid}\n` +
    `⏳ *बकाया (Remain):* ₹${b.remain}\n\n` +
    (b.notes ? `📝 *नोट:* ${b.notes}\n\n` : ``) +
    `🙏 *कृपया अपना बकाया राशि का भुगतान जल्द से जल्द सुनिश्चित करें। धन्यवाद!* \n\n` +
    `📞 *संपर्क:* ${DB.settings.bizMobile || ''}`;
}

function shareWhatsApp(id){
  const b = DB.bookings.find(x => x.id === id);
  if(!b) return;
  _waCurrentBookingId = id;

  // Fill labels in modal
  const custLabel = document.getElementById('waCustomerNumLabel');
  if(custLabel) custLabel.textContent = `📱 ${b.mobile}`;

  const driverNum = DB.settings.driverMobile || '';
  const driverLabel = document.getElementById('waDriverNumLabel');
  if(driverLabel){
    driverLabel.textContent = driverNum
      ? `📱 ${driverNum}`
      : '⚠️ Settings में नंबर जोड़ें';
  }

  // Style driver button based on number availability
  const driverBtn = document.getElementById('waOptDriver');
  if(driverBtn){
    driverBtn.style.opacity = driverNum ? '1' : '0.6';
  }

  document.getElementById('waShareModal').style.display = 'flex';
}

function closeWAShareModal(){
  document.getElementById('waShareModal').style.display = 'none';
}

function _openWA(phone, msg){
  const p = phone.replace(/\D/g,'');
  const dial = p.length === 10 ? '91' + p : p;
  window.open('https://wa.me/' + dial + '?text=' + encodeURIComponent(msg), '_blank');
  closeWAShareModal();
}

// 1. Customer
function waShareCustomer(){
  const b = DB.bookings.find(x => x.id === _waCurrentBookingId);
  if(!b){ showToast('बुकिंग नहीं मिली'); return; }
  _openWA(b.mobile, buildWAMsg(b));
}

// 2. Driver
function waShareDriver(){
  const b = DB.bookings.find(x => x.id === _waCurrentBookingId);
  if(!b){ showToast('बुकिंग नहीं मिली'); return; }
  const driverNum = DB.settings.driverMobile || '';
  if(!driverNum){
    // No driver number — open settings
    closeWAShareModal();
    showToast('⚙️ पहले Settings में ड्राइवर का नंबर जोड़ें');
    setTimeout(() => openSettings(), 400);
    return;
  }
  _openWA(driverNum, buildWAMsg(b));
}

// 3. Other — WhatsApp contact picker (no number pre-filled)
function waShareOther(){
  const b = DB.bookings.find(x => x.id === _waCurrentBookingId);
  if(!b){ showToast('बुकिंग नहीं मिली'); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(buildWAMsg(b)), '_blank');
  closeWAShareModal();
}


// ===== EXPORT/IMPORT =====
function exportExcel(type = 'full'){
  let bookings = [];
  let income = [];
  let expense = [];
  let fileName = 'jalwala_backup';

  if (type === 'daily') {
    const d = document.getElementById('reportDate')?.value || today();
    bookings = DB.bookings.filter(b => b.bookingDate === d);
    income = (DB.extraIncome || []).filter(i => i.date === d);
    expense = (DB.extraExpense || []).filter(e => e.date === d);
    fileName = 'daily_report_' + d;
  } else if (type === 'monthly') {
    const m = document.getElementById('reportMonth')?.value || monthStr();
    bookings = DB.bookings.filter(b => b.bookingDate?.startsWith(m));
    income = (DB.extraIncome || []).filter(i => i.date?.startsWith(m));
    expense = (DB.extraExpense || []).filter(e => e.date?.startsWith(m));
    fileName = 'monthly_report_' + m;
  } else if (type === 'range') {
    const from = document.getElementById('rangeFrom')?.value;
    const to = document.getElementById('rangeTo')?.value;
    if (!from || !to) { showToast('कृपया तारीख चुनें'); return; }
    bookings = DB.bookings.filter(b => b.bookingDate >= from && b.bookingDate <= to);
    income = (DB.extraIncome || []).filter(i => i.date >= from && i.date <= to);
    expense = (DB.extraExpense || []).filter(e => e.date >= from && e.date <= to);
    fileName = `range_report_${from}_to_${to}`;
  } else {
    bookings = DB.bookings;
    income = DB.extraIncome || [];
    expense = DB.extraExpense || [];
    fileName = 'full_backup_' + today();
  }

  if(!bookings.length && !income.length && !expense.length){
    showToast('डाउनलोड करने के लिए कोई डेटा नहीं है');
    return;
  }

  const header = ['पर्ची नं','बुकिंग दिनांक','ग्राहक','मोबाइल','पता','कार्यक्रम','कार्यक्रम तिथि','पानी(L)','जार','बोतल','कुल राशि','एडवांस','बकाया','नोट्स','स्थिति'];
  const rows = bookings.map(b => [
    b.slipNo, b.bookingDate, `"${b.name}"`, b.mobile, `"${b.address||''}"`, `"${b.eventType}"`,
    b.eventDate, b.water||0, b.jars||0, b.bottles||0, b.total, b.paid||b.advance||0, b.remain, `"${b.notes||''}"`,
    b.isConfirmed ? 'कन्फर्म' : 'पेंडिंग'
  ]);
  
  if(income.length){
    rows.push([]);
    rows.push(['फुटकर बिक्री / अन्य आय']);
    rows.push(['दिनांक', 'विवरण', 'राशि']);
    income.forEach(i => rows.push([i.date, `"${i.note}"`, i.amount]));
  }
// ===== REMOTE UPDATE SYSTEM =====

function checkAppUpdate() {
  const dbVer = DB.settings.appVersion || 1.0;
  // If DB version is higher than current code version, show update modal
  if (dbVer > APP_CODE_VERSION) {
    document.getElementById('updateModal').style.display = 'flex';
  }
}

async function pushNewUpdate() {
  if (!checkPin()) return;
  
  const newVer = (DB.settings.appVersion || 1.0) + 0.1;
  const ok = confirm(`क्या आप सभी यूजर्स के लिए नया अपडेट (v${newVer.toFixed(1)}) पुश करना चाहते हैं?`);
  if (!ok) return;

  DB.settings.appVersion = newVer;
  save(); // This will sync to Firebase and notify everyone
  showToast('अपडेट सफलतापुर्वक पुश कर दिया गया! 🚀');
  renderSettings();
}

async function forceAppUpdate() {
  showToast('अपडेट हो रहा है, कृपया रुकें...');
  
  try {
    // 1. Unregister Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    
    // 2. Clear Caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (let name of cacheNames) {
        await caches.delete(name);
      }
    }

    // 3. Force Reload from Server (ignoring local cache)
    location.reload(true);
  } catch (err) {
    console.error('Update Error:', err);
    location.reload();
  }
}

  if(expense.length){
    rows.push([]);
    rows.push(['अन्य खर्च (Expenses)']);
    rows.push(['दिनांक', 'विवरण', 'राशि']);
    expense.forEach(e => rows.push([e.date, `"${e.note}"`, e.amount]));
  }

  const csv = '\uFEFF' + [header, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = fileName + '.csv';
  a.click();
  showToast('Excel फ़ाइल डाउनलोड हो रही है... ✅');
}

function exportData(){
  const a=document.createElement('a');
  a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(DB,null,2));
  a.download='jalwala_backup_'+today()+'.json';a.click();
}
function importData(e){
  const file=e.target.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{try{DB=JSON.parse(ev.target.result);save();showToast('डेटा इम्पोर्ट हो गया ✅');renderDashboard();}catch{showToast('फ़ाइल गलत है');}};
  r.readAsText(file);
}

// ===== TOAST =====
function showToast(msg){
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
}

// ===== PDF (html2canvas - Hindi supported) =====
function generatePDF(id){
  const b=typeof id==='string'?DB.bookings.find(x=>x.id===id):id;
  if(!b)return;
  const biz=DB.settings;

  // Fill slip template
  const set=(elId,val)=>{const e=document.getElementById(elId);if(e)e.textContent=val;};
  set('slipBizName', biz.bizName||'आशा एंटरप्राइजेस');
  set('slipBizTagline', biz.bizTagline||'शुद्ध जल');
  set('slipBizContact', (biz.bizMobile?'📞 '+biz.bizMobile:'') + (biz.bizAddress?' | '+biz.bizAddress:''));
  set('slipNum', b.slipNo);
  set('slipDate', fmtDate(b.bookingDate));
  set('slipCustName', b.name);
  set('slipMobile', b.mobile);
  set('slipAddress', b.address||'-');
  set('slipEvent', b.eventType);
  set('slipEventDate', fmtDate(b.eventDate));
  set('slipWater', (b.water||0)+' लीटर / कैम्पर');
  set('slipJars', b.jars+' जार');
  set('slipBottles', (b.bottles||0)+' बोतल');
  set('slipTotal', '₹'+b.total);
  set('slipAdvance', '₹'+b.paid);
  set('slipRemain', '₹'+b.remain);
  set('slipNotes', b.notes?'विशेष: '+b.notes:'');

  // Show template temporarily
  const tpl=document.getElementById('slipTemplate');
  const content=document.getElementById('slipContent');
  tpl.style.display='block';

  html2canvas(content,{scale:2,useCORS:true,backgroundColor:'#ffffff'}).then(canvas=>{
    tpl.style.display='none';
    const{jsPDF}=window.jspdf;
    const imgData=canvas.toDataURL('image/png');
    const pdfW=148, pdfH=Math.round((canvas.height/canvas.width)*pdfW);
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:[pdfW,pdfH+10]});
    doc.addImage(imgData,'PNG',0,0,pdfW,pdfH);
    doc.save(b.slipNo+'_'+b.name+'.pdf');
  }).catch(()=>{
    tpl.style.display='none';
    showToast('PDF बनाने में त्रुटि');
  });
}

// ===== INIT =====
window.addEventListener('DOMContentLoaded',()=>{
  load();setHeaderDate();
  initCalendar();
  if (typeof checkDateAvailability === 'function') checkDateAvailability();
  renderDashboard();
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.form-group')){
    const box=document.getElementById('autocompleteBox');
    if(box)box.style.display='none';
  }
});
function renderTrash() {
  const trash = DB.trash || [];
  const list = document.getElementById('trashList');
  if(!list) return;
  
  if(trash.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#888;font-size:12px">रीसायकल बिन खाली है</div>';
    return;
  }
  
  list.innerHTML = trash.map(b => `
    <div class="booking-card" style="padding:10px;margin-bottom:8px;border-left:4px solid #C62828">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:13px">${b.name}</div>
          <div style="font-size:11px;color:#666">${fmtDate(b.eventDate)} - ${b.eventType}</div>
        </div>
        <div style="display:flex;gap:5px">
          <button class="btn-primary" onclick="restoreBooking('${b.id}')" style="padding:4px 8px;font-size:10px;background:#2E7D32">Restore</button>
          <button class="btn-danger" onclick="permanentDelete('${b.id}')" style="padding:4px 8px;font-size:10px;background:#C62828">Del</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== ADVANCED CALENDAR SYSTEM (FLATPICKR) =====
let _fp = null;
function initCalendar() {
  const el = document.getElementById('eventDate');
  if (!el) return;
  
  if (_fp) _fp.destroy();
  
  _fp = flatpickr(el, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d-m-Y",
    allowInput: true,
    monthSelectorType: "static",
    onDayCreate: function(dObj, dStr, fp, dayElem) {
      const date = dayElem.dateObj.toISOString().slice(0, 10);
      const dayBookings = DB.bookings.filter(b => b.eventDate === date);
      
      if (dayBookings.length > 0) {
        // Check status
        const isAllFinal = dayBookings.every(b => {
          const jarPending = b.jars - (b.jarsReturned || 0);
          return b.isConfirmed && b.remain <= 0 && jarPending <= 0;
        });

        if (isAllFinal) {
          // Add Green background and Cross
          dayElem.style.background = "#E8F5E9";
          dayElem.style.borderRadius = "8px";
          dayElem.innerHTML += '<span style="position:absolute;top:2px;right:2px;font-size:10px;color:#2E7D32">❌</span>';
        } else {
          // Add Orange background for Pending
          dayElem.style.background = "#FFF3E0";
          dayElem.style.borderRadius = "8px";
          dayElem.innerHTML += '<span style="position:absolute;top:2px;right:2px;font-size:10px;color:#E65100">⏳</span>';
        }
      }
    },
    onChange: function() {
      checkDateAvailability();
    }
  });
}

function checkDateAvailability() {
  const input = document.getElementById('eventDate');
  const dateStr = input?.value;
  const box = document.getElementById('dateAvailability');
  const text = document.getElementById('dateStatusText');
  const list = document.getElementById('dateBookingCards');
  
  if (!dateStr) {
    if(box) box.style.display = 'none';
    return;
  }
  
  const bookings = DB.bookings.filter(b => b.eventDate === dateStr);
  if(box) box.style.display = 'block';
  
  if (bookings.length === 0) {
    text.innerHTML = '<span style="color:#2E7D32">✅ यह तारीख खाली है। आप बुकिंग कर सकते हैं।</span>';
    list.innerHTML = '';
    box.style.background = '#E8F5E9';
    box.style.borderColor = '#A5D6A7';
    return;
  }
  
  // Check if all bookings on this date are "Finalized"
  const isAllFinal = bookings.every(b => {
    const jarPending = b.jars - (b.jarsReturned || 0);
    const bottlePending = b.bottles - (b.bottlesReturned || 0);
    const moneyPending = b.remain > 0;
    return b.isConfirmed && !moneyPending && jarPending <= 0 && bottlePending <= 0;
  });
  
  if (isAllFinal) {
    text.innerHTML = '<span style="color:#2E7D32;font-weight:800">✅ इस दिन के सभी कार्य (Sata) पूर्ण हो चुके हैं।</span>';
    box.style.background = '#E8F5E9';
    box.style.borderColor = '#A5D6A7';
  } else {
    text.innerHTML = '<span style="color:#C62828;font-weight:800">⏳ इस दिन कार्य (Sata) अभी जारी है।</span>';
    box.style.background = '#FFF3E0';
    box.style.borderColor = '#FFCC80';
  }
  
  // Show mini-cards for the bookings on that date
  list.innerHTML = bookings.map(b => {
    const jarPending = b.jars - (b.jarsReturned || 0);
    const isFinal = b.isConfirmed && b.remain <= 0 && jarPending <= 0;
    return `
      <div style="background:#fff;padding:10px 12px;border-radius:10px;border-left:4px solid ${isFinal ? '#2E7D32' : '#E65100'};box-shadow:0 1px 4px rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:800;font-size:13px;color:#333">${b.name} <span style="font-size:10px;font-weight:400;color:#888">• ${b.eventType}</span></div>
          <div style="font-size:11px;color:${b.remain > 0 ? '#C62828' : '#666'};margin-top:2px">
            ₹${b.remain} बकाया | ${jarPending > 0 ? jarPending + ' जार बाकी' : 'सभी जार वापस'}
          </div>
        </div>
        <span style="font-size:10px;font-weight:900;padding:4px 8px;border-radius:20px;background:${isFinal ? '#E8F5E9' : '#FFF3E0'};color:${isFinal ? '#2E7D32' : '#E65100'}">
          ${isFinal ? '✅ FINAL' : '⏳ PENDING'}
        </span>
      </div>
    `;
  }).join('');
}
