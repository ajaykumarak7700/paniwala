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
      ${!b.isConfirmed ? `<button class="action-btn" onclick="confirmBooking('${b.id}')" style="background:var(--blue);color:#fff;flex:2">✅ गाड़ी कन्फर्म</button>` : `<span class="action-btn" style="background:#E8F5E9;color:#2E7D32;flex:2;cursor:default">✅ कन्फर्म</span>`}
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
  const upcoming=DB.bookings.filter(b=>b.eventDate>t).slice(0,5);
  const todayE=todayB.reduce((s,b)=>s+b.paid,0);
  const pending=DB.bookings.reduce((s,b)=>s+b.remain,0);
  
  const todayExtra = (DB.extraIncome||[]).filter(i=>i.date===t).reduce((s,i)=>s+i.amount,0);
  const monthExtra = (DB.extraIncome||[]).filter(i=>i.date?.startsWith(m)).reduce((s,i)=>s+i.amount,0);

  const todayExp = (DB.extraExpense||[]).filter(e=>e.date===t).reduce((s,e)=>s+e.amount,0);
  const monthExp = (DB.extraExpense||[]).filter(e=>e.date?.startsWith(m)).reduce((s,e)=>s+e.amount,0);

  let monthE = 0;
  DB.bookings.forEach(b => {
    if (b.payments) {
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
  const tmr=new Date();tmr.setDate(tmr.getDate()+1);
  const tStr=tmr.toISOString().slice(0,10);
  DB.bookings.forEach(b=>{
    if(b.eventDate===tStr)reminders.push(`🎉 कल कार्यक्रम: ${b.name}`);
    if(b.remain>0)reminders.push(`💰 बकाया ₹${b.remain}: ${b.name}`);
    if(((b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0) && b.eventDate<t)reminders.push(`⚠️ सामान वापसी बाकी: ${b.name}`);
  });
  const rbox=document.getElementById('reminderBox');
  const rlist=document.getElementById('reminderList');
  if(rbox && rlist) {
    if(reminders.length){
      rbox.style.display='block';
      rlist.innerHTML=[...new Set(reminders)].slice(0,6).map(r=>`<div class="reminder-item">${r}</div>`).join('');
    }else rbox.style.display='none';
  }

  document.getElementById('upcomingList').innerHTML=upcoming.length?upcoming.map(bookingCardHTML).join(''):emptyHTML('📅','कोई आगामी बुकिंग नहीं');
  document.getElementById('todayList').innerHTML=todayB.length?todayB.map(bookingCardHTML).join(''):emptyHTML('🗓️','आज कोई बुकिंग नहीं');
  
  // Render Finance History
  const history = [
    ...(DB.extraIncome || []).map(i => ({...i, type: 'income'})),
    ...(DB.extraExpense || []).map(e => ({...e, type: 'expense'}))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const histEl = document.getElementById('financeHistory');
  if (histEl) {
    histEl.innerHTML = history.length ? history.map(item => `
      <div class="booking-card ${item.type === 'income' ? 'paid' : 'unpaid'}" style="padding:10px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;font-size:14px">${item.type === 'income' ? '📈 आय' : '📉 खर्च'}: ₹${item.amount}</div>
            <div style="font-size:11px;color:#666;margin-top:2px">${item.note}</div>
          </div>
          <div style="font-size:11px;font-weight:600;color:#888">${fmtDate(item.date)}</div>
        </div>
      </div>
    `).join('') : emptyHTML('📊', 'कोई लेनदेन नहीं');
  }

  if(typeof renderCalendar === 'function') renderCalendar();
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

function openExpenseModal(){
  document.getElementById('expenseAmount').value='';
  document.getElementById('expenseNote').value='';
  document.getElementById('expenseDate').value=today();
  document.getElementById('expenseModal').style.display='flex';
}
function closeExpenseModal(e){if(e.target.id==='expenseModal')document.getElementById('expenseModal').style.display='none';}
function saveExtraExpense(){
  if (!checkPin()) return;
  try {
    const amt=parseFloat(document.getElementById('expenseAmount')?.value) || 0;
    const note=document.getElementById('expenseNote')?.value?.trim() || 'अन्य खर्च';
    const date=document.getElementById('expenseDate')?.value || today();
    if(amt<=0){showToast('कृपया सही राशि दर्ज करें');return;}
    if(!DB.extraExpense) DB.extraExpense=[];
    DB.extraExpense.push({id:uid(), date, amount:amt, note});
    save();
    document.getElementById('expenseModal').style.display='none';
    showToast('खर्च सेव हो गया 📉');
    renderDashboard();
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

// MODALS are handled at the top
function openPayModal(id){document.getElementById('payBookingId').value=id;document.getElementById('payAmount').value='';document.getElementById('payModal').style.display='flex';}
function closePayModal(e){if(e.target.id==='payModal')document.getElementById('payModal').style.display='none';}
function savePayment(){
  if (!checkPin()) return;
  const id=document.getElementById('payBookingId').value;
  const amt=parseFloat(document.getElementById('payAmount').value);
  if(!amt||amt<=0){showToast('राशि दर्ज करें');return;}
  const idx=DB.bookings.findIndex(b=>b.id===id);if(idx<0)return;
  DB.bookings[idx].paid=(DB.bookings[idx].paid||0)+amt;
  DB.bookings[idx].remain=Math.max(0,DB.bookings[idx].total-DB.bookings[idx].paid);
  if(!DB.bookings[idx].payments)DB.bookings[idx].payments=[];
  DB.bookings[idx].payments.push({date:today(),amount:amt});
  save();document.getElementById('payModal').style.display='none';
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
function saveJarReturn(){
  if (!checkPin()) return;
  const id=document.getElementById('jarBookingId').value;
  const jR=parseInt(document.getElementById('jarsReturned').value) || 0;
  const bR=parseInt(document.getElementById('bottlesReturned').value) || 0;
  if(jR <= 0 && bR <= 0){showToast('कम से कम एक संख्या दर्ज करें');return;}
  const idx=DB.bookings.findIndex(b=>b.id===id);if(idx<0)return;
  DB.bookings[idx].jarsReturned=Math.min(DB.bookings[idx].jars,(DB.bookings[idx].jarsReturned||0)+jR);
  DB.bookings[idx].bottlesReturned=Math.min(DB.bookings[idx].bottles||0,(DB.bookings[idx].bottlesReturned||0)+bR);
  save();document.getElementById('jarModal').style.display='none';
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
function saveSell(){
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
  
  save();
  document.getElementById('sellModal').style.display='none';
  showToast('बिक्री सेव हो गई ✅');
  renderDashboard();
}

function confirmBooking(id){
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
  save();
  showToast('बुकिंग कन्फर्म हो गई ✅');
  renderDashboard();
  renderBookingList();
  if(currentPage==='jars') renderJars();
}

// ===== SETTINGS =====
function openSettings(){
  document.getElementById('bizName').value=DB.settings.bizName||'';
  document.getElementById('bizTagline').value=DB.settings.bizTagline||'';
  document.getElementById('bizMobile').value=DB.settings.bizMobile||'';
  document.getElementById('bizAddress').value=DB.settings.bizAddress||'';
  document.getElementById('setAppUser').value=DB.settings.appUser||'7700828989';
  document.getElementById('setAppPass').value=DB.settings.appPass||'Ajay@1522#';
  
  // Firebase
  document.getElementById('fbApiKey').value=DB.settings.fbApiKey||'';
  document.getElementById('fbDbUrl').value=DB.settings.fbDbUrl||'';
  document.getElementById('fbProjectId').value=DB.settings.fbProjectId||'';

  renderTrash(); 
  document.getElementById('settingsModal').style.display='flex';
}
function closeSettings(e){if(e.target.id==='settingsModal')document.getElementById('settingsModal').style.display='none';}
function saveSettings(){
  DB.settings.bizName=document.getElementById('bizName').value.trim()||'आशा एंटरप्राइजेस';
  DB.settings.bizTagline=document.getElementById('bizTagline').value.trim()||'शुद्ध जल';
  DB.settings.bizMobile=document.getElementById('bizMobile').value.trim();
  DB.settings.bizAddress=document.getElementById('bizAddress').value.trim();
  
  const newUser = document.getElementById('setAppUser').value.trim();
  const newPass = document.getElementById('setAppPass').value.trim();
  if(newUser) DB.settings.appUser = newUser;
  if(newPass) DB.settings.appPass = newPass;

  // Firebase
  DB.settings.fbApiKey = document.getElementById('fbApiKey').value.trim();
  DB.settings.fbDbUrl = document.getElementById('fbDbUrl').value.trim();
  DB.settings.fbProjectId = document.getElementById('fbProjectId').value.trim();

  save();
  if(typeof initFirebase === 'function') initFirebase();
  document.getElementById('settingsModal').style.display='none';
  showToast('सेटिंग सेव हो गई और Firebase कनेक्ट हो रहा है ✅');
}

// ===== FIREBASE SYNC (Handled in app.js real-time) =====

// ===== WHATSAPP =====
function shareWhatsApp(id){
  const b=DB.bookings.find(x=>x.id===id);if(!b)return;
  const msg = `*${DB.settings.bizName||'आशा एंटरप्राइजेस'}*\n` +
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
    `⏳ बकाया (Remain): ₹${b.remain}\n\n` +
    (b.notes ? `📝 *नोट:* ${b.notes}\n\n` : ``) +
    `📞 *संपर्क:* ${DB.settings.bizMobile || ''}`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg));
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
  document.getElementById('eventDate').value=today();
  if (typeof checkDateAvailability === 'function') checkDateAvailability();
  renderDashboard();
  
  // Auto-sync from cloud on startup - Handled by Firebase listener in app.js
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
