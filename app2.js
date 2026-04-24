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

  const monthE=DB.bookings.filter(b=>b.bookingDate?.startsWith(m)).reduce((s,b)=>s+b.total,0);
  const itemsOut=DB.bookings.reduce((s,b)=>s+(b.jars-(b.jarsReturned||0))+(b.bottles-(b.bottlesReturned||0)),0);
  const pendingItems=DB.bookings.filter(b=>(b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0).length;

  document.getElementById('statTodayBookings').textContent=todayB.length;
  document.getElementById('statTodayEarning').textContent='₹'+(todayE + todayExtra - todayExp);
  document.getElementById('statPending').textContent='₹'+pending;
  document.getElementById('statJarsOut').textContent=itemsOut;
  document.getElementById('statMonthEarning').textContent='₹'+(monthE + monthExtra - monthExp);
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
  if(typeof renderCalendar === 'function') renderCalendar();
}

// ===== EXTRA INCOME / EXPENSE =====
function openIncomeModal(){
  document.getElementById('incomeAmount').value='';
  document.getElementById('incomeNote').value='';
  document.getElementById('incomeDate').value=today();
  document.getElementById('incomeModal').style.display='flex';
}
function closeIncomeModal(e){if(e.target.id==='incomeModal')document.getElementById('incomeModal').style.display='none';}
function saveExtraIncome(){
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
  const jOut=DB.bookings.reduce((s,b)=>s+(b.jars||0),0);
  const jRet=DB.bookings.reduce((s,b)=>s+(b.jarsReturned||0),0);
  document.getElementById('jarTotal').textContent=jTotal;
  document.getElementById('jarOut').textContent=jOut;
  document.getElementById('jarReturned').textContent=jRet;
  document.getElementById('jarPending').textContent=jOut-jRet;
  document.getElementById('setTotalJars').value=jTotal;
  
  // Bottle Stats
  const bTotal=DB.settings.totalBottles||0;
  const bOut=DB.bookings.reduce((s,b)=>s+(b.bottles||0),0);
  const bRet=DB.bookings.reduce((s,b)=>s+(b.bottlesReturned||0),0);
  if(document.getElementById('bottleTotal')) document.getElementById('bottleTotal').textContent=bTotal;
  if(document.getElementById('bottleOut')) document.getElementById('bottleOut').textContent=bOut;
  if(document.getElementById('bottleReturned')) document.getElementById('bottleReturned').textContent=bRet;
  if(document.getElementById('bottlePending')) document.getElementById('bottlePending').textContent=bOut-bRet;
  if(document.getElementById('setTotalBottles')) document.getElementById('setTotalBottles').value=bTotal;

  // Track List
  const list=DB.bookings.filter(b=>(b.jars-(b.jarsReturned||0))>0 || (b.bottles-(b.bottlesReturned||0))>0);
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
  const list=DB.bookings.filter(b=>b.bookingDate?.startsWith(m));
  const el=document.getElementById('monthlyReport');
  if(!el)return;
  if(!list.length){el.innerHTML=emptyHTML('📊','इस माह कोई बुकिंग नहीं');return;}
  const total=list.reduce((s,b)=>s+b.total,0),paid=list.reduce((s,b)=>s+b.paid,0);
  el.innerHTML=`<div class="report-card">
    <div class="report-row"><span>📋 कुल बुकिंग</span><span>${list.length}</span></div>
    <div class="report-row"><span>💰 कुल राशि</span><span>₹${total}</span></div>
    <div class="report-row"><span>✅ प्राप्त</span><span>₹${paid}</span></div>
    <div class="report-row"><span>⏳ बकाया</span><span>₹${total-paid}</span></div>
    <div class="report-row"><span>🫙 कुल जार</span><span>${list.reduce((s,b)=>s+b.jars,0)}</span></div>
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

// ===== MODALS =====
function openIncomeModal(){
  document.getElementById('incomeDate').value=today();
  document.getElementById('incomeAmount').value='';
  document.getElementById('incomeNote').value='';
  document.getElementById('incomeModal').style.display='flex';
}
function closeIncomeModal(e){if(e.target.id==='incomeModal')document.getElementById('incomeModal').style.display='none';}
function saveExtraIncome(){
  const amt=parseFloat(document.getElementById('incomeAmount').value);
  if(!amt || amt<=0){showToast('राशि दर्ज करें');return;}
  const dt=document.getElementById('incomeDate').value || today();
  const note=document.getElementById('incomeNote').value.trim() || 'फुटकर बिक्री';
  DB.extraIncome.push({ id:uid(), date:dt, amount:amt, note:note });
  save(); document.getElementById('incomeModal').style.display='none';
  showToast('आय सेव हो गई ✅'); renderDashboard();
}

function openPayModal(id){document.getElementById('payBookingId').value=id;document.getElementById('payAmount').value='';document.getElementById('payModal').style.display='flex';}
function closePayModal(e){if(e.target.id==='payModal')document.getElementById('payModal').style.display='none';}
function savePayment(){
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
function exportExcel(){
  if(!DB.bookings.length){showToast('डाउनलोड करने के लिए कोई डेटा नहीं है');return;}
  const header = ['पर्ची नं','बुकिंग दिनांक','ग्राहक','मोबाइल','पता','कार्यक्रम','कार्यक्रम तिथि','कैम्पर/पानी(L)','जार','बोतल','कुल राशि','एडवांस','बकाया','नोट्स'];
  const rows = DB.bookings.map(b => [
    b.slipNo, b.bookingDate, `"${b.name}"`, b.mobile, `"${b.address||''}"`, `"${b.eventType}"`,
    b.eventDate, b.water||0, b.jars||0, b.bottles||0, b.total, b.paid, b.remain, `"${b.notes||''}"`
  ]);
  
  if(DB.extraIncome && DB.extraIncome.length){
    rows.push([]);
    rows.push(['---','---','---','---','---','---','---','---','---','---','---','---','---','---']);
    rows.push(['फुटकर बिक्री / अन्य आय']);
    rows.push(['दिनांक', 'विवरण', 'राशि']);
    DB.extraIncome.forEach(i => rows.push([i.date, `"${i.note}"`, i.amount]));
  }

  const csv = '\uFEFF' + [header, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'jalwala_sata_backup_' + today() + '.csv';
  a.click();
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
