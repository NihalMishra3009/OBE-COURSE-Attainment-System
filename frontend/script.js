// ============================================================
//  GLOBAL DEPARTMENTS
// ============================================================
let DEPARTMENTS = [
  'Computer Engineering','Electronics & Telecommunication',
  'Mechanical Engineering','Civil Engineering',
  'Information Technology','Electrical Engineering',
  'Chemical Engineering','Instrumentation Engineering'
];

// ============================================================
//  USERS
// ============================================================
let USERS = {
  admin:    {pass:'admin123', role:'admin',   name:'Admin User',   dept:'Computer Engineering'},
  head:     {pass:'head123',  role:'head',    name:'Head of Dept', dept:'Computer Engineering'},
  faculty1: {pass:'pass123',  role:'faculty', name:'Dr. A. Sharma',dept:'Computer Engineering'},
};

// ============================================================
//  API HELPERS
// ============================================================
let API_BASE = (window.__API_BASE || '').trim();
if (!API_BASE) {
  if (location.protocol === 'file:' || (location.port && location.port !== '3000')) {
    API_BASE = 'http://localhost:3000';
  }
}

// Keep backend warm while the page is open (helps reduce cold starts)
function warmupBackend(){
  if(!API_BASE) return;
  fetch(API_BASE + '/health/db').catch(()=>{});
}
warmupBackend();
setInterval(warmupBackend, 4 * 60 * 1000);
let AUTH_TOKEN = localStorage.getItem('auth_token') || '';

function setAuthToken(t){
  AUTH_TOKEN = t || '';
  if(t){ localStorage.setItem('auth_token', t); }
  else { localStorage.removeItem('auth_token'); }
}

async function apiFetch(path, options){
  const opts = options || {};
  opts.headers = Object.assign({'Content-Type':'application/json'}, opts.headers || {});
  if(AUTH_TOKEN) opts.headers['Authorization'] = 'Bearer '+AUTH_TOKEN;
  let res;
  try{
    res = await fetch(API_BASE + path, opts);
  }catch(e){
    throw new Error('Backend not reachable. Start the server on http://localhost:3000');
  }
  if(!res.ok){
    let msg = 'Request failed';
    try{ const j = await res.json(); if(j && j.error) msg = j.error; }catch(e){}
    throw new Error(msg);
  }
  return res.json();
}

async function loadBootstrap(){
  const data = await apiFetch('/api/bootstrap');
  if(Array.isArray(data.departments)) DEPARTMENTS = data.departments;
  if(data.subjects && typeof data.subjects === 'object') APP.subjects = data.subjects;
  if(!APP.subjects || Object.keys(APP.subjects).length===0){
    const s = Object.assign(createDefaultSubject('Data Structures','CS301','Computer Engineering','2024-25','V','Dr. A. Sharma'),{id:'sub1'});
    APP.subjects = {sub1:s};
    await saveSubject('sub1');
  }
}

let saveTimer;
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>saveSubject(APP.currentSubjectId).catch(()=>{}), 800);
}

function manualSave(){
  saveSubject(APP.currentSubjectId)
    .then(()=>showToast('Saved','success'))
    .catch((e)=>showToast(e.message||'Save failed','error'));
}

async function saveSubject(id){
  const s = APP.subjects[id];
  if(!s) return;
  await apiFetch('/api/subjects/'+encodeURIComponent(id), {method:'PUT', body: JSON.stringify(s)});
}

async function createSubject(s){
  await apiFetch('/api/subjects', {method:'POST', body: JSON.stringify(s)});
}

async function deleteSubject(id){
  await apiFetch('/api/subjects/'+encodeURIComponent(id), {method:'DELETE'});
}

async function refreshUsers(){
  if(APP.user && APP.user.role==='admin'){
    const data = await apiFetch('/api/users');
    USERS = {};
    data.users.forEach(u=>{ USERS[u.username] = {role:u.role,name:u.name,dept:u.dept}; });
  }
}

// ============================================================
//  DEFAULT SUBJECT FACTORY
// ============================================================
function createDefaultSubject(name,code,dept,ay,sem,faculty){
  return {
    id:'', name, code, dept, ay, sem, faculty,
    instName: name, program: 'B.E. '+dept,
    batch:'2022-26 / A', credits:4, totalHours:48,
    cieWeight:0.4, eseWeight:0.6,
    cesTarget:3.5,
    attainLvlPct:{1:45,2:55,3:65},
    directWeight:0.8, indirectWeight:0.2,
    coTargetPct:60,
    coTargetLevel:2.00,
    poTarget:2.00, psoTarget:2.00,
    cos:[
      {id:'CO1',objective:'Understand fundamentals of '+name,outcome:'Students will be able to explain core concepts of '+name,bloom:'Understand',wk:['WK1','WK2'],pi:''},
      {id:'CO2',objective:'Apply principles to solve problems',outcome:'Students will be able to apply engineering methods to solve domain problems',bloom:'Apply',wk:['WK2','WK3'],pi:''},
      {id:'CO3',objective:'Analyze system components',outcome:'Students will be able to analyze complex systems',bloom:'Analyze',wk:['WK3','WK4'],pi:''},
      {id:'CO4',objective:'Design solutions',outcome:'Students will be able to design solutions for real-world problems',bloom:'Apply',wk:['WK4','WK5','WK6'],pi:''},
      {id:'CO5',objective:'Evaluate outcomes',outcome:'Students will be able to evaluate and assess performance metrics',bloom:'Evaluate',wk:['WK5','WK6'],pi:''},
      {id:'CO6',objective:'Create innovative solutions',outcome:'Students will be able to create prototypes and implementations',bloom:'Create',wk:['WK6','WK7'],pi:''},
    ],
    pos:[
      'Engineering Knowledge','Problem Analysis','Design/Development of Solutions',
      'Conduct Investigations of Complex Problems','Modern Tool Usage','Engineer and Society',
      'Environment and Sustainability','Ethics','Individual and Team Work',
      'Communication','Project Management & Finance'
    ],
    psos:['PSO1 — Domain Specific Knowledge','PSO2 — Domain Application','PSO3 — Professional Practice'],
    copoPOMatrix:Array.from({length:6},()=>Array(14).fill(0)),
    students:[],
    assessments:[
      {id:'a1',name:'CIE Test 1',type:'CIE',max:20,pass:10,coCoverage:[0,1,2]},
      {id:'a2',name:'CIE Test 2',type:'CIE',max:20,pass:10,coCoverage:[3,4,5]},
      {id:'a3',name:'ESE',type:'ESE',max:60,pass:30,coCoverage:[0,1,2,3,4,5]},
    ],
    coqMaps:[],
    marks:{},
    deliveryModes:['Lecture','Tutorial','Practical','Self-Study','Assignment','Online Resources','Demonstration'],
    deliveryHrs:null,
    hourCols:['Lecture','Tutorial','Practical'],
    coHours:Array.from({length:6},()=>Array(3).fill(0).map((_,i)=>i===0?8:i===1?2:4)),
    bloomHrs:Array.from({length:6},()=>Array(6).fill(0)),
    labTWCols:['Experiment 1','Experiment 2','Experiment 3'],
    labTWMarks:{},
    cesData:[],
    poLearningHrs:Array(14*6).fill(null),
    coAttainment:Array(6).fill(null),
    poAttainment:Array(11).fill(null),
    psoAttainment:Array(3).fill(null),
    monitoringActions:Array.from({length:6},()=>({remedial:'',advanced:'',status:'Planned'})),
    coRemarks:Array(6).fill(''),
    poRemarks:Array(11).fill(''),
    psoRemarks:Array(3).fill(''),
  };
}

// ============================================================
//  APP STATE
// ============================================================
const APP = {
  user: null,
  currentSubjectId: 'sub1',
  subjects: {
    sub1: Object.assign(createDefaultSubject('Data Structures','CS301','Computer Engineering','2024-25','V','Dr. A. Sharma'),{id:'sub1'}),
  }
};

// ============================================================
//  AUTH
// ============================================================
let currentLoginRole='faculty';
function switchLoginRole(r){
  currentLoginRole=r;
  document.querySelectorAll('.login-tab').forEach((t,i)=>t.classList.toggle('active',['admin','head','faculty'][i]===r));
  document.getElementById('deptField').style.display=(r==='admin'?'none':'block');
  // Populate dept dropdown from live DEPARTMENTS array
  const sel=document.getElementById('loginDept');
  if(sel){sel.innerHTML=DEPARTMENTS.map(d=>'<option>'+d+'</option>').join('');}
}
function doLogin(){
  const u=document.getElementById('loginUser').value.trim();
  const p=document.getElementById('loginPass').value.trim();
  apiFetch('/api/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})})
    .then(async (data)=>{
      setAuthToken(data.token);
      APP.user={...data.user,username:data.user.username};
      await loadBootstrap();
      await refreshUsers();
      document.getElementById('loginPage').style.display='none';
      document.getElementById('appShell').style.display='block';
      initApp();
    })
    .catch(err=>showLoginErr(err.message||'Login failed'));
}
function showLoginErr(m){
  const e=document.getElementById('loginErr');
  e.textContent=m;e.style.display='block';
  setTimeout(()=>e.style.display='none',3000);
}
function doLogout(){
  APP.user=null;
  setAuthToken('');
  document.getElementById('loginPage').style.display='flex';
  document.getElementById('appShell').style.display='none';
}

// ============================================================
//  PAGES
// ============================================================
let currentPage=0;
const PAGES=[
  {id:'pg0',  icon:'🏠',label:'Dashboard',                section:'Dashboard'},
  {id:'pg1',  icon:'📋',label:'1. Course Info',           section:'Course Info & Setup'},
  {id:'pg2',  icon:'🎯',label:'2. CO / Objectives',       section:'Course Objectives & Outcomes'},
  {id:'pg3',  icon:'👥',label:'3. Student List',          section:'Student List'},
  {id:'pg4',  icon:'🔗',label:'4. CO-PO Matrix',          section:'CO-PO Mapping Matrix'},
  {id:'pg5',  icon:'📡',label:'5. Content Delivery',      section:'Modes of Content Delivery'},
  {id:'pg6',  icon:'⏱', label:'6. CO Hours',              section:'CO Teaching Hours'},
  {id:'pg7',  icon:'🧠',label:'7. Cognition Hrs',         section:'Cognition Learning Hours'},
  {id:'pg8',  icon:'📝',label:'8. Assessments',           section:'Assessment Instruments'},
  {id:'pg9',  icon:'🔗',label:'9. CIA Q-Paper',           section:'CIA Question Paper & CO-Q Mapping'},
  {id:'pg10', icon:'📊',label:'10. Marklist',             section:'Direct Assessment — Marklist'},
  {id:'pg11', icon:'📋',label:'11. Indirect (CES)',       section:'Indirect Assessment — CES Survey'},
  {id:'pg12', icon:'👁', label:'12. Learner Analysis',    section:'Student Learner Analysis'},
  {id:'pg13', icon:'📈',label:'13. Monitoring',           section:'Learner Monitoring'},
  {id:'pg14', icon:'⏰',label:'14. PO/PSO Hours',         section:'PO-PSO Learning Hours'},
  {id:'pg15', icon:'🎯',label:'15. CO Attainment',        section:'CO Attainment Calculation'},
  {id:'pg16', icon:'📉',label:'16. CO Gap Chart',         section:'CO Achievement / Gap Chart'},
  {id:'pg17', icon:'🔄',label:'17. CO Quality Loop',      section:'CO Quality Loop Closure'},
  {id:'pg18', icon:'🏆',label:'18. PO Attainment',        section:'Program Outcomes Attainment'},
  {id:'pg19', icon:'📉',label:'19. PO Gap Chart',         section:'PO Achievement / Gap Chart'},
  {id:'pg20', icon:'🔄',label:'20. PO Quality Loop',      section:'PO Quality Loop Closure'},
  {id:'pg21', icon:'🎓',label:'21. PSO Quality Loop',     section:'PSO Quality Loop Closure'},
  {id:'pg22', icon:'📋',label:'Annex-I: WK Profile',      section:'Annexure-I: Knowledge & Attitude Profile (WK)'},
  {id:'pg23', icon:'🏅',label:'23. Certificate',          section:'Course File Certificate'},
];

function initApp(){
  const u=APP.user;
  document.getElementById('sideUserName').textContent=u.name;
  document.getElementById('sideRoleBadge').textContent=u.role.toUpperCase();
  document.getElementById('sideRoleBadge').className='role-badge role-'+u.role;
  document.getElementById('sideAvatar').textContent=u.name[0];
  const colors={admin:'#dc2626',head:'#d97706',faculty:'#2563eb'};
  document.getElementById('sideAvatar').style.background=colors[u.role]||'#2563eb';
  buildSideNav();
  buildSubjectSelector();
  APP.currentSubjectId=Object.keys(APP.subjects)[0];
  syncSubjectSelector();
  buildContentPages();
  navigateTo(0);
  if(!window.__autosaveBound){
    document.addEventListener('change',()=>scheduleSave());
    setInterval(()=>{ if(APP.user) scheduleSave(); }, 20000);
    window.__autosaveBound=true;
  }
}

function buildSideNav(){
  const nav=document.getElementById('sideNav');
  nav.innerHTML='';
  PAGES.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='nav-item'+(i===0?' active':'');
    div.innerHTML='<span class="nav-icon">'+p.icon+'</span><span>'+p.label+'</span><span class="nav-num">'+(i>0?i:'')+'</span>';
    div.onclick=()=>navigateTo(i);
    nav.appendChild(div);
  });
}

function buildSubjectSelector(){
  const sel=document.getElementById('globalSubjectSel');
  sel.innerHTML='';
  Object.values(APP.subjects).forEach(s=>{
    const opt=document.createElement('option');
    opt.value=s.id;
    opt.textContent=s.code+' — '+s.name.substring(0,22);
    sel.appendChild(opt);
  });
}
function syncSubjectSelector(){document.getElementById('globalSubjectSel').value=APP.currentSubjectId;}
function switchSubject(id){
  scheduleSave();
  APP.currentSubjectId=id;
  buildContentPages();
  navigateTo(currentPage);
}
function sub(){return APP.subjects[APP.currentSubjectId];}

function buildContentPages(){
  const body=document.getElementById('contentBody');
  body.innerHTML=PAGES.map((p,i)=>'<div class="page" id="'+p.id+'"></div>').join('');
  renderPage(0);
}

function navigateTo(idx){
  currentPage=idx;
  document.querySelectorAll('.nav-item').forEach((n,i)=>n.classList.toggle('active',i===idx));
  document.querySelectorAll('.page').forEach((p,i)=>p.classList.toggle('active',i===idx));
  document.getElementById('topbarTitle').textContent=PAGES[idx].section;
  const s=sub();
  document.getElementById('topbarSub').textContent=s?(s.code+' — '+s.name):'';
  renderPage(idx);
}

function renderPage(idx){
  const el=document.getElementById(PAGES[idx].id);
  if(!el)return;
  const fns=[
    renderDashboard, renderCourseInfo, renderCOPage, renderStudents,
    renderCOPOMatrix, renderDelivery, renderCOHours, renderCognition,
    renderAssessments, renderCIAQPaper, renderMarklist, renderCES,
    renderLearnerAnalysis, renderMonitoring, renderPOHours,
    renderCOAttainment, renderCOChart, renderCOQuality,
    renderPOAttainment, renderPOChart, renderPOQuality,
    renderPSOQuality, renderAnnexureWK, renderCertificate
  ];
  if(fns[idx]) fns[idx](el);
  // Refresh charts for relevant tabs after render
  if(idx===5) setTimeout(renderDeliveryChart,50);
  if(idx===6) setTimeout(renderCOHoursChart,50);
  if(idx===7) setTimeout(renderBloomChart,50);
}

// ============================================================
//  PAGE 0: DASHBOARD
// ============================================================
function renderDashboard(el){
  const subjects=Object.values(APP.subjects);
  let html='<div class="g4" style="margin-bottom:20px">';
  html+='<div class="kpi blue"><div class="kpi-val">'+subjects.length+'</div><div class="kpi-label">Total Subjects</div><div class="kpi-sub">'+APP.user.role+' view</div></div>';
  html+='<div class="kpi green"><div class="kpi-val">'+subjects.reduce((a,s)=>a+s.students.length,0)+'</div><div class="kpi-label">Total Students</div></div>';
  html+='<div class="kpi gold"><div class="kpi-val">'+subjects.filter(s=>s.coAttainment[0]!==null).length+'</div><div class="kpi-label">Calculated</div></div>';
  html+='<div class="kpi purple"><div class="kpi-val">'+(APP.user.role==='admin'?Object.keys(USERS).length:1)+'</div><div class="kpi-label">Users</div></div>';
  html+='</div>';
  html+='<div class="card"><div class="card-header"><div class="card-title">📚 My Subjects</div>';
  html+='<button class="btn btn-sm btn-outline" onclick="openAddSubjectModal()">+ Add Subject</button></div><div class="card-body">';
  html+='<div class="g3">';
  subjects.forEach(s=>{
    html+='<div class="subject-card '+(s.id===APP.currentSubjectId?'active-sub':'')+'" onclick="switchSubjectAndGo(\''+s.id+'\',1)">';
    html+='<div class="sub-code">'+s.code+'</div>';
    html+='<div class="sub-name">'+s.name+'</div>';
    html+='<div class="sub-meta">'+s.dept+' • Sem '+s.sem+' • '+s.ay+'</div>';
    html+='<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">';
    html+='<span class="tag tag-blue">'+s.cos.length+' COs</span>';
    html+='<span class="tag tag-gray">'+s.students.length+' Students</span>';
    html+=(s.coAttainment[0]!==null?'<span class="tag tag-green">✓ Calculated</span>':'<span class="tag tag-gold">Pending</span>');
    html+='</div></div>';
  });
  html+='</div></div></div>';
  if(APP.user.role==='admin') html+=renderAdminPanel();
  el.innerHTML=html;
}
function switchSubjectAndGo(id,pg){APP.currentSubjectId=id;syncSubjectSelector();buildContentPages();navigateTo(pg);}

function renderAdminPanel(){
  let h='<div class="g2" style="margin-top:0">';
  // Users
  h+='<div class="card"><div class="card-header"><div class="card-title">👤 User Management</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddUserModal()">+ Add User</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Department</th><th>Action</th></tr></thead><tbody>';
  Object.entries(USERS).forEach(([u,d])=>{
    h+='<tr><td><code>'+u+'</code></td><td>'+d.name+'</td>';
    h+='<td><span class="role-badge role-'+d.role+'" style="padding:3px 8px;border-radius:20px;font-size:11px">'+d.role+'</span></td>';
    h+='<td>'+d.dept+'</td>';
    h+='<td><button class="btn btn-sm btn-danger" onclick="deleteUser(\''+u+'\')">✕ Remove</button></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // Departments
  h+='<div class="card"><div class="card-header"><div class="card-title">🏛 Department Management</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddDeptModal()">+ Add Department</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="left">Department Name</th><th>Subjects</th><th>Faculty</th><th>Action</th></tr></thead><tbody>';
  DEPARTMENTS.forEach((d,di)=>{
    h+='<tr><td>'+(di+1)+'</td><td class="left"><strong>'+d+'</strong></td>';
    h+='<td><span class="tag tag-blue">'+Object.values(APP.subjects).filter(s=>s.dept===d).length+'</span></td>';
    h+='<td><span class="tag tag-gray">'+Object.values(USERS).filter(u=>u.dept===d).length+'</span></td>';
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeDept('+di+')">✕</button></td></tr>';
  });
  h+='</tbody></table></div></div></div></div>';
  return h;
}
function openAddDeptModal(){
  document.getElementById('modalTitle').textContent='Add Department';
  document.getElementById('modalBody').innerHTML='<div class="fg"><label>Department Name</label><input type="text" id="nd_name" placeholder="e.g. Biotechnology Engineering"></div>';
  document.getElementById('modalFooter').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addDept()">Add Department</button>';
  document.getElementById('modalOverlay').classList.add('open');
}
async function addDept(){
  const n=document.getElementById('nd_name').value.trim();
  if(!n){showToast('Enter department name','error');return;}
  if(DEPARTMENTS.includes(n)){showToast('Already exists','error');return;}
  try{
    await apiFetch('/api/departments',{method:'POST',body:JSON.stringify({name:n})});
    DEPARTMENTS.push(n);closeModal();navigateTo(0);showToast('Department added!','success');
  }catch(e){
    showToast(e.message||'Failed to add department','error');
  }
}
async function removeDept(di){
  if(confirm('Remove department '+DEPARTMENTS[di]+'?')){
    try{
      await apiFetch('/api/departments/'+encodeURIComponent(DEPARTMENTS[di]),{method:'DELETE'});
      DEPARTMENTS.splice(di,1);navigateTo(0);showToast('Department removed','info');
    }catch(e){
      showToast(e.message||'Failed to remove department','error');
    }
  }
}

// ============================================================
//  PAGE 1: COURSE INFO
// ============================================================
function renderCourseInfo(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Fill all course details and attainment targets. Click Save — data reflects across all sections.</div>';
  h+='<div class="g2">';
  h+='<div class="card"><div class="card-header"><div class="card-title">🏛 Institution Details</div></div><div class="card-body">';
  h+=fg('Institution Name','inst_name',s.instName||s.name,'text');
  h+=fg('Department','inst_dept',s.dept,'text');
  h+=fg('Program','inst_prog',s.program||('B.E. '+s.dept),'text');
  h+=fg('Academic Year','ay',s.ay,'text');
  h+=fgSel('Semester','sem',['I','II','III','IV','V','VI','VII','VIII'],s.sem);
  h+=fg('Faculty Name','faculty_name',s.faculty,'text');
  h+='</div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">📚 Course Details</div></div><div class="card-body">';
  h+=fg('Course Name','c_name',s.name,'text');
  h+=fg('Course Code','c_code',s.code,'text');
  h+=fg('Credits','c_credits',s.credits,'number');
  h+=fg('Total Teaching Hours','c_hours',s.totalHours||48,'number');
  h+=fg('Batch / Division','c_batch',s.batch||'2022-26 / A','text');
  h+=fg('CIE Weight (%)','c_ciewt',(s.cieWeight*100),'number');
  h+=fg('ESE Weight (%)','c_esewt',(s.eseWeight*100),'number');
  h+='</div></div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🎯 Attainment Target Configuration</div></div><div class="card-body">';
  h+='<div class="instr"><strong>Marks Threshold:</strong> Minimum % marks a student must score to be counted as "attained" for that CO.</div>';
  h+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
  h+='<label style="font-size:12px;font-weight:700;color:var(--text2)">Marks Threshold (%)</label>';
  h+='<input type="range" min="40" max="80" step="5" value="'+s.coTargetPct+'" oninput="updateTargetPct(this.value)" style="flex:1">';
  h+='<span class="tag tag-blue" style="font-size:16px;font-weight:800;min-width:50px;text-align:center" id="pctDisplay">'+s.coTargetPct+'%</span>';
  h+='</div>';
  h+='<div class="g4" style="margin-bottom:16px">';
  h+='<div class="fg"><label>CO Target (0.00–3.00)</label>';
  h+='<input type="number" id="co_target" value="'+s.coTargetLevel.toFixed(2)+'" min="0" max="3" step="0.01" style="padding:9px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;width:100%"></div>';
  h+='<div class="fg"><label>PO Target (0.00–3.00)</label>';
  h+='<input type="number" id="po_target" value="'+s.poTarget.toFixed(2)+'" min="0" max="3" step="0.01" style="padding:9px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;width:100%"></div>';
  h+='<div class="fg"><label>PSO Target (0.00–3.00)</label>';
  h+='<input type="number" id="pso_target" value="'+s.psoTarget.toFixed(2)+'" min="0" max="3" step="0.01" style="padding:9px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;width:100%"></div>';
  h+='<div class="fg"><label>Direct Weight (%)</label>';
  h+='<input type="number" id="dir_wt" value="'+(s.directWeight*100)+'" min="50" max="90" step="5" style="padding:9px;border:1.5px solid var(--border2);border-radius:6px;width:100%"></div>';
  h+='</div>';
  // ---- Dynamic Attainment Level Configuration (NBA Standard) ----
  const savedLvlPct = s.attainLvlPct || {3:65,2:55,1:45};
  // Default SEE/CIE/CES ranges from NBA standard (editable)
  if(!s.seeLvl) s.seeLvl = {1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cieLvl) s.cieLvl = {1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cesLvl) s.cesLvl = {1:{min:75,max:80}, 2:{min:80,max:85}, 3:{min:85,max:100}};

  h+='<div style="margin:16px 0;padding:16px;background:linear-gradient(135deg,#f0f7ff,#e8f4ff);border-radius:12px;border:1.5px solid #93c5fd">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
  h+='<strong style="font-size:14px;color:#1d4ed8">A. Level of Attainments — Class Average for Course Outcome</strong>';
  h+='<div style="display:flex;gap:6px;align-items:center">';
  h+='<span style="font-size:11px;color:var(--text2)">Marks Threshold:</span>';
  h+='<span class="tag tag-blue" style="font-size:12px;font-weight:700" id="tpct_live">'+s.coTargetPct+'%</span>';
  h+='</div></div>';

  // NBA Standard SEE / CIE / CES table - editable ranges
  h+='<div class="tbl-wrap"><table class="attain-table" style="font-size:12px;border-collapse:collapse;width:100%">';
  h+='<thead>';
  h+='<tr style="background:#1e40af;color:#fff">';
  h+='<th rowspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center;width:60px">Level</th>';
  h+='<th colspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center">SEE / ESE (%)</th>';
  h+='<th colspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center">CIE (%)</th>';
  h+='<th colspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center">CES / Indirect (%)</th>';
  h+='<th rowspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center;min-width:80px">% Students<br>Must Pass</th>';
  h+='<th rowspan="2" style="padding:8px 12px;border:1px solid #93c5fd;text-align:center">Label</th>';
  h+='</tr>';
  h+='<tr style="background:#2563eb;color:#fff">';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&gt; (Min)</th>';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&lt;= (Max)</th>';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&gt; (Min)</th>';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&lt;= (Max)</th>';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&gt; (Min)</th>';
  h+='<th style="padding:6px 10px;border:1px solid #93c5fd;text-align:center">&lt;= (Max)</th>';
  h+='</tr>';
  h+='</thead><tbody>';

  const attainRows=[
    {lvl:1,bg:'#eff6ff',border:'#3b82f6',dot:'#3b82f6',label:'Minimum',lblTag:'tag-blue'},
    {lvl:2,bg:'#fffbeb',border:'#f59e0b',dot:'#f59e0b',label:'Satisfactory',lblTag:'tag-gold'},
    {lvl:3,bg:'#f0fdf4',border:'#22c55e',dot:'#22c55e',label:'Excellent',lblTag:'tag-green'},
  ];
  attainRows.forEach(function(r){
    const see=s.seeLvl[r.lvl];
    const cie=s.cieLvl[r.lvl];
    const ces=s.cesLvl[r.lvl];
    const passP=savedLvlPct[r.lvl]||{1:45,2:55,3:65}[r.lvl];
    h+='<tr style="background:'+r.bg+';border-left:4px solid '+r.border+'">';
    h+='<td style="padding:8px;border:1px solid #bfdbfe;text-align:center">';
    h+='<div style="width:30px;height:30px;border-radius:50%;background:'+r.dot+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;margin:auto">'+r.lvl+'</div></td>';
    // SEE min/max editable
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+see.min+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'see\','+r.lvl+',\'min\',+this.value)"></td>';
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+see.max+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'see\','+r.lvl+',\'max\',+this.value)"></td>';
    // CIE min/max editable
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+cie.min+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'cie\','+r.lvl+',\'min\',+this.value)"></td>';
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+cie.max+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'cie\','+r.lvl+',\'max\',+this.value)"></td>';
    // CES min/max editable
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+ces.min+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'ces\','+r.lvl+',\'min\',+this.value)"></td>';
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" value="'+ces.max+'" min="0" max="100" style="width:52px;padding:4px;border:1.5px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" onchange="updateLvlRange(\'ces\','+r.lvl+',\'max\',+this.value)"></td>';
    // Student pass % threshold (editable)
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">';
    h+='<input type="number" id="lvl_pct_'+r.lvl+'" value="'+passP+'" min="10" max="99" step="1" style="width:52px;padding:4px;border:2px solid '+r.border+';border-radius:4px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" oninput="updateAttainLvl('+r.lvl+',this.value)"></td>';
    h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center"><span class="tag '+r.lblTag+'">'+r.label+'</span></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';

  // Live threshold visual bar
  h+='<div style="margin-top:10px;padding:8px 10px;background:#fff;border-radius:8px;border:1px solid #dbeafe;display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
  h+='<span style="font-size:11px;color:var(--text2);font-weight:600">Threshold Visual:</span>';
  const l1v2=savedLvlPct[1]||45, l2v2=savedLvlPct[2]||55, l3v2=savedLvlPct[3]||65;
  h+='<div style="flex:1;min-width:200px;height:16px;border-radius:8px;background:#fee2e2;overflow:hidden;position:relative;border:1px solid #e2e8f0" id="lvlBar">';
  h+='<div style="position:absolute;left:0;top:0;width:'+l1v2+'%;height:100%;background:#dbeafe"></div>';
  h+='<div style="position:absolute;left:0;top:0;width:'+l2v2+'%;height:100%;background:#fef3c7"></div>';
  h+='<div style="position:absolute;left:0;top:0;width:'+l3v2+'%;height:100%;background:#d1fae5"></div>';
  h+='<span style="position:absolute;right:4px;top:0;line-height:16px;font-size:9px;font-weight:700;color:#059669">L3≥'+l3v2+'%</span>';
  h+='</div>';
  h+='<div style="display:flex;gap:10px;font-size:11px">';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#dbeafe;border-radius:2px;vertical-align:middle"></span> L1≥<span id="v_l1">'+l1v2+'</span>%</span>';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#fef3c7;border-radius:2px;vertical-align:middle"></span> L2≥<span id="v_l2">'+l2v2+'</span>%</span>';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#d1fae5;border-radius:2px;vertical-align:middle"></span> L3≥<span id="v_l3">'+l3v2+'</span>%</span>';
  h+='</div></div>';
  h+='<p style="font-size:10px;color:var(--text3);margin-top:6px">* All values are editable. SEE = End Semester Exam, CIE = Continuous Internal Evaluation, CES = Course Exit Survey. Click Save Configuration to persist changes.</p>';
  h+='</div>';
  // Indirect Assessment config
  h+='<div style="margin:16px 0;padding:14px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd">';
  h+='<strong style="font-size:13px;color:var(--accent2)">🔁 Indirect Assessment (CES) Configuration</strong>';
  h+='<p style="font-size:11px;color:var(--text2);margin:6px 0 10px">CES = Course Exit Survey. Ratings on 1–5 scale. Set the target score and weight below.</p>';
  h+='<div class="g4">';
  h+='<div class="fg"><label>CES Target Score (1–5)</label><input type="number" id="ces_target" value="'+(s.cesTarget||3.5)+'" min="1" max="5" step="0.1" style="padding:9px;border:1.5px solid #bae6fd;border-radius:6px;width:100%"></div>';
  h+='<div class="fg"><label>Indirect Weight (%)</label><input type="number" id="indir_wt" value="'+(s.indirectWeight*100)+'" min="10" max="50" step="5" style="padding:9px;border:1.5px solid #bae6fd;border-radius:6px;width:100%"></div>';
  h+='<div class="fg"><label>CES → Attainment (Score ≥4 → L3)</label><div style="padding:9px;background:#e0f2fe;border-radius:6px;font-size:12px">≥4.0→L3 | ≥3.5→L2 | ≥2.5→L1 | else→0</div></div>';
  h+='<div class="fg"><label>CES Survey Status</label><div style="padding:9px;background:#d1fae5;border-radius:6px;font-size:12px;color:var(--green)">'+( (s.cesData&&s.cesData.length)?s.cesData.length+' responses loaded':'Upload in Section 11')+'</div></div>';
  h+='</div></div>';
  h+='<button class="btn btn-primary" style="max-width:200px" onclick="saveCourseInfo()">💾 Save Configuration</button>';
  h+='</div></div>';
  el.innerHTML=h;
  // Update threshold displays when pct slider changes
  document.querySelectorAll("[id^='tpct_']").forEach(el2=>{el2.textContent=s.coTargetPct;});
}
function updateTargetPct(v){
  sub().coTargetPct=+v;
  const el=document.getElementById('pctDisplay');
  if(el)el.textContent=v+'%';
  const live=document.getElementById('tpct_live');
  if(live)live.textContent=v+'%';
}
function updateAttainLvl(lvl,val){
  if(!sub().attainLvlPct) sub().attainLvlPct={1:45,2:55,3:65};
  sub().attainLvlPct[lvl]=+val;
  const sp=document.getElementById('v_l'+lvl);
  if(sp) sp.textContent=val;
  const bar=document.getElementById('lvlBar');
  if(bar){
    const l1=+(document.getElementById('lvl_pct_1')||{value:45}).value;
    const l2=+(document.getElementById('lvl_pct_2')||{value:55}).value;
    const l3=+(document.getElementById('lvl_pct_3')||{value:65}).value;
    bar.innerHTML='<div style="position:absolute;left:0;top:0;width:'+l1+'%;height:100%;background:#dbeafe"></div>'
      +'<div style="position:absolute;left:0;top:0;width:'+l2+'%;height:100%;background:#fef3c7"></div>'
      +'<div style="position:absolute;left:0;top:0;width:'+l3+'%;height:100%;background:#d1fae5"></div>'
      +'<span style="position:absolute;right:4px;top:0;line-height:16px;font-size:9px;font-weight:700;color:#059669">L3≥'+l3+'%</span>';
  }
}
function updateLvlRange(type,lvl,field,val){
  const s=sub();
  const key=type==='see'?'seeLvl':type==='cie'?'cieLvl':'cesLvl';
  if(!s[key]) s[key]={1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  s[key][lvl][field]=val;
}
function saveCourseInfo(){
  const s=sub();
  const gv=(id,fb)=>{const el=document.getElementById(id);return el?el.value:fb;};
  s.instName=gv('inst_name',s.instName);
  s.name=gv('c_name',s.name);
  s.code=gv('c_code',s.code);
  s.dept=gv('inst_dept',s.dept);
  s.program=gv('inst_prog',s.program);
  s.ay=gv('ay',s.ay);
  s.sem=gv('sem',s.sem);
  s.faculty=gv('faculty_name',s.faculty);
  s.credits=+gv('c_credits',s.credits)||4;
  s.totalHours=+gv('c_hours',s.totalHours)||48;
  s.batch=gv('c_batch',s.batch);
  s.cieWeight=(+gv('c_ciewt',s.cieWeight*100))/100;
  s.eseWeight=(+gv('c_esewt',s.eseWeight*100))/100;
  s.coTargetLevel=parseFloat((+gv('co_target',s.coTargetLevel)).toFixed(2));
  s.poTarget=parseFloat((+gv('po_target',s.poTarget)).toFixed(2));
  s.psoTarget=parseFloat((+gv('pso_target',s.psoTarget)).toFixed(2));
  s.directWeight=(+gv('dir_wt',s.directWeight*100))/100;
  s.indirectWeight=1-s.directWeight;
  s.cesTarget=+(gv('ces_target',s.cesTarget||3.5));
  // Save SEE/CIE/CES level ranges (already saved live via updateLvlRange)
  if(!s.seeLvl) s.seeLvl={1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cieLvl) s.cieLvl={1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cesLvl) s.cesLvl={1:{min:75,max:80},2:{min:80,max:85},3:{min:85,max:100}};
  // Save dynamic attainment level thresholds
  if(!s.attainLvlPct) s.attainLvlPct={};
  [1,2,3].forEach(l=>{const el2=document.getElementById('lvl_pct_'+l);if(el2)s.attainLvlPct[l]=+el2.value;});
  buildSubjectSelector();syncSubjectSelector();
  document.getElementById('topbarSub').textContent=s.code+' — '+s.name;
  showToast('Configuration saved & reflected across all sections!','success');
}

// ============================================================
//  PAGE 2: CO / OBJECTIVES
// ============================================================
const BLOOM_LEVELS=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
const WK_LEVELS=['WK1','WK2','WK3','WK4','WK5','WK6','WK7','WK8','WK9'];

// Performance Indicators per Bloom Level
const BLOOM_PI={
  Remember:['PI-1.1: Recall facts and basic concepts','PI-1.2: Identify key terms and definitions','PI-1.3: List components or steps'],
  Understand:['PI-2.1: Explain concepts in own words','PI-2.2: Interpret data or information','PI-2.3: Classify or categorize examples'],
  Apply:['PI-3.1: Use methods in familiar situations','PI-3.2: Execute procedures to solve problems','PI-3.3: Demonstrate use of tools/software'],
  Analyze:['PI-4.1: Differentiate between components','PI-4.2: Organize and relate parts to whole','PI-4.3: Identify cause-effect relationships'],
  Evaluate:['PI-5.1: Justify design/solution choices','PI-5.2: Critique methods or outcomes','PI-5.3: Assess performance against criteria'],
  Create:['PI-6.1: Design new systems or processes','PI-6.2: Produce original work or prototype','PI-6.3: Develop and test new solutions'],
};

function renderCOPage(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Define Course Objectives (intent) and Course Outcomes (measurable). Select Bloom\'s level, WK knowledge base, and Performance Indicator for each CO.</div>';
  // Objectives table
  h+='<div class="card"><div class="card-header"><div class="card-title">🎯 Course Objectives</div><span class="tag tag-purple">What the course aims to teach</span></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th style="width:70px">OBJ#</th><th class="left">Objective Statement</th></tr></thead><tbody>';
  s.cos.forEach((co,i)=>{
    h+='<tr><td><span class="co-tag" style="background:#ede9fe;color:#7c3aed">OBJ'+(i+1)+'</span></td>';
    h+='<td class="left"><textarea rows="2" style="width:100%;padding:8px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:13px;resize:vertical" onchange="sub().cos['+i+'].objective=this.value">'+co.objective+'</textarea></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // Outcomes table with Bloom + WK + PI
  h+='<div class="card"><div class="card-header"><div class="card-title">✅ Course Outcomes — with Bloom\'s Level & Performance Indicators</div>';
  h+='<button class="btn btn-sm btn-success" onclick="saveCOs()">💾 Save COs</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr>';
  h+='<th style="width:55px">CO</th><th class="left" style="min-width:200px">Outcome Statement</th>';
  h+='<th style="width:120px">Bloom\'s Level</th><th style="width:80px">WK Level</th>';
  h+='<th class="left" style="min-width:180px">Performance Indicator (PI)</th>';
  h+='</tr></thead><tbody>';
  s.cos.forEach((co,i)=>{
    const piOptions=(BLOOM_PI[co.bloom]||BLOOM_PI['Remember']);
    h+='<tr style="background:'+(i%2?'var(--surface2)':'var(--surface)')+'">';
    h+='<td><span class="co-tag">'+co.id+'</span></td>';
    h+='<td class="left"><textarea rows="2" style="width:100%;padding:7px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px;resize:vertical" onchange="sub().cos['+i+'].outcome=this.value">'+co.outcome+'</textarea></td>';
    h+='<td><select style="padding:6px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px;width:100%" onchange="sub().cos['+i+'].bloom=this.value;renderCOPage(document.getElementById(PAGES[2].id))">';
    BLOOM_LEVELS.forEach(b=>{ h+='<option'+(co.bloom===b?' selected':'')+'>'+b+'</option>'; });
    h+='</select>';
    h+='<div class="tag tag-blue" style="margin-top:4px;font-size:10px;text-align:center">L'+(BLOOM_LEVELS.indexOf(co.bloom)+1)+'</div></td>';
    // WK multi-select checkboxes
    const coWks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
    h+='<td style="min-width:160px"><div style="display:flex;flex-wrap:wrap;gap:3px;max-height:90px;overflow-y:auto;padding:4px;border:1.5px solid var(--border2);border-radius:6px;background:#fff">';
    WK_LEVELS.forEach(function(w){
      const sel=coWks.includes(w);
      h+='<label style="display:flex;align-items:center;gap:3px;font-size:10px;font-weight:600;cursor:pointer;padding:2px 4px;border-radius:4px;background:'+(sel?'#dbeafe':'#f1f5f9')+';color:'+(sel?'#2563eb':'#64748b')+'">';
      h+='<input type="checkbox" data-ci="'+i+'" data-wk="'+w+'"'+(sel?' checked':'')+' onchange="handleWKToggle(this)" style="width:11px;height:11px">'+w+'</label>';
    });
    h+='</div></td>';
    // PI — blank editable textarea
    h+='<td class="left"><textarea rows="2" placeholder="Enter Performance Indicator..." style="width:100%;padding:5px;border:1.5px solid var(--border2);border-radius:5px;font-family:inherit;font-size:11px;resize:vertical" onchange="sub().cos['+i+'].pi=this.value">'+(co.pi||'')+'</textarea></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  // Summary preview
  h+='<div style="margin-top:16px;background:var(--surface2);border-radius:8px;padding:14px;border-left:4px solid var(--accent)">';
  h+='<strong style="color:var(--accent);font-size:13px">📄 Report Preview — CO Summary Table</strong>';
  h+='<div class="tbl-wrap" style="margin-top:10px"><table>';
  h+='<thead><tr style="background:var(--surface3)"><th>CO</th><th class="left">Objective</th><th class="left">Outcome</th><th>Bloom</th><th>WK</th><th>PI</th></tr></thead><tbody>';
  s.cos.forEach(co=>{
    h+='<tr><td><strong>'+co.id+'</strong></td>';
    h+='<td class="left" style="font-size:11px">'+co.objective.substring(0,50)+'...</td>';
    h+='<td class="left" style="font-size:11px">'+co.outcome.substring(0,60)+'...</td>';
    h+='<td><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span></td>';
    const wkArr=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);h+='<td>'+wkArr.map(w=>'<span class="tag tag-blue" style="font-size:10px;margin:1px">'+w+'</span>').join('')+'</td>';
    h+='<td style="font-size:10px;color:var(--text2)">'+(co.pi||'—')+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  h+='</div></div>';
  el.innerHTML=h;
}
function saveCOs(){showToast('Course Objectives & Outcomes saved!','success');}
function toggleCOWK(ci,wk,checked){
  const co=sub().cos[ci];
  if(!Array.isArray(co.wk)) co.wk=co.wk?[co.wk]:[];
  if(checked&&!co.wk.includes(wk)) co.wk.push(wk);
  if(!checked) co.wk=co.wk.filter(w=>w!==wk);
  renderCOPage(document.getElementById(PAGES[2].id));
}
function handleWKToggle(el){
  const ci=+el.getAttribute('data-ci');
  const wk=el.getAttribute('data-wk');
  toggleCOWK(ci,wk,el.checked);
}

// ============================================================
//  PAGE 3: STUDENTS
// ============================================================
function renderStudents(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Upload student list via Excel (Roll No, Name, Gender) or add manually. No attendance needed here.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  h+='<button class="btn btn-sm btn-gold" onclick="downloadStudentTemplate()">⬇ Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'stuUpload\').click()">📁 Upload Excel</button>';
  h+='<input type="file" id="stuUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadStudents(this)">';
  h+='<button class="btn btn-sm btn-success" onclick="genSampleStudents()">🎲 Sample Students</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddStudentModal()">+ Add Manual</button></div>';
  if(!s.students.length){
    h+='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:48px">👥</div><div>No students yet. Upload Excel or add manually.</div></div></div>';
  } else {
    h+='<div class="card"><div class="card-header"><div class="card-title">👥 Student List</div>';
    h+='<div class="kpi blue" style="padding:8px"><div class="kpi-val" style="font-size:20px">'+s.students.length+'</div><div class="kpi-label">Students</div></div>';
    h+='</div><div class="card-body"><div class="tbl-wrap"><table>';
    h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th><th>Gender</th><th>Category</th><th>Action</th></tr></thead><tbody>';
    s.students.forEach((st,i)=>{
      h+='<tr><td>'+(i+1)+'</td><td class="left"><code style="font-size:11px">'+st.roll+'</code></td>';
      h+='<td class="left">'+st.name+'</td><td>'+st.gender+'</td><td>'+(st.category||'General')+'</td>';
      h+='<td><button class="btn btn-sm btn-danger" onclick="removeStudent('+i+')">✕</button></td></tr>';
    });
    h+='</tbody></table></div></div></div>';
  }
  el.innerHTML=h;
}
function removeStudent(i){sub().students.splice(i,1);renderStudents(document.getElementById(PAGES[3].id));}
function genSampleStudents(){
  const s=sub();
  s.students=Array.from({length:30},(_, i)=>({
    roll:'CS301'+(100+i),name:'Student '+(i+1),
    gender:i%3===0?'Female':'Male',category:'General'
  }));
  renderStudents(document.getElementById(PAGES[3].id));
  showToast('30 sample students added','info');
}
function downloadStudentTemplate(){
  const ws=XLSX.utils.aoa_to_sheet([['Roll No','Name','Gender','Category']]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Students');
  XLSX.writeFile(wb,'student_template.xlsx');
}
function uploadStudents(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    sub().students=data.map(r=>({roll:String(r['Roll No']||r['roll']||''),name:String(r['Name']||r['name']||''),gender:String(r['Gender']||'Male'),category:String(r['Category']||'General')})).filter(r=>r.roll);
    renderStudents(document.getElementById(PAGES[3].id));
    showToast(sub().students.length+' students loaded','success');
  };reader.readAsArrayBuffer(f);
}
function openAddStudentModal(){
  document.getElementById('modalTitle').textContent='Add Student';
  document.getElementById('modalBody').innerHTML=fg('Roll No','ns_roll','','text')+fg('Name','ns_name','','text')+fgSel('Gender','ns_gender',['Male','Female'],'Male');
  document.getElementById('modalFooter').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addStudentManual()">Add</button>';
  document.getElementById('modalOverlay').classList.add('open');
}
function addStudentManual(){
  const roll=document.getElementById('ns_roll').value;
  const name=document.getElementById('ns_name').value;
  if(!roll||!name){showToast('Roll No and Name required','error');return;}
  sub().students.push({roll,name,gender:document.getElementById('ns_gender').value,category:'General'});
  closeModal();renderStudents(document.getElementById(PAGES[3].id));showToast('Student added','success');
}

// ============================================================
//  PAGE 4: CO-PO MATRIX
// ============================================================
function renderCOPOMatrix(el){
  const s=sub();
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),'PSO1','PSO2','PSO3'];
  let h='<div class="instr"><strong>📌 Instructions:</strong> Click cells to cycle 1→2→3 (strength of mapping). 3=High, 2=Medium, 1=Low, empty=no mapping. Averages shown at bottom.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🔗 CO-PO / CO-PSO Mapping Matrix</div>';
  h+='<div style="display:flex;gap:8px;font-size:12px">';
  h+='<span class="tag tag-green">3 = High</span><span class="tag tag-gold">2 = Medium</span><span class="tag tag-blue">1 = Low</span>';
  h+='<button class="btn btn-sm btn-success" onclick="showToast(\'Matrix saved!\',\'success\')">Save Matrix</button>';
  h+='</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table>';
  h+='<thead><tr><th style="min-width:60px">CO</th>';
  allPOs.forEach(p=>{ h+='<th style="width:50px">'+p+'</th>'; });
  h+='<th>Avg</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const nz=s.copoPOMatrix[ci].filter(v=>v>0);
    const avg=nz.length?(nz.reduce((a,b)=>a+b,0)/nz.length).toFixed(2):'-';
    h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
    s.copoPOMatrix[ci].forEach((v,pi)=>{
      h+='<td><div class="mv mv-'+v+'" onclick="cycleMV('+ci+','+pi+',this)" style="cursor:pointer;user-select:none">'+(v||'')+'</div></td>';
    });
    h+='<td><strong class="tag tag-blue" style="font-family:monospace">'+avg+'</strong></td></tr>';
  });
  // PO avg row
  h+='<tr style="background:var(--surface2)"><td><strong>Avg</strong></td>';
  allPOs.forEach((_,pi)=>{
    const vals=s.copoPOMatrix.map(row=>row[pi]).filter(v=>v>0);
    const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2):'-';
    h+='<td><strong style="font-family:monospace">'+avg+'</strong></td>';
  });
  h+='<td></td></tr>';
  h+='</tbody></table></div>';
  // Full matrix report view
  h+='<div style="margin-top:16px;background:var(--surface2);border-radius:8px;padding:14px">';
  h+='<strong style="color:var(--accent);font-size:13px">📄 Full Matrix — All CO×PO Values</strong>';
  h+='<div id="copoPrintView" style="margin-top:10px;overflow-x:auto"></div></div>';
  h+='</div></div>';
  el.innerHTML=h;
  buildCopoPrintView();
}
function buildCopoPrintView(){
  const s=sub();
  const el=document.getElementById('copoPrintView');
  if(!el||!s)return;
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),'PSO1','PSO2','PSO3'];
  const coAvg=s.copoPOMatrix.map(row=>{const nz=row.filter(v=>v>0);return nz.length?(nz.reduce((a,b)=>a+b,0)/nz.length).toFixed(2):'-';});
  const poAvg=allPOs.map((_,pi)=>{const vals=s.copoPOMatrix.map(row=>row[pi]).filter(v=>v>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2):'-';});
  let h='<table style="font-size:11px;border-collapse:collapse;width:100%">';
  h+='<thead><tr style="background:#f1f5f9"><th style="padding:5px;border:1px solid #cbd5e1">CO</th>';
  allPOs.forEach(p=>{ h+='<th style="padding:5px;border:1px solid #cbd5e1">'+p+'</th>'; });
  h+='<th style="padding:5px;border:1px solid #dbeafe;background:#dbeafe">Avg</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    h+='<tr><td style="padding:5px;border:1px solid #cbd5e1;font-weight:700;color:#2563eb">'+co.id+'</td>';
    s.copoPOMatrix[ci].forEach(v=>{
      const bg=v===3?'#d1fae5':v===2?'#fef3c7':v===1?'#dbeafe':'#f8fafc';
      h+='<td style="padding:5px;border:1px solid #cbd5e1;text-align:center;background:'+bg+';font-weight:600">'+(v||'-')+'</td>';
    });
    h+='<td style="padding:5px;border:1px solid #cbd5e1;text-align:center;background:#dbeafe;font-weight:700">'+coAvg[ci]+'</td></tr>';
  });
  h+='<tr style="background:#f1f5f9"><td style="padding:5px;border:1px solid #cbd5e1;font-weight:700">PO Avg</td>';
  poAvg.forEach(v=>{ h+='<td style="padding:5px;border:1px solid #cbd5e1;text-align:center;font-weight:700">'+v+'</td>'; });
  h+='<td></td></tr></tbody></table>';
  el.innerHTML=h;
}
function cycleMV(ci,pi,el){
  const s=sub();
  const cur=s.copoPOMatrix[ci][pi]||0;
  const next=cur>=3?0:cur+1;
  s.copoPOMatrix[ci][pi]=next;
  el.textContent=next||'';
  el.className='mv mv-'+next;
  buildCopoPrintView();
}

// ============================================================
//  PAGE 5: CONTENT DELIVERY
// ============================================================
function renderDelivery(el){
  const s=sub();
  if(!s.deliveryHrs){
    s.deliveryHrs=Array.from({length:s.deliveryModes.length},()=>Array(s.cos.length).fill(0));
  }
  let h='<div class="instr"><strong>📌 Instructions:</strong> Enter hours for each CO under each delivery mode.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">📡 Modes of Content Delivery</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="addDeliveryMode()">+ Add Mode</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th class="left">Mode</th>';
  s.cos.forEach(c=>{ h+='<th>'+c.id+'</th>'; });
  h+='<th>Total</th><th>Action</th></tr></thead><tbody>';
  s.deliveryModes.forEach((mode,mi)=>{
    const rowTotal=(s.deliveryHrs[mi]||[]).reduce((a,b)=>a+b,0);
    h+='<tr><td class="left"><input type="text" value="'+mode+'" onchange="sub().deliveryModes['+mi+']=this.value" style="border:none;background:transparent;font-weight:600;font-size:13px;width:140px;font-family:inherit"></td>';
    s.cos.forEach((_,ci)=>{
      h+='<td><input type="number" value="'+((s.deliveryHrs[mi]||[])[ci]||0)+'" min="0" max="20" onchange="setDeliveryHr('+mi+','+ci+',+this.value)" style="width:50px"></td>';
    });
    h+='<td><strong style="color:var(--accent)">'+rowTotal+'</strong></td>';
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeDeliveryMode('+mi+')">✕</button></td></tr>';
  });
  h+='</tbody><tfoot id="delivFoot"></tfoot></table></div></div></div>';
  // Chart: CO-wise total delivery hours
  h+='<div class="card"><div class="card-header"><div class="card-title">📊 CO Delivery Hours — Bar Chart</div></div><div class="card-body">';
  h+='<div id="delivChart" style="overflow-x:auto;padding:8px"></div></div></div>';
  el.innerHTML=h;
  updateDeliveryFoot();
  renderDeliveryChart();
}
function renderDeliveryChart(){
  const s=sub();const el=document.getElementById('delivChart');if(!el)return;
  const coTotals=s.cos.map((_,ci)=>(s.deliveryHrs||[]).reduce((a,row)=>a+(row[ci]||0),0));
  const maxV=Math.max(...coTotals,1);
  const W=60,GAP=12,H=200,PAD=30;
  const svgW=(W+GAP)*coTotals.length+GAP+40;
  let svg='<svg width="'+svgW+'" height="'+(H+PAD+30)+'" style="font-family:inherit">';
  // Y axis labels
  [0,1,2,3].forEach(i=>{const y=H-Math.round((i/3)*H)+PAD;svg+='<text x="28" y="'+y+'" font-size="9" fill="#94a3b8" text-anchor="end">'+Math.round((i/3)*maxV)+'</text><line x1="30" y1="'+y+'" x2="'+(svgW-10)+'" y2="'+y+'" stroke="#e2e8f0" stroke-dasharray="4"/>';});
  // Mode legend
  const COLORS=['#2563eb','#0ea5e9','#059669','#d97706','#7c3aed','#dc2626','#ea580c'];
  s.deliveryModes.forEach((m,mi)=>{
    svg+='<rect x="'+(30+mi*90)+'" y="'+(H+PAD+10)+'" width="10" height="10" fill="'+COLORS[mi%COLORS.length]+'"/>';
    svg+='<text x="'+(42+mi*90)+'" y="'+(H+PAD+19)+'" font-size="9" fill="#475569">'+m.substring(0,10)+'</text>';
  });
  // Stacked bars
  coTotals.forEach((total,ci)=>{
    const x=30+ci*(W+GAP)+GAP;let yBase=H+PAD;
    s.deliveryModes.forEach((m,mi)=>{
      const v=(s.deliveryHrs[mi]||[])[ci]||0;
      if(!v)return;
      const bH=Math.round((v/maxV)*H);
      yBase-=bH;
      svg+='<rect x="'+x+'" y="'+yBase+'" width="'+W+'" height="'+bH+'" fill="'+COLORS[mi%COLORS.length]+'" rx="2" opacity="0.88"><title>'+m+': '+v+'h</title></rect>';
    });
    svg+='<text x="'+(x+W/2)+'" y="'+(H+PAD+6)+'" font-size="10" fill="#2563eb" text-anchor="middle" font-weight="700">'+s.cos[ci].id+'</text>';
    svg+='<text x="'+(x+W/2)+'" y="'+(yBase-4)+'" font-size="9" fill="#0f172a" text-anchor="middle" font-weight="700">'+(total||'')+'</text>';
  });
  svg+='</svg>';
  el.innerHTML=svg;
}
function setDeliveryHr(mi,ci,v){if(!sub().deliveryHrs[mi])sub().deliveryHrs[mi]=[];sub().deliveryHrs[mi][ci]=v;updateDeliveryFoot();}
function updateDeliveryFoot(){
  const s=sub();const el=document.getElementById('delivFoot');if(!el)return;
  const totals=s.cos.map((_,ci)=>(s.deliveryHrs||[]).reduce((a,row)=>a+(row[ci]||0),0));
  let h='<tr><td class="left"><strong>Total</strong></td>';
  totals.forEach(t=>{ h+='<td><strong>'+t+'</strong></td>'; });
  h+='<td><strong>'+totals.reduce((a,b)=>a+b,0)+'</strong></td><td></td></tr>';
  el.innerHTML=h;
}
function addDeliveryMode(){const s=sub();s.deliveryModes.push('New Mode');if(!s.deliveryHrs)s.deliveryHrs=[];s.deliveryHrs.push(Array(s.cos.length).fill(0));renderDelivery(document.getElementById(PAGES[5].id));}
function removeDeliveryMode(mi){const s=sub();s.deliveryModes.splice(mi,1);if(s.deliveryHrs)s.deliveryHrs.splice(mi,1);renderDelivery(document.getElementById(PAGES[5].id));}

// ============================================================
//  PAGE 6: CO HOURS
// ============================================================
function renderCOHours(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Enter teaching hours per CO per hour type. Totals auto-computed.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">⏱ CO Teaching Hours</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="addHourCol()">+ Add Column</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th class="left">CO</th><th class="left">Outcome</th>';
  s.hourCols.forEach((c,i)=>{ h+='<th>'+c+' <button class="btn btn-sm btn-danger" style="padding:1px 5px;font-size:10px" onclick="removeHourCol('+i+')">✕</button></th>'; });
  h+='<th>Total</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const hrs=s.hourCols.map((_,hi)=>s.coHours[ci][hi]||0);
    const total=hrs.reduce((a,b)=>a+b,0);
    h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
    h+='<td class="left" style="font-size:12px;max-width:180px">'+co.outcome.substring(0,60)+'...</td>';
    s.hourCols.forEach((_,hi)=>{ h+='<td><input type="number" value="'+(s.coHours[ci][hi]||0)+'" min="0" max="40" onchange="sub().coHours['+ci+']['+hi+']=+this.value" style="width:60px"></td>'; });
    h+='<td><strong>'+total+'</strong></td></tr>';
  });
  h+='<tfoot><tr><td colspan="2" class="left"><strong>Total</strong></td>';
  s.hourCols.forEach((_,hi)=>{ h+='<td><strong>'+s.cos.reduce((a,_,ci)=>a+(s.coHours[ci][hi]||0),0)+'</strong></td>'; });
  h+='<td><strong>'+s.cos.reduce((a,_,ci)=>a+s.hourCols.reduce((b,_,hi)=>b+(s.coHours[ci][hi]||0),0),0)+'</strong></td>';
  h+='</tr></tfoot></table></div></div></div>';
  // Grouped bar chart
  h+='<div class="card"><div class="card-header"><div class="card-title">📊 CO Teaching Hours — Bar Chart</div></div><div class="card-body">';
  h+='<div id="hoursChart" style="overflow-x:auto;padding:8px"></div></div></div>';
  el.innerHTML=h;
  renderCOHoursChart();
}
function renderCOHoursChart(){
  const s=sub();const el=document.getElementById('hoursChart');if(!el)return;
  const coTotals=s.cos.map((_,ci)=>s.hourCols.reduce((a,_,hi)=>a+(s.coHours[ci][hi]||0),0));
  const maxV=Math.max(...coTotals,1);
  const COLORS=['#2563eb','#0ea5e9','#059669','#d97706'];
  const W=56,GAP=10,H=180,PAD=30;
  const svgW=(W+GAP)*s.cos.length+GAP+40;
  let svg='<svg width="'+svgW+'" height="'+(H+PAD+40)+'" style="font-family:inherit">';
  [0,1,2,3].forEach(i=>{const y=H-Math.round((i/3)*H)+PAD;svg+='<text x="28" y="'+y+'" font-size="9" fill="#94a3b8" text-anchor="end">'+Math.round((i/3)*maxV)+'h</text><line x1="30" y1="'+y+'" x2="'+(svgW-10)+'" y2="'+y+'" stroke="#e2e8f0" stroke-dasharray="4"/>';});
  s.hourCols.forEach((col,hi)=>{svg+='<rect x="'+(30+hi*80)+'" y="'+(H+PAD+14)+'" width="10" height="10" fill="'+COLORS[hi%COLORS.length]+'"/><text x="'+(42+hi*80)+'" y="'+(H+PAD+23)+'" font-size="9" fill="#475569">'+col+'</text>';});
  s.cos.forEach((_,ci)=>{
    const x=30+ci*(W+GAP)+GAP;let yBase=H+PAD;
    s.hourCols.forEach((_,hi)=>{const v=s.coHours[ci][hi]||0;if(!v)return;const bH=Math.round((v/maxV)*H);yBase-=bH;svg+='<rect x="'+x+'" y="'+yBase+'" width="'+W+'" height="'+bH+'" fill="'+COLORS[hi%COLORS.length]+'" rx="2" opacity="0.85"><title>'+s.hourCols[hi]+': '+v+'h</title></rect>';});
    svg+='<text x="'+(x+W/2)+'" y="'+(H+PAD+10)+'" font-size="10" fill="#2563eb" text-anchor="middle" font-weight="700">'+s.cos[ci].id+'</text>';
    svg+='<text x="'+(x+W/2)+'" y="'+(yBase-4)+'" font-size="9" fill="#0f172a" text-anchor="middle" font-weight="700">'+coTotals[ci]+'</text>';
  });
  svg+='</svg>';
  el.innerHTML=svg;
}
function addHourCol(){const n=prompt('Column name:','Seminar');if(n){const s=sub();s.hourCols.push(n);s.coHours.forEach(row=>row.push(0));renderCOHours(document.getElementById(PAGES[6].id));}}
function removeHourCol(hi){const s=sub();s.hourCols.splice(hi,1);s.coHours.forEach(row=>row.splice(hi,1));renderCOHours(document.getElementById(PAGES[6].id));}

// ============================================================
//  PAGE 7: COGNITION
// ============================================================
function renderCognition(el){
  const s=sub();
  const blevels=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
  let h='<div class="instr"><strong>📌 Instructions:</strong> Enter hours spent at each cognitive level (Bloom\'s Taxonomy) per CO.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🧠 Cognition Learning Hours (Bloom\'s Taxonomy)</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>CO</th>';
  blevels.forEach((b,i)=>{ h+='<th>L'+(i+1)+': '+b+'</th>'; });
  h+='<th>Total</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const total=s.bloomHrs[ci].reduce((a,b)=>a+b,0);
    h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
    s.bloomHrs[ci].forEach((v,bi)=>{ h+='<td><input type="number" value="'+v+'" min="0" max="40" onchange="sub().bloomHrs['+ci+']['+bi+']=+this.value" style="width:60px"></td>'; });
    h+='<td><strong>'+total+'</strong></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // Bloom hours stacked chart
  h+='<div class="card"><div class="card-header"><div class="card-title">📊 Cognition Hours — Bloom\'s Level Distribution Chart</div></div><div class="card-body">';
  h+='<div id="bloomChart" style="overflow-x:auto;padding:8px"></div>';
  // Also overall Bloom distribution donut-style bar
  h+='<div id="bloomOverall" style="margin-top:16px;padding:10px;background:var(--surface2);border-radius:8px"></div>';
  h+='</div></div>';
  el.innerHTML=h;
  renderBloomChart();
}
function renderBloomChart(){
  const s=sub();
  const el=document.getElementById('bloomChart');if(!el)return;
  const BCOLORS=['#7c3aed','#2563eb','#0ea5e9','#059669','#d97706','#dc2626'];
  const BNAMES=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
  const W=54,GAP=10,H=170,PAD=28;
  const svgW=(W+GAP)*s.cos.length+GAP+40;
  const allTotals=s.cos.map((_,ci)=>s.bloomHrs[ci].reduce((a,b)=>a+b,0));
  const maxV=Math.max(...allTotals,1);
  let svg='<svg width="'+svgW+'" height="'+(H+PAD+44)+'" style="font-family:inherit">';
  [0,1,2].forEach(i=>{const y=H-Math.round((i/2)*H)+PAD;svg+='<text x="28" y="'+y+'" font-size="9" fill="#94a3b8" text-anchor="end">'+Math.round((i/2)*maxV)+'h</text><line x1="30" y1="'+y+'" x2="'+(svgW-10)+'" y2="'+y+'" stroke="#e2e8f0" stroke-dasharray="3"/>';});
  BNAMES.forEach((b,bi)=>{svg+='<rect x="'+(30+bi*78)+'" y="'+(H+PAD+14)+'" width="10" height="10" fill="'+BCOLORS[bi]+'"/><text x="'+(42+bi*78)+'" y="'+(H+PAD+23)+'" font-size="8" fill="#475569">L'+(bi+1)+':'+b.substring(0,5)+'</text>';});
  s.cos.forEach((_,ci)=>{
    const x=30+ci*(W+GAP)+GAP;let yBase=H+PAD;
    s.bloomHrs[ci].forEach((v,bi)=>{if(!v)return;const bH=Math.round((v/maxV)*H);yBase-=bH;svg+='<rect x="'+x+'" y="'+yBase+'" width="'+W+'" height="'+bH+'" fill="'+BCOLORS[bi]+'" rx="2" opacity="0.85"><title>L'+(bi+1)+' '+BNAMES[bi]+': '+v+'h</title></rect>';});
    svg+='<text x="'+(x+W/2)+'" y="'+(H+PAD+10)+'" font-size="10" fill="#2563eb" text-anchor="middle" font-weight="700">'+s.cos[ci].id+'</text>';
    if(allTotals[ci])svg+='<text x="'+(x+W/2)+'" y="'+(yBase-4)+'" font-size="9" fill="#0f172a" text-anchor="middle" font-weight="700">'+allTotals[ci]+'</text>';
  });
  svg+='</svg>';
  el.innerHTML=svg;
  // Overall distribution
  const oel=document.getElementById('bloomOverall');if(!oel)return;
  const totByLevel=BNAMES.map((_,bi)=>s.cos.reduce((a,_,ci)=>a+(s.bloomHrs[ci][bi]||0),0));
  const grand=totByLevel.reduce((a,b)=>a+b,0)||1;
  let oh='<strong style="font-size:12px;color:var(--text2)">Overall Bloom\'s Distribution across all COs</strong><div style="display:flex;height:20px;border-radius:6px;overflow:hidden;margin:8px 0">';
  totByLevel.forEach((v,bi)=>{if(!v)return;const pct=(v/grand*100).toFixed(1);oh+='<div style="width:'+pct+'%;background:'+BCOLORS[bi]+';cursor:default;transition:.3s" title="L'+(bi+1)+' '+BNAMES[bi]+': '+v+'h ('+pct+'%)"></div>';});
  oh+='</div><div style="display:flex;gap:12px;flex-wrap:wrap;">';
  totByLevel.forEach((v,bi)=>{oh+='<span style="font-size:11px"><span style="display:inline-block;width:10px;height:10px;background:'+BCOLORS[bi]+';border-radius:2px;margin-right:3px"></span>L'+(bi+1)+' '+BNAMES[bi]+': <strong>'+v+'h</strong> ('+(v/grand*100).toFixed(1)+'%)</span>';});
  oh+='</div>';
  oel.innerHTML=oh;
}

// ============================================================
//  PAGE 8: ASSESSMENTS — Direct & Indirect
// ============================================================
function renderAssessments(el){
  const s=sub();
  const directTypes=['CIE','ESE','Lab','Assignment','Seminar'];
  const indirectTypes=['CES','Peer Review','Alumni Survey','Employer Survey','Exit Survey'];
  const directList=s.assessments.filter(a=>directTypes.includes(a.type)||!indirectTypes.includes(a.type));
  const indirectList=s.assessments.filter(a=>indirectTypes.includes(a.type));

  let h='<div class="instr"><strong>📌 Instructions:</strong> Direct assessments measure CO attainment directly through marks. Indirect assessments capture student/stakeholder perception. Both contribute to final CO attainment.</div>';

  // Summary KPIs
  h+='<div class="g4" style="margin-bottom:20px">';
  h+='<div class="kpi blue"><div class="kpi-val">'+directList.length+'</div><div class="kpi-label">Direct Assessments</div><div class="kpi-sub">CIE + ESE + Lab</div></div>';
  h+='<div class="kpi purple"><div class="kpi-val">'+indirectList.length+'</div><div class="kpi-label">Indirect Assessments</div><div class="kpi-sub">CES + Survey</div></div>';
  h+='<div class="kpi green"><div class="kpi-val">'+(s.cieWeight*100).toFixed(0)+'%</div><div class="kpi-label">CIE Weight</div></div>';
  h+='<div class="kpi gold"><div class="kpi-val">'+(s.directWeight*100).toFixed(0)+'%</div><div class="kpi-label">Direct Weight</div></div>';
  h+='</div>';

  // ---- DIRECT ASSESSMENT TABLE ----
  h+='<div class="card" style="border-left:4px solid var(--accent)">';
  h+='<div class="card-header"><div class="card-title">📝 Direct Assessments <span style="font-size:11px;color:var(--text2);font-weight:400">(CIE / ESE / Lab / Assignment)</span></div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" onclick="addDirectAssessment()">+ Add Direct</button>';
  h+='</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="left">Name</th><th>Type</th><th>Max</th><th>Pass</th><th>Weight</th>';
  s.cos.forEach(c=>{ h+='<th>'+c.id+'</th>'; });
  h+='<th>Action</th></tr></thead><tbody>';
  directList.forEach((a,idx)=>{
    const ai=s.assessments.indexOf(a);
    h+='<tr style="background:'+(idx%2?'var(--surface2)':'var(--surface)')+'">';
    h+='<td><span class="tag tag-blue" style="font-size:10px">'+(idx+1)+'</span></td>';
    h+='<td class="left"><input type="text" value="'+a.name+'" onchange="sub().assessments['+ai+'].name=this.value" style="border:none;background:transparent;font-weight:600;width:140px;font-family:inherit;font-size:13px"></td>';
    h+='<td><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-family:inherit;font-size:12px" onchange="sub().assessments['+ai+'].type=this.value">';
    directTypes.forEach(t=>{ h+='<option'+(a.type===t?' selected':'')+'>'+t+'</option>'; });
    h+='</select></td>';
    h+='<td><input type="number" value="'+a.max+'" min="1" onchange="sub().assessments['+ai+'].max=+this.value" style="width:55px"></td>';
    h+='<td><input type="number" value="'+a.pass+'" min="1" onchange="sub().assessments['+ai+'].pass=+this.value" style="width:55px"></td>';
    h+='<td><input type="number" value="'+(a.weight||100)+'" min="1" max="100" onchange="sub().assessments['+ai+'].weight=+this.value" style="width:50px" title="% contribution"></td>';
    s.cos.forEach((_,ci)=>{
      h+='<td><input type="checkbox"'+(a.coCoverage.includes(ci)?' checked':'')+' onchange="toggleCOCov('+ai+','+ci+',this.checked)" style="width:16px;height:16px;cursor:pointer"></td>';
    });
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeAssessment('+ai+')">✕</button></td></tr>';
  });
  if(!directList.length) h+='<tr><td colspan="'+(6+s.cos.length)+'" style="text-align:center;padding:20px;color:var(--text3)">No direct assessments yet. Click + Add Direct.</td></tr>';
  h+='</tbody></table></div>';
  // Direct assessment summary bar
  if(directList.length){
    h+='<div style="margin-top:10px;padding:10px;background:var(--surface2);border-radius:6px">';
    h+='<strong style="font-size:12px">CO Coverage Summary</strong><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">';
    s.cos.forEach((co,ci)=>{
      const n=directList.filter(a=>a.coCoverage.includes(ci)).length;
      h+='<div style="text-align:center"><span class="co-tag" style="display:block;margin-bottom:3px">'+co.id+'</span><span class="tag '+(n>0?'tag-green':'tag-red')+'" style="font-size:10px">'+n+' tests</span></div>';
    });
    h+='</div></div>';
  }
  h+='</div></div>';

  // ---- INDIRECT ASSESSMENT TABLE ----
  h+='<div class="card" style="border-left:4px solid var(--purple);margin-top:12px">';
  h+='<div class="card-header"><div class="card-title">🔁 Indirect Assessments <span style="font-size:11px;color:var(--text2);font-weight:400">(CES / Survey / Peer Review)</span></div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" style="border-color:var(--purple);color:var(--purple)" onclick="addIndirectAssessment()">+ Add Indirect</button>';
  h+='</div></div><div class="card-body">';
  h+='<div class="instr" style="background:#f5f3ff;border-color:#c4b5fd">Indirect assessments do not use marks — they use <strong>ratings (1–5 scale)</strong>. Configure survey data in Section 11 (CES). They contribute as the Indirect component to CO attainment.</div>';
  h+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="left">Name</th><th>Type</th><th>Method</th><th>Scale</th><th>Target</th>';
  s.cos.forEach(c=>{ h+='<th>'+c.id+'</th>'; });
  h+='<th>Action</th></tr></thead><tbody>';
  indirectList.forEach((a,idx)=>{
    const ai=s.assessments.indexOf(a);
    h+='<tr style="background:'+(idx%2?'#faf5ff':'var(--surface)')+'">';
    h+='<td><span class="tag tag-purple" style="font-size:10px">'+(idx+1)+'</span></td>';
    h+='<td class="left"><input type="text" value="'+a.name+'" onchange="sub().assessments['+ai+'].name=this.value" style="border:none;background:transparent;font-weight:600;width:140px;font-family:inherit;font-size:13px"></td>';
    h+='<td><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-family:inherit;font-size:12px" onchange="sub().assessments['+ai+'].type=this.value">';
    indirectTypes.forEach(t=>{ h+='<option'+(a.type===t?' selected':'')+'>'+t+'</option>'; });
    h+='</select></td>';
    h+='<td><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-family:inherit;font-size:11px" onchange="sub().assessments['+ai+'].method=this.value">';
    ['Survey','Interview','Focus Group','Questionnaire'].forEach(m=>{ h+='<option'+((a.method||'Survey')===m?' selected':'')+'>'+m+'</option>'; });
    h+='</select></td>';
    h+='<td><span class="tag tag-blue" style="font-size:11px">1–5</span></td>';
    h+='<td><input type="number" value="'+(a.indirTarget||3.5)+'" min="1" max="5" step="0.1" onchange="sub().assessments['+ai+'].indirTarget=+this.value" style="width:50px"></td>';
    s.cos.forEach((_,ci)=>{
      h+='<td><input type="checkbox"'+(a.coCoverage&&a.coCoverage.includes(ci)?' checked':'')+' onchange="toggleCOCov('+ai+','+ci+',this.checked)" style="width:16px;height:16px;cursor:pointer"></td>';
    });
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeAssessment('+ai+')">✕</button></td></tr>';
  });
  if(!indirectList.length) h+='<tr><td colspan="'+(7+s.cos.length)+'" style="text-align:center;padding:20px;color:var(--text3)">No indirect assessments yet. CES survey is auto-managed in Section 11.</td></tr>';
  h+='</tbody></table></div></div></div>';

  el.innerHTML=h;
}
function addDirectAssessment(){
  sub().assessments.push({id:'a'+Date.now(),name:'CIE Test '+(sub().assessments.filter(a=>a.type==='CIE').length+1),type:'CIE',max:20,pass:12,coCoverage:[0],weight:100});
  renderAssessments(document.getElementById(PAGES[8].id));
}
function addIndirectAssessment(){
  sub().assessments.push({id:'a'+Date.now(),name:'CES Survey '+(sub().assessments.filter(a=>a.type==='CES').length+1),type:'CES',max:5,pass:3,coCoverage:[0,1,2,3,4,5],method:'Survey',indirTarget:3.5});
  renderAssessments(document.getElementById(PAGES[8].id));
}
function addAssessment(){addDirectAssessment();}
function removeAssessment(ai){sub().assessments.splice(ai,1);renderAssessments(document.getElementById(PAGES[8].id));}
function toggleCOCov(ai,ci,checked){const cov=sub().assessments[ai].coCoverage;if(!cov){sub().assessments[ai].coCoverage=[];return;}if(checked&&!cov.includes(ci))cov.push(ci);if(!checked){const idx=cov.indexOf(ci);if(idx>-1)cov.splice(idx,1);}}

// ============================================================
//  PAGE 9: CIA QUESTION PAPER WITH BLOOM'S + PI
// ============================================================
function renderCIAQPaper(el){
  const s=sub();
  const cieTests=s.assessments.filter(a=>a.type==='CIE');
  const testIdx=window._coqTestIdx||0;
  const test=cieTests[testIdx];
  const tIdx=test?s.assessments.indexOf(test):-1;

  let h='<div class="instr"><strong>📌 Instructions:</strong> For each CIA test, map questions to COs, Bloom\'s level, Performance Indicator and marks. Use "Print Question Paper" to generate printable exam sheet.</div>';
  if(!cieTests.length){
    h+='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Add CIE assessments in Section 8 first.</div></div>';
    el.innerHTML=h;return;
  }
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  cieTests.forEach((t,i)=>{
    h+='<button class="btn btn-sm '+(i===testIdx?'btn-primary':'btn-outline')+'" onclick="window._coqTestIdx='+i+';renderCIAQPaper(document.getElementById(PAGES[9].id))">'+t.name+'</button>';
  });
  h+='</div>';
  if(!test){el.innerHTML=h;return;}
  h+='<div class="card"><div class="card-header">';
  h+='<div class="card-title">📝 '+test.name+' — Question Paper Setup</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" onclick="addQRow('+tIdx+')">+ Add Question</button>';
  h+='<button class="btn btn-sm btn-gold" onclick="printCIAQPaper('+tIdx+')">🖨 Print Question Paper</button>';
  h+='</div></div><div class="card-body">';
  // Test meta
  h+='<div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">';
  h+='<div class="tag tag-blue">Max: '+test.max+' Marks</div>';
  h+='<div class="tag tag-gray">Duration: 1 Hour</div>';
  h+='<div class="tag tag-gray">Pass: '+test.pass+' Marks</div>';
  h+='<div class="tag tag-green">COs Covered: '+test.coCoverage.map(ci=>s.cos[ci]?.id||'').join(', ')+'</div>';
  h+='</div>';
  h+='<div class="tbl-wrap"><table>';
  h+='<thead><tr>';
  h+='<th style="width:40px">Q#</th>';
  h+='<th class="left" style="min-width:200px">Question Description</th>';
  h+='<th style="width:55px">Marks</th>';
  h+='<th style="width:110px">Bloom\'s Level</th>';
  h+='<th class="left" style="min-width:160px">Performance Indicator</th>';
  s.cos.forEach(c=>{ h+='<th style="width:50px">'+c.id+'</th>'; });
  h+='<th style="width:50px">Action</th>';
  h+='</tr></thead><tbody>';
  const qrows=s.coqMaps[tIdx]||[];
  qrows.forEach((q,qi)=>{
    const bloom=q.bloom||'Apply';
    const piOpts=(BLOOM_PI[bloom]||BLOOM_PI['Apply']);
    h+='<tr style="background:'+(qi%2?'var(--surface2)':'var(--surface)')+'">';
    h+='<td><strong>Q'+(qi+1)+'</strong></td>';
    h+='<td class="left"><input type="text" value="'+(q.desc||'Question '+(qi+1))+'" onchange="sub().coqMaps['+tIdx+']['+qi+'].desc=this.value" style="width:100%;border:1.5px solid var(--border2);border-radius:4px;padding:4px 7px;font-family:inherit;font-size:12px"></td>';
    h+='<td><input type="number" value="'+q.marks+'" min="1" onchange="sub().coqMaps['+tIdx+']['+qi+'].marks=+this.value" style="width:50px"></td>';
    h+='<td><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-family:inherit;font-size:11px;width:100%" onchange="sub().coqMaps['+tIdx+']['+qi+'].bloom=this.value;renderCIAQPaper(document.getElementById(PAGES[9].id))">';
    BLOOM_LEVELS.forEach(b=>{ h+='<option'+(bloom===b?' selected':'')+'>'+b+'</option>'; });
    h+='</select><div class="tag tag-blue" style="margin-top:2px;font-size:9px;text-align:center">L'+(BLOOM_LEVELS.indexOf(bloom)+1)+'</div></td>';
    h+='<td class="left"><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-family:inherit;font-size:10px;width:100%" onchange="sub().coqMaps['+tIdx+']['+qi+'].pi=this.value">';
    piOpts.forEach(pi=>{ h+='<option'+((q.pi||piOpts[0])===pi?' selected':'')+'>'+pi+'</option>'; });
    h+='</select></td>';
    s.cos.forEach((_,ci)=>{
      h+='<td><input type="checkbox"'+(q.cos&&q.cos.includes(ci)?' checked':'')+' onchange="toggleQCO('+tIdx+','+qi+','+ci+',this.checked)" style="width:16px;height:16px;cursor:pointer"></td>';
    });
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeQRow('+tIdx+','+qi+')">✕</button></td></tr>';
  });
  h+='</tbody><tfoot><tr>';
  h+='<td colspan="2" class="left"><strong>Total</strong></td>';
  h+='<td><strong>'+qrows.reduce((a,q)=>a+q.marks,0)+'</strong></td>';
  h+='<td colspan="'+(s.cos.length+3)+'"></td></tr></tfoot></table></div>';
  // Bloom distribution summary
  if(qrows.length){
    h+='<div style="margin-top:12px;background:var(--surface2);border-radius:8px;padding:12px">';
    h+='<strong style="font-size:13px;color:var(--accent)">📊 Bloom\'s Level Distribution in this Test</strong>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
    BLOOM_LEVELS.forEach((b,bi)=>{
      const qs=qrows.filter(q=>q.bloom===b);
      const marks=qs.reduce((a,q)=>a+q.marks,0);
      if(qs.length) h+='<div class="kpi blue" style="padding:10px;min-width:120px"><div class="kpi-val" style="font-size:18px">'+marks+'</div><div class="kpi-label">L'+(bi+1)+': '+b+'</div><div class="kpi-sub">'+qs.length+' question(s)</div></div>';
    });
    h+='</div></div>';
  }
  h+='</div></div>';
  el.innerHTML=h;
}
function addQRow(tIdx){
  if(!sub().coqMaps[tIdx])sub().coqMaps[tIdx]=[];
  sub().coqMaps[tIdx].push({marks:4,cos:[0],desc:'',bloom:'Apply',pi:'PI-3.1: Use methods in familiar situations'});
  renderCIAQPaper(document.getElementById(PAGES[9].id));
}
function removeQRow(tIdx,qi){sub().coqMaps[tIdx].splice(qi,1);renderCIAQPaper(document.getElementById(PAGES[9].id));}
function toggleQCO(tIdx,qi,ci,checked){
  if(!sub().coqMaps[tIdx][qi].cos)sub().coqMaps[tIdx][qi].cos=[];
  const cos=sub().coqMaps[tIdx][qi].cos;
  if(checked&&!cos.includes(ci))cos.push(ci);
  if(!checked){const idx=cos.indexOf(ci);if(idx>-1)cos.splice(idx,1);}
}
function printCIAQPaper(tIdx){
  const s=sub();
  const test=s.assessments[tIdx];
  const qs=s.coqMaps[tIdx]||[];
  const maxMarks=qs.reduce((a,q)=>a+q.marks,0)||test.max;
  let html='<!DOCTYPE html><html><head><title>'+test.name+' — Question Paper</title>';
  html+='<style>body{font-family:Arial,sans-serif;padding:32px;max-width:820px;margin:0 auto}';
  html+='h1,h2{text-align:center}hr{border:1px solid #000;margin:10px 0}';
  html+='.meta{display:flex;justify-content:space-between;font-size:13px;margin:10px 0}';
  html+='.qblock{margin:12px 0;padding:10px;border:1px solid #ddd;border-radius:6px;page-break-inside:avoid}';
  html+='.qtop{display:flex;gap:10px;align-items:flex-start}';
  html+='.qnum{font-weight:700;color:#2563eb;min-width:30px}';
  html+='.marks{margin-left:auto;font-weight:700;white-space:nowrap}';
  html+='.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}';
  html+='.chip{background:#dbeafe;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}';
  html+='.bloom-chip{background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:20px;font-size:10px}';
  html+='.pi-chip{background:#d1fae5;color:#059669;padding:2px 8px;border-radius:20px;font-size:10px}';
  html+='table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th,td{border:1px solid #000;padding:6px 8px}';
  html+='@media print{.chips,.bloom-chip,.pi-chip{display:inline;padding:1px 4px}}';
  html+='</style></head><body>';
  html+='<h2>'+( s.instName||s.name)+'</h2>';
  html+='<div style="text-align:center;font-size:14px;margin-bottom:6px"><strong>'+s.name+' ('+s.code+')</strong> | Sem '+s.sem+' | AY '+s.ay+'</div>';
  html+='<h2 style="font-size:18px;margin:8px 0">'+test.name+' — Question Paper</h2>';
  html+='<div class="meta"><span>Department: '+s.dept+'</span><span>Faculty: '+s.faculty+'</span><span>Max Marks: '+maxMarks+'</span><span>Time: 1 Hour</span></div><hr>';
  html+='<div style="font-size:13px;margin:8px 0"><strong>Instructions:</strong> Attempt all questions. Marks are indicated against each question.</div><hr>';
  qs.forEach((q,qi)=>{
    const bloom=q.bloom||'Apply';
    const cos=(q.cos||[]).map(ci=>s.cos[ci]?.id||'').filter(Boolean).join(', ');
    html+='<div class="qblock">';
    html+='<div class="qtop">';
    html+='<span class="qnum">Q'+(qi+1)+'.</span>';
    html+='<span style="font-size:14px;flex:1">'+(q.desc||'[Question '+(qi+1)+']')+'</span>';
    html+='<span class="marks">['+q.marks+' Marks]</span>';
    html+='</div>';
    html+='<div class="chips">';
    if(cos) html+='<span class="chip">CO: '+cos+'</span>';
    html+='<span class="bloom-chip">Bloom: '+bloom+' (L'+(BLOOM_LEVELS.indexOf(bloom)+1)+')</span>';
    if(q.pi) html+='<span class="pi-chip">'+q.pi+'</span>';
    html+='</div></div>';
  });
  html+='<table><thead><tr><th>Q#</th><th style="text-align:left">Description</th><th>CO</th><th>Bloom</th><th>PI</th><th>Marks</th></tr></thead><tbody>';
  qs.forEach((q,qi)=>{
    const cos=(q.cos||[]).map(ci=>s.cos[ci]?.id||'').filter(Boolean).join(', ');
    html+='<tr><td>Q'+(qi+1)+'</td><td style="text-align:left">'+(q.desc||'—')+'</td><td>'+cos+'</td><td>'+(q.bloom||'Apply')+'</td><td style="font-size:10px">'+(q.pi||'—')+'</td><td>'+q.marks+'</td></tr>';
  });
  html+='<tr><td colspan="5" style="text-align:right"><strong>Total</strong></td><td><strong>'+maxMarks+'</strong></td></tr>';
  html+='</tbody></table>';
  html+='<p style="margin-top:20px;font-size:11px;color:#666">Generated by NBA OBE System | '+new Date().toLocaleDateString('en-IN')+'</p>';
  html+='</body></html>';
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
}

// ============================================================
//  PAGE 10: MARKLIST
// ============================================================
function renderMarklist(el){
  const s=sub();
  const viewType=window._markView||'cie';
  const assessList=s.assessments.filter(a=>a.type===(viewType==='cie'?'CIE':viewType==='ese'?'ESE':'Lab'));
  let h='<div class="instr"><strong>📌 Instructions:</strong> Upload marks via Excel or enter manually. All students are shown.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  ['cie','ese','lab'].forEach(t=>{
    h+='<button class="btn btn-sm '+(t===viewType?'btn-primary':'btn-outline')+'" onclick="window._markView=\''+t+'\';renderMarklist(document.getElementById(PAGES[10].id))">'+t.toUpperCase()+'</button>';
  });
  h+='<button class="btn btn-sm btn-gold" onclick="downloadMarksTemplate(\''+viewType+'\')">⬇ Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'mUpload_'+viewType+'\').click()">📁 Upload</button>';
  h+='<input type="file" id="mUpload_'+viewType+'" accept=".xlsx,.xls" style="display:none" onchange="uploadMarks(this,\''+viewType+'\')">';
  h+='<button class="btn btn-sm btn-success" onclick="autoFillMarks(\''+viewType+'\')">🎲 Sample</button></div>';
  if(viewType==='lab'){h+=renderLabTable(s);el.innerHTML=h;return;}
  if(!s.students.length){h+='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Add students first (Section 3)</div></div>';el.innerHTML=h;return;}
  const colTotals=assessList.map(a=>{
    const vals=s.students.map(st=>s.marks[a.id]?.[st.roll]||0);
    return {avg:(vals.reduce((a,b)=>a+b,0)/Math.max(vals.length,1)).toFixed(1)};
  });
  h+='<div class="card"><div class="card-header"><div class="card-title">📊 '+viewType.toUpperCase()+' Marks</div>';
  h+='<div class="kpi blue" style="padding:8px"><div class="kpi-val" style="font-size:18px">'+s.students.length+'</div><div class="kpi-label">Students</div></div>';
  h+='</div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th>';
  assessList.forEach(a=>{ h+='<th>'+a.name+'<br><span style="font-weight:400;font-size:10px">/'+a.max+'</span></th>'; });
  h+='<th>Total</th><th>%</th></tr></thead><tbody>';
  s.students.forEach((st,i)=>{
    const stMarks=assessList.map(a=>s.marks[a.id]?.[st.roll]??'');
    const total=stMarks.reduce((a,b)=>a+(+b||0),0);
    const maxTotal=assessList.reduce((a,b)=>a+b.max,0);
    const pct=maxTotal?((total/maxTotal)*100).toFixed(1):0;
    const color=+pct>=60?'var(--green)':+pct>=40?'var(--gold)':'var(--red)';
    h+='<tr><td>'+(i+1)+'</td>';
    h+='<td class="left"><code style="font-size:11px">'+st.roll+'</code></td>';
    h+='<td class="left" style="font-size:12px">'+st.name+'</td>';
    assessList.forEach((a,ai)=>{ h+='<td><input type="number" value="'+(s.marks[a.id]?.[st.roll]??'')+'" min="0" max="'+a.max+'" onchange="setMark(\''+a.id+'\',\''+st.roll+'\',+this.value)" style="width:55px"></td>'; });
    h+='<td><strong>'+total+'</strong></td>';
    h+='<td class="pct-cell" style="color:'+color+'">'+pct+'%</td></tr>';
  });
  h+='</tbody><tfoot><tr><td colspan="3" class="left"><strong>Avg</strong></td>';
  colTotals.forEach(c=>{ h+='<td><strong>'+c.avg+'</strong></td>'; });
  h+='<td colspan="2"></td></tr></tfoot></table></div>';
  // ESE CO-wise breakdown
  if(viewType==='ese'){
    h+='<div style="margin-top:16px;background:#f0f9ff;border-radius:8px;padding:14px;border-left:4px solid var(--accent2)">';
    h+='<strong style="color:var(--accent2)">📊 ESE — CO-wise Contribution Analysis</strong>';
    h+='<div class="tbl-wrap" style="margin-top:10px"><table>';
    h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th>';
    s.cos.forEach(c=>{ h+='<th>'+c.id+'</th>'; });
    h+='<th>Total</th><th>%</th></tr></thead><tbody>';
    s.students.forEach((st,i)=>{
      const eseList=s.assessments.filter(a=>a.type==='ESE');
      const eseMaxTotal=eseList.reduce((a,b)=>a+b.max,0)||1;
      const coMarks=s.cos.map((_,ci)=>{
        const forCO=eseList.filter(a=>a.coCoverage&&a.coCoverage.includes(ci));
        return forCO.reduce((a,a2)=>a+(s.marks[a2.id]?.[st.roll]||0),0);
      });
      const tot=eseList.reduce((a,a2)=>a+(s.marks[a2.id]?.[st.roll]||0),0);
      const pct=((tot/eseMaxTotal)*100).toFixed(1);
      h+='<tr><td>'+(i+1)+'</td><td class="left"><code style="font-size:10px">'+st.roll+'</code></td><td class="left" style="font-size:12px">'+st.name+'</td>';
      coMarks.forEach(m=>{ h+='<td class="pct-cell">'+m+'</td>'; });
      h+='<td><strong>'+tot+'</strong></td><td class="pct-cell" style="color:'+(+pct>=60?'var(--green)':+pct>=40?'var(--gold)':'var(--red)')+'">'+pct+'%</td></tr>';
    });
    h+='</tbody><tfoot><tr><td colspan="3" class="left"><strong>CO Pass% (≥'+s.coTargetPct+'%)</strong></td>';
    s.cos.forEach((_,ci)=>{
      const eseList=s.assessments.filter(a=>a.type==='ESE'&&a.coCoverage&&a.coCoverage.includes(ci));
      const mx=eseList.reduce((a,b)=>a+b.max,0)||1;
      const pass=s.students.filter(st=>{const tot=eseList.reduce((a,a2)=>a+(s.marks[a2.id]?.[st.roll]||0),0);return(tot/mx)*100>=s.coTargetPct;}).length;
      const pct=s.students.length?((pass/s.students.length)*100).toFixed(1):0;
      h+='<td><strong style="color:'+(+pct>=55?'var(--green)':'var(--red)')+'">'+pct+'%</strong></td>';
    });
    h+='<td colspan="2"></td></tr></tfoot></table></div></div>';
  }
  h+='</div></div>';
  el.innerHTML=h;
}
function renderLabTable(s){
  let h='<div class="card"><div class="card-header"><div class="card-title">🔬 Lab Term Work</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" onclick="addLabCol()">+ Add Column</button>';
  h+='<button class="btn btn-sm btn-gold" onclick="downloadLabTemplate()">⬇ Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'labUpload\').click()">📁 Upload</button>';
  h+='<input type="file" id="labUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadLabMarks(this)">';
  h+='</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th>';
  s.labTWCols.forEach((c,i)=>{ h+='<th>'+c+' <button class="btn btn-sm btn-danger" style="padding:1px 4px;font-size:9px" onclick="removeLabCol('+i+')">✕</button></th>'; });
  h+='<th>Total</th><th>%</th></tr></thead><tbody>';
  const colMax=10;
  s.students.forEach((st,i)=>{
    const vals=s.labTWCols.map((_,ci)=>s.labTWMarks[st.roll]?.[ci]||0);
    const total=vals.reduce((a,b)=>a+b,0);
    const pct=s.labTWCols.length?((total/(colMax*s.labTWCols.length))*100).toFixed(1):0;
    const color=+pct>=60?'var(--green)':+pct>=40?'var(--gold)':'var(--red)';
    h+='<tr><td>'+(i+1)+'</td><td class="left"><code style="font-size:11px">'+st.roll+'</code></td><td class="left" style="font-size:12px">'+st.name+'</td>';
    s.labTWCols.forEach((_,ci)=>{ h+='<td><input type="number" value="'+(s.labTWMarks[st.roll]?.[ci]??'')+'" min="0" max="'+colMax+'" onchange="setLabMark(\''+st.roll+'\','+ci+',+this.value)" style="width:55px"></td>'; });
    h+='<td><strong>'+total+'</strong></td><td class="pct-cell" style="color:'+color+'">'+pct+'%</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  return h;
}
function setMark(aid,roll,v){if(!sub().marks[aid])sub().marks[aid]={};sub().marks[aid][roll]=v;}
function setLabMark(roll,ci,v){if(!sub().labTWMarks[roll])sub().labTWMarks[roll]={};sub().labTWMarks[roll][ci]=v;}
function addLabCol(){const n=prompt('Column name:','Exp '+(sub().labTWCols.length+1));if(n){sub().labTWCols.push(n);renderMarklist(document.getElementById(PAGES[10].id));}}
function removeLabCol(ci){sub().labTWCols.splice(ci,1);renderMarklist(document.getElementById(PAGES[10].id));}
function autoFillMarks(viewType){
  const s=sub();
  const list=s.assessments.filter(a=>a.type===(viewType==='cie'?'CIE':viewType==='ese'?'ESE':'Lab'));
  s.students.forEach(st=>{list.forEach(a=>{if(!s.marks[a.id])s.marks[a.id]={};s.marks[a.id][st.roll]=Math.floor(a.max*(0.4+Math.random()*0.55));});});
  renderMarklist(document.getElementById(PAGES[10].id));showToast('Sample marks filled','info');
}
function uploadMarks(input,viewType){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const s=sub();
    const wb=XLSX.read(e.target.result,{type:'array'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    const list=s.assessments.filter(a=>a.type===(viewType==='cie'?'CIE':viewType==='ese'?'ESE':'Lab'));
    data.forEach(row=>{
      const roll=String(row['Roll No']||row['roll']||'');
      if(!roll)return;
      list.forEach(a=>{const v=row[a.name];if(v!==''&&v!=null){if(!s.marks[a.id])s.marks[a.id]={};s.marks[a.id][roll]=+v;}});
    });
    showToast('Marks uploaded!','success');renderMarklist(document.getElementById(PAGES[10].id));
  };reader.readAsArrayBuffer(f);
}
function downloadMarksTemplate(viewType){
  const s=sub();
  const list=s.assessments.filter(a=>a.type===(viewType==='cie'?'CIE':viewType==='ese'?'ESE':'Lab'));
  const ws=XLSX.utils.aoa_to_sheet([['Roll No','Name',...list.map(a=>a.name)],...s.students.map(st=>[st.roll,st.name,...list.map(()=>'')])]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Marks');
  XLSX.writeFile(wb,'marks_'+viewType+'.xlsx');showToast('Template downloaded','info');
}
function downloadLabTemplate(){
  const s=sub();
  const ws=XLSX.utils.aoa_to_sheet([['Roll No','Name',...s.labTWCols],...s.students.map(st=>[st.roll,st.name,...s.labTWCols.map(()=>'')])]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Lab');
  XLSX.writeFile(wb,'lab_template.xlsx');showToast('Template downloaded','info');
}
function uploadLabMarks(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const s=sub();const wb=XLSX.read(e.target.result,{type:'array'});
    const data=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    data.forEach(row=>{const roll=String(row['Roll No']||'');if(!roll)return;s.labTWCols.forEach((col,ci)=>{const v=row[col];if(v!==''&&v!=null){if(!s.labTWMarks[roll])s.labTWMarks[roll]={};s.labTWMarks[roll][ci]=+v;}});});
    showToast('Lab marks uploaded!','success');renderMarklist(document.getElementById(PAGES[10].id));
  };reader.readAsArrayBuffer(f);
}

// ============================================================
//  PAGE 11: CES
// ============================================================
function renderCES(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Upload Course Exit Survey (CES). Columns: Roll No, CO1_Rating...CO6_Rating (scale 1-5).</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">📋 CES Survey</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-gold" onclick="downloadCESTemplate()">⬇ Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'cesUpload\').click()">📁 Upload</button>';
  h+='<input type="file" id="cesUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadCES(this)">';
  h+='<button class="btn btn-sm btn-success" onclick="generateSampleCES()">🎲 Sample CES</button>';
  h+='</div></div><div class="card-body">';
  if(!s.cesData.length){
    h+='<div class="upload-zone" onclick="document.getElementById(\'cesUpload\').click()"><div class="upload-icon">📊</div><div class="upload-title">Upload CES Survey Excel</div><div class="upload-sub">Required columns: Roll No, CO1_Rating through CO6_Rating (scale 1-5)</div></div>';
  } else {
    const target=3.5;
    const coScores=s.cos.map((_,ci)=>{const vals=s.cesData.map(r=>+(r['CO'+(ci+1)+'_Rating']||0)).filter(v=>v>0);return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length):0;});
    h+='<div class="g4" style="margin-bottom:16px">';
    h+='<div class="kpi blue"><div class="kpi-val">'+s.cesData.length+'</div><div class="kpi-label">Responses</div></div>';
    h+='<div class="kpi green"><div class="kpi-val">'+coScores.filter(v=>v>=target).length+'/6</div><div class="kpi-label">COs Achieved</div></div>';
    h+='<div class="kpi gold"><div class="kpi-val">'+target+'</div><div class="kpi-label">Target Score</div></div>';
    h+='<div class="kpi purple"><div class="kpi-val">'+(coScores.reduce((a,b)=>a+b,0)/coScores.length).toFixed(2)+'</div><div class="kpi-label">Overall Avg</div></div>';
    h+='</div>';
    h+='<div class="tbl-wrap"><table><thead><tr><th>CO</th><th class="left">Outcome</th><th>Avg Score</th><th>Stars</th><th>Target</th><th>Status</th></tr></thead><tbody>';
    s.cos.forEach((co,ci)=>{
      const score=coScores[ci];const met=score>=target;
      const stars='★'.repeat(Math.min(5,Math.round(score)))+'☆'.repeat(Math.max(0,5-Math.round(score)));
      h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
      h+='<td class="left" style="font-size:12px">'+co.outcome.substring(0,60)+'...</td>';
      h+='<td><strong style="color:'+(met?'var(--green)':'var(--red)')+'">'+score.toFixed(2)+'</strong></td>';
      h+='<td style="color:#f59e0b">'+stars+'</td>';
      h+='<td>'+target+'</td>';
      h+='<td><span class="tag '+(met?'tag-green':'tag-red')+'">'+(met?'✓ Met':'✗ Below')+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div></div>';
  el.innerHTML=h;
}
function downloadCESTemplate(){
  const s=sub();
  const headers=['Roll No',...s.cos.map((_,i)=>'CO'+(i+1)+'_Rating')];
  const ws=XLSX.utils.aoa_to_sheet([headers,...s.students.map(st=>[st.roll,...s.cos.map(()=>'')])]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'CES');XLSX.writeFile(wb,'ces_template.xlsx');
}
function uploadCES(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    sub().cesData=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:0});
    showToast(sub().cesData.length+' CES responses loaded','success');renderCES(document.getElementById(PAGES[11].id));
  };reader.readAsArrayBuffer(f);
}
function generateSampleCES(){
  const s=sub();
  s.cesData=s.students.map(st=>{const row={'Roll No':st.roll};s.cos.forEach((_,ci)=>{row['CO'+(ci+1)+'_Rating']=(3+Math.random()*2).toFixed(1);});return row;});
  showToast('Sample CES generated','info');renderCES(document.getElementById(PAGES[11].id));
}

// ============================================================
//  PAGE 12: LEARNER ANALYSIS
// ============================================================
function renderLearnerAnalysis(el){
  const s=sub();
  if(!s.students.length){el.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Add students and marks first</div></div>';return;}
  const cieList=s.assessments.filter(a=>a.type==='CIE');
  const eseList=s.assessments.filter(a=>a.type==='ESE');
  const rows=s.students.map(st=>{
    const cieTotal=cieList.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);
    const cieMax=cieList.reduce((a,b)=>a+b.max,0)||1;
    const eseTotal=eseList.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);
    const eseMax=eseList.reduce((a,b)=>a+b.max,0)||1;
    const ciePct=(cieTotal/cieMax)*100;const esePct=(eseTotal/eseMax)*100;
    const overall=ciePct*s.cieWeight+esePct*s.eseWeight;
    const cat=overall<40?'Slow':overall<60?'Average':overall<75?'Good':'Excellent';
    return {...st,ciePct:ciePct.toFixed(1),esePct:esePct.toFixed(1),overall:overall.toFixed(1),cat};
  });
  const cats=['Slow','Average','Good','Excellent'];
  const catColors=['var(--red)','var(--gold)','var(--accent)','var(--green)'];
  let h='<div class="g4" style="margin-bottom:20px">';
  cats.forEach((c,i)=>{ h+='<div class="kpi '+['red','gold','blue','green'][i]+'"><div class="kpi-val">'+rows.filter(r=>r.cat===c).length+'</div><div class="kpi-label">'+c+' Learners</div></div>'; });
  h+='</div>';
  // Performance distribution chart
  const cats2=['Slow','Average','Good','Excellent'];
  const catCounts=cats2.map(c=>rows.filter(r=>r.cat===c).length);
  const catColors2=['#dc2626','#d97706','#2563eb','#059669'];
  const maxC=Math.max(...catCounts,1);
  const barW=80,barGap=20,chartH=120;
  let chartSvg='<svg width="'+(barW+barGap)*4+40+'" height="'+(chartH+50)+'" style="font-family:inherit;overflow:visible">';
  catCounts.forEach((n,i)=>{
    const bH=Math.round((n/maxC)*chartH);
    const x=20+i*(barW+barGap);
    chartSvg+='<rect x="'+x+'" y="'+(chartH-bH)+'" width="'+barW+'" height="'+bH+'" fill="'+catColors2[i]+'" rx="4" opacity="0.85"/>';
    chartSvg+='<text x="'+(x+barW/2)+'" y="'+(chartH-bH-5)+'" font-size="13" font-weight="700" fill="'+catColors2[i]+'" text-anchor="middle">'+n+'</text>';
    chartSvg+='<text x="'+(x+barW/2)+'" y="'+(chartH+16)+'" font-size="11" fill="#475569" text-anchor="middle">'+cats2[i]+'</text>';
    chartSvg+='<text x="'+(x+barW/2)+'" y="'+(chartH+30)+'" font-size="10" fill="#94a3b8" text-anchor="middle">'+(n?((n/rows.length)*100).toFixed(0)+'%':'')+'</text>';
  });
  chartSvg+='</svg>';
  h+='<div class="card"><div class="card-header"><div class="card-title">📊 Performance Distribution</div></div><div class="card-body" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">';
  h+=chartSvg;
  h+='<div style="flex:1;min-width:200px">';
  catCounts.forEach((n,i)=>{const pct=rows.length?((n/rows.length)*100).toFixed(1):0;h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:700;color:'+catColors2[i]+'">'+cats2[i]+'</span><span>'+n+' students ('+pct+'%)</span></div><div style="height:8px;background:#f1f5f9;border-radius:4px"><div style="height:8px;width:'+pct+'%;background:'+catColors2[i]+';border-radius:4px"></div></div></div>';});
  h+='</div></div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">👁 Student Classification</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th><th>CIE%</th><th>ESE%</th><th>Overall%</th><th>Category</th><th>Remedial?</th></tr></thead><tbody>';
  rows.forEach((r,i)=>{
    h+='<tr><td>'+(i+1)+'</td><td class="left"><code style="font-size:11px">'+r.roll+'</code></td>';
    h+='<td class="left" style="font-size:12px">'+r.name+'</td>';
    h+='<td class="pct-cell">'+r.ciePct+'%</td><td class="pct-cell">'+r.esePct+'%</td>';
    h+='<td><strong style="color:'+catColors[cats.indexOf(r.cat)]+'">'+r.overall+'%</strong><div class="prog-wrap"><div class="prog-bar bc-achieved" style="width:'+r.overall+'%;background:'+catColors[cats.indexOf(r.cat)]+'"></div></div></td>';
    h+='<td><span class="tag tag-'+['red','gold','blue','green'][cats.indexOf(r.cat)]+'">'+r.cat+'</span></td>';
    h+='<td>'+(r.cat==='Slow'?'<span class="tag tag-red">Required</span>':'<span class="tag tag-green">No</span>')+'</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 13: MONITORING
// ============================================================
function renderMonitoring(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Record remedial and advanced activities per CO. Update status as actions are implemented.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">📈 Monitoring Actions per CO</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>CO</th><th>Bloom</th><th>PI</th><th>Slow</th><th>Avg</th><th>Fast</th><th class="left">Remedial Action</th><th class="left">Advanced Activity</th><th>Status</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const rows=s.students.map(st=>{const total=s.assessments.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);const mx=s.assessments.reduce((a,b)=>a+b.max,0)||1;return(total/mx)*100;});
    const slow=rows.filter(p=>p<40).length,avg=rows.filter(p=>p>=40&&p<60).length,fast=rows.filter(p=>p>=75).length;
    const mon=s.monitoringActions[ci];
    h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
    h+='<td><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span></td>';
    h+='<td style="font-size:10px;color:var(--text2);max-width:120px">'+(co.pi||'—')+'</td>';
    h+='<td><span class="tag tag-red">'+slow+'</span></td><td><span class="tag tag-gold">'+avg+'</span></td><td><span class="tag tag-green">'+fast+'</span></td>';
    h+='<td class="left"><input type="text" value="'+(mon.remedial||'Extra class, Peer tutoring')+'" onchange="sub().monitoringActions['+ci+'].remedial=this.value" style="width:180px;border:none;background:transparent;font-family:inherit;font-size:12px"></td>';
    h+='<td class="left"><input type="text" value="'+(mon.advanced||'Mini project, Research activity')+'" onchange="sub().monitoringActions['+ci+'].advanced=this.value" style="width:180px;border:none;background:transparent;font-family:inherit;font-size:12px"></td>';
    h+='<td><select style="padding:5px;border:1.5px solid var(--border2);border-radius:4px;font-size:12px;font-family:inherit" onchange="sub().monitoringActions['+ci+'].status=this.value">';
    ['Planned','In Progress','Completed'].forEach(st=>{ h+='<option'+(mon.status===st?' selected':'')+'>'+st+'</option>'; });
    h+='</select></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 14: PO/PSO HOURS
// ============================================================
function renderPOHours(el){
  const s=sub();
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),'PSO1','PSO2','PSO3'];
  const coCount=s.cos.length;
  const coTotals=s.cos.map((_,ci)=>s.hourCols.reduce((a,_,hi)=>a+(s.coHours[ci][hi]||0),0));
  const getAuto=(ci,pi)=>{
    const mv=s.copoPOMatrix[ci][pi]||0;
    return mv>0?Math.round(coTotals[ci]*(mv/6)*10)/10:0;
  };
  const getVal=(ci,pi)=>{
    const idx=pi*coCount+ci;
    const v=s.poLearningHrs[idx];
    if(v!==undefined && v!==null && v!=="") return +v||0;
    return getAuto(ci,pi);
  };
  let h='<div class="instr"><strong>📌 Instructions:</strong> Enter learning hours attributable to each PO/PSO via each CO. Pre-filled from CO-PO matrix. Avg Hrs/CO calculated automatically.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">⏰ PO/PSO Learning Hours</div>';
  h+='<button class="btn btn-sm btn-success" onclick="showToast(\'PO Hours saved!\',\'success\')">💾 Save</button>';
  h+='</div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>CO</th>';
  allPOs.forEach(p=>{ h+='<th>'+p+'</th>'; });
  h+='<th>Total</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const coTotalHrs=coTotals[ci];
    h+='<tr><td><span class="co-tag">'+co.id+'</span><br><span style="font-size:10px;color:var(--text3)">'+coTotalHrs+'h</span></td>';
    allPOs.forEach((_,pi)=>{
      h+='<td><input type="number" value="'+getVal(ci,pi)+'" min="0" step="0.5" oninput="updatePOHour('+ci+','+pi+',this.value)" style="width:52px"></td>';
    });
    h+='<td><strong id="pohr-row-'+ci+'">'+allPOs.reduce((a,_,pi)=>a+getVal(ci,pi),0).toFixed(1)+'</strong></td></tr>';
  });
  h+='</tbody><tfoot>';
  h+='<tr style="background:var(--surface2)"><td class="left"><strong>Total Hrs</strong></td>';
  allPOs.forEach((_,pi)=>{ h+='<td><strong id="pohr-col-'+pi+'">'+s.cos.reduce((a,_,ci)=>a+getVal(ci,pi),0).toFixed(1)+'</strong></td>'; });
  h+='<td></td></tr>';
  h+='<tr style="background:#dbeafe"><td class="left"><strong style="color:var(--accent)">Avg Hrs/CO</strong></td>';
  allPOs.forEach((_,pi)=>{
    const total=s.cos.reduce((a,_,ci)=>a+getVal(ci,pi),0);
    const denom=coCount||1;
    h+='<td><strong id="pohr-avg-'+pi+'" style="color:var(--accent)">'+( total/denom).toFixed(2)+'</strong></td>';
  });
  h+='<td></td></tr>';
  h+='</tfoot></table></div></div></div>';
  el.innerHTML=h;
}

function updatePOHour(ci,pi,val){
  const s=sub();
  const idx=pi*s.cos.length+ci;
  if(val===null || val===undefined || val===""){
    s.poLearningHrs[idx]=null;
  } else {
    s.poLearningHrs[idx]=+val||0;
  }
  updatePOHourTotals();
}

function updatePOHourTotals(){
  const s=sub();
  const allPOsCount=s.pos.length+s.psos.length;
  const coCount=s.cos.length;
  const coTotals=s.cos.map((_,ci)=>s.hourCols.reduce((a,_,hi)=>a+(s.coHours[ci][hi]||0),0));
  const getAuto=(ci,pi)=>{
    const mv=s.copoPOMatrix[ci][pi]||0;
    return mv>0?Math.round(coTotals[ci]*(mv/6)*10)/10:0;
  };
  const getVal=(ci,pi)=>{
    const idx=pi*coCount+ci;
    const v=s.poLearningHrs[idx];
    if(v!==undefined && v!==null && v!=="") return +v||0;
    return getAuto(ci,pi);
  };

  for(let ci=0;ci<coCount;ci++){
    const rowTotal=Array.from({length:allPOsCount},(_,pi)=>getVal(ci,pi)).reduce((a,b)=>a+b,0);
    const rowEl=document.getElementById('pohr-row-'+ci);
    if(rowEl) rowEl.textContent=rowTotal.toFixed(1);
  }
  for(let pi=0;pi<allPOsCount;pi++){
    const colTotal=Array.from({length:coCount},(_,ci)=>getVal(ci,pi)).reduce((a,b)=>a+b,0);
    const colEl=document.getElementById('pohr-col-'+pi);
    if(colEl) colEl.textContent=colTotal.toFixed(1);
    const mapped=coCount||1;
    const avgEl=document.getElementById('pohr-avg-'+pi);
    if(avgEl) avgEl.textContent=(colTotal/mapped).toFixed(2);
  }
}

// ============================================================
//  PAGE 15: CO ATTAINMENT
// ============================================================
function renderCOAttainment(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Click Calculate to compute CO attainment from CIE, ESE, and CES data. Target: '+s.coTargetLevel.toFixed(2)+'</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🎯 CO Attainment</div>';
  h+='<button class="btn btn-sm btn-purple" onclick="calculateAll()">⚡ Calculate All</button>';
  h+='</div><div class="card-body">';
  if(!s.coAttainment[0]){
    h+='<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:48px">⚡</div>Click Calculate to compute attainment</div>';
  } else {
    h+='<div class="g4" style="margin-bottom:20px">';
    s.coAttainment.forEach((ca,ci)=>{
      if(!ca)return;
      h+='<div class="kpi '+(ca.achieved?'green':'red')+'">';
      h+='<div class="kpi-val">'+s.cos[ci].id+'</div>';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-top:4px">';
      h+='<div class="attain-level attain-'+( ca.level||0)+'">'+( ca.level||0)+'</div>';
      h+='<div><div class="kpi-label">'+(ca.achieved?'✓ Achieved':'✗ Gap')+'</div>';
      h+='<div class="kpi-sub">'+ca.final.toFixed(2)+'</div></div></div></div>';
    });
    h+='</div>';
    h+='<div class="tbl-wrap"><table>';
    h+='<thead><tr><th>CO</th><th>Bloom</th><th>PI</th><th>CIA%</th><th>ESE%</th><th>CES</th><th>Direct</th><th>Indirect</th><th>Final</th><th>Target</th><th>Level</th><th>Status</th></tr></thead><tbody>';
    s.coAttainment.forEach((ca,ci)=>{
      if(!ca)return;
      const co=s.cos[ci];
      h+='<tr>';
      h+='<td><span class="co-tag">'+co.id+'</span></td>';
      h+='<td><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span></td>';
      h+='<td style="font-size:10px;color:var(--text2);max-width:130px">'+(co.pi||'—')+'</td>';
      h+='<td class="pct-cell">'+ca.cia_pct.toFixed(1)+'%<div class="prog-wrap"><div class="prog-bar bc-achieved" style="width:'+Math.min(100,ca.cia_pct)+'%"></div></div></td>';
      h+='<td class="pct-cell">'+ca.ese_pct.toFixed(1)+'%<div class="prog-wrap"><div class="prog-bar" style="width:'+Math.min(100,ca.ese_pct)+'%;background:var(--accent2)"></div></div></td>';
      h+='<td><strong>'+ca.ces.toFixed(2)+'</strong></td>';
      h+='<td><strong>'+ca.direct.toFixed(2)+'</strong></td>';
      h+='<td><strong>'+ca.indirect.toFixed(2)+'</strong></td>';
      h+='<td><strong style="font-size:16px;color:'+(ca.achieved?'var(--green)':'var(--red)')+'">'+ca.final.toFixed(2)+'</strong></td>';
      h+='<td style="font-family:monospace">'+s.coTargetLevel.toFixed(2)+'</td>';
      h+='<td><div class="attain-level attain-'+(ca.level||0)+'">'+(ca.level||0)+'</div></td>';
      h+='<td><span class="tag '+(ca.achieved?'tag-green':'tag-red')+'">'+(ca.achieved?'✓ Met':'✗ Gap')+'</span></td>';
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div></div>';
  el.innerHTML=h;
}
function calculateAll(){
  const s=sub();
  if(!s.students.length){showToast('Add students first!','error');return;}
  const pctThresh=s.coTargetPct/100;
  s.cos.forEach((co,ci)=>{
    const cieTests=s.assessments.filter(a=>a.type==='CIE'&&a.coCoverage.includes(ci));
    const eseTests=s.assessments.filter(a=>a.type==='ESE'&&a.coCoverage.includes(ci));
    const ciePct=cieTests.length?(s.students.filter(st=>{const tot=cieTests.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);const mx=cieTests.reduce((a,b)=>a+b.max,0);return mx>0&&(tot/mx)>=pctThresh;}).length/s.students.length)*100:0;
    const esePct=eseTests.length?(s.students.filter(st=>{const tot=eseTests.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);const mx=eseTests.reduce((a,b)=>a+b.max,0);return mx>0&&(tot/mx)>=pctThresh;}).length/s.students.length)*100:0;
    const cesRatings=s.cesData.map(r=>+(r['CO'+(ci+1)+'_Rating']||0)).filter(v=>v>0);
    const cesScore=cesRatings.length?(cesRatings.reduce((a,b)=>a+b,0)/cesRatings.length):0;
    const lvlPct=s.attainLvlPct||{3:65,2:55,1:45};
    const ciaAtt=ciePct>=(lvlPct[3]||65)?3:ciePct>=(lvlPct[2]||55)?2:ciePct>=(lvlPct[1]||45)?1:0;
    const eseAtt=esePct>=(lvlPct[3]||65)?3:esePct>=(lvlPct[2]||55)?2:esePct>=(lvlPct[1]||45)?1:0;
    const direct=ciaAtt*s.cieWeight+eseAtt*s.eseWeight;
    const cesT=s.cesTarget||3.5;const indirect=cesScore>=(cesT+0.5)?3:cesScore>=cesT?2:cesScore>=(cesT-1)?1:0;
    const final=direct*s.directWeight+indirect*s.indirectWeight;
    const achieved=final>=s.coTargetLevel;
    const level=final>=3?3:final>=2?2:final>=1?1:0;
    s.coAttainment[ci]={cia_pct:ciePct,ese_pct:esePct,ces:cesScore,direct,indirect,final,achieved,level};
  });
  // PO/PSO
  const allPOsCount=s.pos.length+s.psos.length;
  for(let pi=0;pi<allPOsCount;pi++){
    const mappedCOs=s.cos.map((_,ci)=>({ci,v:s.copoPOMatrix[ci][pi]||0})).filter(x=>x.v>0);
    if(!mappedCOs.length){if(pi<s.pos.length)s.poAttainment[pi]={att:0,achieved:false,level:0};else s.psoAttainment[pi-s.pos.length]={att:0,achieved:false,level:0};continue;}
    const wSum=mappedCOs.reduce((a,x)=>a+x.v,0);
    const att=mappedCOs.reduce((a,x)=>a+(s.coAttainment[x.ci]?.final||0)*x.v,0)/wSum;
    const target=pi<s.pos.length?s.poTarget:s.psoTarget;
    const achieved=att>=target;
    const level=att>=3?3:att>=2?2:att>=1?1:0;
    if(pi<s.pos.length)s.poAttainment[pi]={att,achieved,level};
    else s.psoAttainment[pi-s.pos.length]={att,achieved,level};
  }
  showToast('All attainments calculated!','success');
  renderPage(currentPage);
}

// ============================================================
//  PAGE 16: CO CHART
// ============================================================
function renderCOChart(el){
  const s=sub();
  if(!s.coAttainment[0]){el.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Run calculation first (Section 15)</div></div>';return;}
  const maxH=160;
  let h='<div class="card"><div class="card-header"><div class="card-title">📉 CO Achievement vs Target</div></div><div class="card-body">';
  h+='<div class="bar-chart">';
  s.cos.forEach((co,ci)=>{
    const ca=s.coAttainment[ci];const v=ca?.final||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.coTargetLevel/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars">';
    h+='<div class="bc-bar bc-achieved" style="height:'+achH+'px" title="'+co.id+': '+v.toFixed(2)+'"></div>';
    h+='<div class="bc-bar bc-target" style="height:'+tgtH+'px" title="Target: '+s.coTargetLevel.toFixed(2)+'"></div>';
    h+='</div><div class="bc-label">'+co.id+'</div>';
    h+='<span class="tag '+(ca?.achieved?'tag-green':'tag-red')+'" style="font-size:9px;margin-top:3px">'+(ca?.achieved?'✓':'✗')+'</span></div>';
  });
  h+='</div>';
  h+='<div class="tbl-wrap" style="margin-top:16px"><table>';
  h+='<thead><tr><th>CO</th><th>Bloom</th><th>CIA%</th><th>ESE%</th><th>CES</th><th>Final Att.</th><th>Gap</th></tr></thead><tbody>';
  s.coAttainment.forEach((ca,ci)=>{
    if(!ca)return;
    const gap=s.coTargetLevel-ca.final;
    h+='<tr><td><span class="co-tag">'+s.cos[ci].id+'</span></td>';
    h+='<td><span class="tag tag-purple" style="font-size:10px">'+s.cos[ci].bloom+'</span></td>';
    h+='<td class="pct-cell">'+ca.cia_pct.toFixed(1)+'%</td>';
    h+='<td class="pct-cell">'+ca.ese_pct.toFixed(1)+'%</td>';
    h+='<td>'+ca.ces.toFixed(2)+'</td>';
    h+='<td><strong>'+ca.final.toFixed(2)+'</strong></td>';
    h+='<td class="pct-cell" style="color:'+(gap>0?'var(--red)':'var(--green)')+'">'+(gap>0?'+'+gap.toFixed(2):gap.toFixed(2))+'</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 17: CO QUALITY LOOP
// ============================================================
function renderCOQuality(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Quality Loop documents corrective actions for COs that did not achieve target.</div>';
  s.cos.forEach((co,ci)=>{
    const ca=s.coAttainment[ci];
    if(!ca){h+='<div class="card"><div class="card-body">Run calculation first</div></div>';return;}
    h+='<div class="card"><div class="card-header">';
    h+='<div class="card-title">🔄 '+co.id+' — Quality Loop</div>';
    h+='<div style="display:flex;gap:8px"><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span>';
    h+='<span class="tag '+(ca.achieved?'tag-green':'tag-red')+'">'+(ca.achieved?'✓ Closed':'✗ Action Needed')+'</span></div>';
    h+='</div><div class="card-body">';
    h+='<div class="ql-flow">';
    h+='<div class="ql-box achieved"><div class="ql-label">CO Defined</div><div class="ql-val">✓</div></div>';
    h+='<div class="ql-box"><div class="ql-label">CIA%</div><div class="ql-val" style="font-size:14px">'+ca.cia_pct.toFixed(1)+'%</div></div>';
    h+='<div class="ql-box"><div class="ql-label">ESE%</div><div class="ql-val" style="font-size:14px">'+ca.ese_pct.toFixed(1)+'%</div></div>';
    h+='<div class="ql-box"><div class="ql-label">CES</div><div class="ql-val">'+ca.ces.toFixed(2)+'</div></div>';
    h+='<div class="ql-box '+(ca.achieved?'achieved':'')+'"><div class="ql-label">Final</div><div class="ql-val" style="color:'+(ca.achieved?'var(--green)':'var(--red)')+'">'+ca.final.toFixed(2)+'</div></div>';
    h+='<div class="ql-box"><div class="ql-label">Target</div><div class="ql-val">'+s.coTargetLevel.toFixed(2)+'</div></div>';
    h+='</div>';
    h+='<div class="fg" style="margin-top:12px"><label>Remarks / Corrective Action</label>';
    h+='<textarea rows="2" style="width:100%;padding:8px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px" onchange="sub().coRemarks['+ci+']=this.value">'+( s.coRemarks[ci]||'')+'</textarea></div>';
    h+='</div></div>';
  });
  el.innerHTML=h;
}

// ============================================================
//  PAGE 18: PO ATTAINMENT
// ============================================================
function renderPOAttainment(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> PO/PSO attainment is computed from CO attainment weighted by CO-PO mapping values.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🏆 PO & PSO Attainment</div>';
  h+='<button class="btn btn-sm btn-purple" onclick="calculateAll()">⚡ Calculate</button>';
  h+='</div><div class="card-body">';
  if(!s.poAttainment[0]){
    h+='<div style="text-align:center;padding:40px;color:var(--text3)">Run calculation (Section 15) first</div>';
  } else {
    h+='<div class="tbl-wrap"><table>';
    h+='<thead><tr><th>PO/PSO</th><th class="left">Name</th><th>Attainment</th><th>Target</th><th>Level</th><th>Status</th></tr></thead><tbody>';
    s.pos.forEach((p,pi)=>{
      const a=s.poAttainment[pi];
      h+='<tr><td><span class="po-tag">PO'+(pi+1)+'</span></td>';
      h+='<td class="left" style="font-size:12px">'+p+'</td>';
      h+='<td><strong style="font-family:monospace;font-size:15px;color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'—')+'</strong>';
      if(a) h+='<div class="prog-wrap"><div class="prog-bar bc-achieved" style="width:'+Math.min(100,(a.att/3)*100)+'%"></div></div>';
      h+='</td><td style="font-family:monospace">'+s.poTarget.toFixed(2)+'</td>';
      h+='<td>'+(a?'<div class="attain-level attain-'+(a.level||0)+'">'+(a.level||0)+'</div>':'—')+'</td>';
      h+='<td>'+(a?'<span class="tag '+(a.achieved?'tag-green':'tag-red')+'">'+(a.achieved?'✓ Met':'✗ Gap')+'</span>':'—')+'</td></tr>';
    });
    s.psos.forEach((p,pi)=>{
      const a=s.psoAttainment[pi];
      h+='<tr style="background:var(--surface2)"><td><span class="tag tag-purple">PSO'+(pi+1)+'</span></td>';
      h+='<td class="left" style="font-size:12px">'+p+'</td>';
      h+='<td><strong style="font-family:monospace;font-size:15px;color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'—')+'</strong></td>';
      h+='<td style="font-family:monospace">'+s.psoTarget.toFixed(2)+'</td>';
      h+='<td>'+(a?'<div class="attain-level attain-'+(a.level||0)+'">'+(a.level||0)+'</div>':'—')+'</td>';
      h+='<td>'+(a?'<span class="tag '+(a.achieved?'tag-green':'tag-red')+'">'+(a.achieved?'✓ Met':'✗ Gap')+'</span>':'—')+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 19: PO CHART
// ============================================================
function renderPOChart(el){
  const s=sub();
  if(!s.poAttainment[0]){el.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Run calculation first</div></div>';return;}
  const maxH=130;
  let h='<div class="card"><div class="card-header"><div class="card-title">📉 PO/PSO Gap Chart</div></div><div class="card-body">';
  h+='<div class="bar-chart">';
  s.pos.forEach((p,pi)=>{
    const a=s.poAttainment[pi];const v=a?.att||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.poTarget/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars"><div class="bc-bar bc-achieved" style="height:'+achH+'px" title="PO'+(pi+1)+': '+v.toFixed(2)+'"></div><div class="bc-bar bc-target" style="height:'+tgtH+'px"></div></div><div class="bc-label">PO'+(pi+1)+'</div><span class="tag '+(a?.achieved?'tag-green':'tag-red')+'" style="font-size:9px">'+(a?.achieved?'✓':'✗')+'</span></div>';
  });
  s.psos.forEach((_,pi)=>{
    const a=s.psoAttainment[pi];const v=a?.att||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.psoTarget/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars"><div class="bc-bar" style="height:'+achH+'px;background:var(--purple)" title="PSO'+(pi+1)+': '+v.toFixed(2)+'"></div><div class="bc-bar bc-target" style="height:'+tgtH+'px"></div></div><div class="bc-label">PSO'+(pi+1)+'</div><span class="tag '+(a?.achieved?'tag-green':'tag-red')+'" style="font-size:9px">'+(a?.achieved?'✓':'✗')+'</span></div>';
  });
  h+='</div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 20: PO QUALITY LOOP
// ============================================================
function renderPOQuality(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Document corrective actions for POs that did not achieve target.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">🔄 PO Quality Loop</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>PO</th><th class="left">Name</th><th>Attainment</th><th>Target</th><th>Gap</th><th class="left">Corrective Action</th></tr></thead><tbody>';
  s.pos.forEach((p,pi)=>{
    const a=s.poAttainment[pi];const att=a?.att||0;const gap=s.poTarget-att;
    h+='<tr><td><span class="po-tag">PO'+(pi+1)+'</span></td>';
    h+='<td class="left" style="font-size:12px">'+p+'</td>';
    h+='<td style="font-family:monospace">'+(a?a.att.toFixed(2):'—')+'</td>';
    h+='<td style="font-family:monospace">'+s.poTarget.toFixed(2)+'</td>';
    h+='<td class="pct-cell" style="color:'+(gap>0?'var(--red)':'var(--green)')+'">'+(a?(gap>0?'+'+gap.toFixed(2):gap.toFixed(2)):'—')+'</td>';
    h+='<td class="left"><input type="text" value="'+(s.poRemarks[pi]||'')+'" placeholder="Enter corrective action..." onchange="sub().poRemarks['+pi+']=this.value" style="width:100%;border:1.5px solid var(--border2);border-radius:4px;padding:5px;font-family:inherit;font-size:12px"></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 21: PSO QUALITY LOOP
// ============================================================
function renderPSOQuality(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Instructions:</strong> Document corrective actions for PSOs.</div>';
  s.psos.forEach((pso,pi)=>{
    const a=s.psoAttainment[pi];
    h+='<div class="card"><div class="card-header"><div class="card-title">🎓 PSO'+(pi+1)+' Quality Loop</div>';
    h+='<span class="tag '+(a&&a.achieved?'tag-green':'tag-red')+'">'+(a&&a.achieved?'✓ Achieved':'✗ Gap')+'</span>';
    h+='</div><div class="card-body">';
    h+='<div class="ql-flow"><div class="ql-box"><div class="ql-label">PSO</div><div class="ql-val" style="font-size:12px">PSO'+(pi+1)+'</div></div>';
    h+='<div class="ql-box"><div class="ql-label">Attainment</div><div class="ql-val" style="color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'—')+'</div></div>';
    h+='<div class="ql-box"><div class="ql-label">Target</div><div class="ql-val">'+s.psoTarget.toFixed(2)+'</div></div>';
    h+='<div class="ql-box '+(a&&a.achieved?'achieved':'')+'"><div class="ql-label">Status</div><div class="ql-val">'+(a&&a.achieved?'✓':'✗')+'</div></div></div>';
    h+='<div class="fg" style="margin-top:12px"><label>Remarks / Corrective Action for PSO'+(pi+1)+'</label>';
    h+='<textarea rows="2" style="width:100%;padding:8px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px" onchange="sub().psoRemarks['+pi+']=this.value">'+(s.psoRemarks[pi]||'')+'</textarea></div>';
    h+='</div></div>';
  });
  el.innerHTML=h;
}

// ============================================================
//  ANNEXURE-I: WK KNOWLEDGE PROFILE
// ============================================================
const WK_PROFILE=[
  {wk:'WK1',title:'Mathematics',desc:'Knowledge of mathematics: calculus, differential equations, linear algebra, probability, statistics, numerical methods and discrete mathematics.'},
  {wk:'WK2',title:'Basic Sciences',desc:'Knowledge of science facts, concepts, principles and theories relevant to the engineering discipline — physics, chemistry, biology as applicable.'},
  {wk:'WK3',title:'Computing',desc:'Knowledge of computational techniques, algorithms, data structures, programming languages and software tools relevant to engineering.'},
  {wk:'WK4',title:'Engineering Fundamentals',desc:'Knowledge of engineering fundamentals: electrical, mechanical, chemical or civil engineering sciences and principles underpinning the discipline.'},
  {wk:'WK5',title:'Specialist Engineering Knowledge',desc:'Detailed, technical, and specialised knowledge of the engineering discipline that provides depth appropriate to undertake complex problem solving.'},
  {wk:'WK6',title:'Engineering Design',desc:'Knowledge required to undertake engineering design including design processes, methods, tools, standards and constraints (economic, social, environmental, ethical, health & safety).'},
  {wk:'WK7',title:'Technical Practice & Projects',desc:'Knowledge of engineering practice: workshop, laboratory, field skills, project management techniques, professional codes of practice and technical standards.'},
  {wk:'WK8',title:'Societal, Legal & Ethical',desc:'Knowledge of social, cultural, global, environmental and economic aspects of engineering practice — including sustainability, professional ethics and legal frameworks.'},
  {wk:'WK9',title:'Communication & Teamwork',desc:'Knowledge of communication principles, teamwork dynamics, leadership, interpersonal skills and lifelong learning strategies relevant to engineering professionals.'},
];
const PO_WK_MAP=[
  {po:'PO1',name:'Engineering Knowledge',wks:['WK1','WK2','WK3','WK4','WK5']},
  {po:'PO2',name:'Problem Analysis',wks:['WK1','WK2','WK3','WK4','WK5']},
  {po:'PO3',name:'Design/Development of Solutions',wks:['WK4','WK5','WK6']},
  {po:'PO4',name:'Conduct Investigations',wks:['WK1','WK2','WK3','WK4','WK5']},
  {po:'PO5',name:'Modern Tool Usage',wks:['WK3','WK5','WK6','WK7']},
  {po:'PO6',name:'Engineer and Society',wks:['WK6','WK7','WK8']},
  {po:'PO7',name:'Environment & Sustainability',wks:['WK6','WK7','WK8']},
  {po:'PO8',name:'Ethics',wks:['WK8']},
  {po:'PO9',name:'Individual & Team Work',wks:['WK8','WK9']},
  {po:'PO10',name:'Communication',wks:['WK7','WK8','WK9']},
  {po:'PO11',name:'Project Management & Finance',wks:['WK7','WK8','WK9']},
];

function renderAnnexureWK(el){
  const s=sub();
  let h='<div class="instr"><strong>📌 Annexure-I:</strong> Knowledge Base (WK) profile maps each PO to knowledge domains per NBA framework. WK level for each CO is set in Section 2.</div>';
  // WK profile table
  h+='<div class="card"><div class="card-header"><div class="card-title">📋 Knowledge Base (WK) Profile — NBA Annexure-I</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th style="width:60px">WK</th><th class="left" style="width:160px">Domain</th><th class="left">Description</th><th>CO Mapping</th><th>PO Mapping</th></tr></thead><tbody>';
  WK_PROFILE.forEach(wk=>{
    const mappedCOs=s.cos.filter(co=>{const wks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:['WK1']);return wks.includes(wk.wk);}).map(co=>co.id);
    const mappedPOs=PO_WK_MAP.filter(p=>p.wks.includes(wk.wk)).map(p=>p.po);
    h+='<tr><td><span class="tag tag-blue" style="font-size:13px;padding:4px 10px">'+wk.wk+'</span></td>';
    h+='<td class="left"><strong>'+wk.title+'</strong></td>';
    h+='<td class="left" style="font-size:12px;color:var(--text2)">'+wk.desc+'</td>';
    h+='<td>'+( mappedCOs.length?mappedCOs.map(c=>'<span class="co-tag" style="font-size:10px;margin:1px">'+c+'</span>').join(''):'<span class="tag tag-gray">—</span>')+'</td>';
    h+='<td style="font-size:11px">'+( mappedPOs.join(', ')||'—')+'</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // PO-WK mapping
  h+='<div class="card"><div class="card-header"><div class="card-title">🔗 Program Outcomes — WK Knowledge Base Mapping</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>PO</th><th class="left">PO Name</th><th>WK Levels</th><th>Attainment</th></tr></thead><tbody>';
  PO_WK_MAP.forEach((p,pi)=>{
    const att=s.poAttainment[pi];
    h+='<tr><td><span class="po-tag">'+p.po+'</span></td>';
    h+='<td class="left"><strong>'+p.name+'</strong></td>';
    h+='<td>'+p.wks.map(w=>'<span class="tag tag-blue" style="margin:1px;font-size:10px">'+w+'</span>').join('')+'</td>';
    h+='<td>'+(att?'<strong style="font-family:monospace;color:'+(att.achieved?'var(--green)':'var(--red)')+'">'+att.att.toFixed(2)+'</strong>':'<span class="tag tag-gray">Run Calc</span>')+'</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // CO-WK matrix
  h+='<div class="card"><div class="card-header"><div class="card-title">🧩 CO — WK Knowledge Profile Matrix</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>CO</th><th class="left">Outcome</th><th>WK</th>';
  WK_PROFILE.forEach(wk=>{ h+='<th>'+wk.wk+'</th>'; });
  h+='</tr></thead><tbody>';
  s.cos.forEach(co=>{
    const coWks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
    h+='<tr>';
    h+='<td><span class="co-tag">'+co.id+'</span></td>';
    h+='<td class="left" style="font-size:12px;max-width:200px">'+co.outcome.substring(0,70)+'...</td>';
    h+='<td>'+coWks.map(w=>'<span class="tag tag-blue" style="font-size:10px;margin:1px">'+w+'</span>').join('')+'</td>';
    WK_PROFILE.forEach(function(wk){
      const hit=coWks.includes(wk.wk);
      h+='<td style="text-align:center;background:'+(hit?'#d1fae5':'#f8fafc')+';cursor:default">'+(hit?'<strong style="color:var(--green);font-size:14px">●</strong>':'<span style="color:#e2e8f0">○</span>')+'</td>';
    });
    h+='</tr>';
  });
    h+='</tbody></table></div>';
  h+='<div style="margin-top:10px;font-size:12px;color:var(--text2)">WK levels (WK1–WK9) are set in Section 2. Each CO can map to multiple WK domains. ● indicates mapping per NBA Annexure-I framework. NBA requires all POs have COs mapped to required WK levels.</div>';
  h+='</div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 23: CERTIFICATE
// ============================================================
function renderCertificate(el){
  const s=sub();
  const achieved=s.coAttainment.filter(c=>c?.achieved).length;
  el.innerHTML=`
  <div style="text-align:center;margin-bottom:16px">
    <button class="btn btn-primary" style="margin-right:8px" onclick="printCertificate()">🖨 Print Certificate</button>
    <button class="btn btn-sm btn-gold" onclick="generateFullReport()">📄 Full Report</button>
  </div>
  <div id="certPrint" style="background:#fff;border:3px solid #d97706;border-radius:16px;max-width:800px;margin:0 auto;padding:48px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0">
      <span style="font-size:220px;font-weight:800;color:rgba(37,99,235,.03);font-family:'Plus Jakarta Sans',sans-serif">NBA</span>
    </div>
    <div style="position:absolute;inset:10px;border:1px solid rgba(217,119,6,.2);border-radius:10px;pointer-events:none"></div>
    <div style="position:relative;z-index:1;text-align:center">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="width:80px;display:flex;align-items:center;justify-content:flex-start">
          <img id="certLogo" src="SIGCE LOGO.jpeg" alt="SIGCE Logo" style="width:70px;height:70px;object-fit:contain">
        </div>
        <div style="flex:1;text-align:center;font-size:18px;font-weight:800;color:#1d4ed8;letter-spacing:.4px;text-transform:uppercase">
          Smt. Indira Gandhi College Of Engineering
        </div>
        <div style="width:80px"></div>
      </div>
      <div style="font-size:11px;letter-spacing:3px;color:#d97706;text-transform:uppercase;margin-bottom:8px">National Board of Accreditation</div>
      <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:2px">CERTIFICATE OF COURSE FILE</div>
      <div style="font-size:13px;color:#64748b;margin:6px 0 24px;letter-spacing:1px">Outcome Based Education — Attainment Documentation</div>
      <div style="width:80px;height:3px;background:linear-gradient(90deg,#d97706,transparent);margin:0 auto 28px"></div>
      <div style="font-size:15px;line-height:1.9;color:#334155;max-width:580px;margin:0 auto 28px">
        This is to certify that the Course File for <strong style="color:#2563eb">${s.name} (${s.code})</strong>
        offered in the Department of <strong style="color:#2563eb">${s.dept}</strong>
        at <strong style="color:#2563eb">${document.getElementById('inst_name')?.value||'Institution'}</strong>
        has been duly prepared in accordance with the NBA OBE guidelines for
        Academic Year <strong>${s.ay}</strong>, Semester <strong>${s.sem}</strong>.
        <br><br>
        Course Outcomes Achieved: <strong style="color:${achieved===6?'#059669':'#d97706'}">${achieved}/6 COs</strong>.
        The attainment calculations confirm that the course has been ${achieved>=4?'successfully':'partially'} aligned
        with the Program Outcomes as per NBA accreditation standards.
      </div>
      <div style="display:flex;justify-content:space-around;margin-top:40px;gap:20px">
        ${[['Course Faculty',s.faculty],['Head of Department','Signature'],['Principal / Director','Signature']].map(([role,name])=>`
        <div style="flex:1;text-align:center">
          <div style="height:48px"></div>
          <div style="border-top:1.5px solid #d97706;padding-top:8px;font-size:13px;color:#64748b">${role}<br><strong style="color:#2563eb">${name}</strong></div>
        </div>`).join('')}
      </div>
      <div style="margin-top:24px;font-size:12px;color:#94a3b8">
        Date: ${new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})} |
        Course Code: ${s.code} | Semester: ${s.sem}
      </div>
    </div>
  </div>`;
}

function printCertificate(){
  const cert=document.getElementById('certPrint')?.innerHTML;
  if(!cert){showToast('Navigate to Certificate page first','error');return;}
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>NBA Certificate</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>body{font-family:'Plus Jakarta Sans',sans-serif;background:#fff;padding:40px}</style>
    </head><body>${cert}<script>window.onload=()=>window.print()<\/script></body></html>`);
}

// ============================================================
//  FULL REPORT
// ============================================================
function generateFullReport(){
  calculateAll();
  setTimeout(()=>{
    const s=sub();
    PAGES.forEach((_,i)=>renderPage(i));
    const allPages=Array.from(document.querySelectorAll('.page')).map((p,i)=>'<div style="page-break-before:'+(i>0?'always':'avoid')+'"><h3 style="color:#2563eb;border-bottom:2px solid #2563eb;padding:8px 0;margin-bottom:12px">'+PAGES[i].section+'</h3>'+p.innerHTML+'</div>').join('');
    const w=window.open('','_blank');
    if(w){
      w.document.write('<!DOCTYPE html><html><head><title>NBA Course File — '+s.name+'</title>'
        +'<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">'
        +'<style>body{font-family:"Plus Jakarta Sans",sans-serif;padding:24px;font-size:12px}'
        +'.card{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;padding:12px}'
        +'table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #cbd5e1;padding:5px 8px}'
        +'.co-tag{background:#dbeafe;color:#2563eb;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}'
        +'.tag{padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}'
        +'.tag-green{background:#d1fae5;color:#059669}.tag-red{background:#fee2e2;color:#dc2626}'
        +'.tag-blue{background:#dbeafe;color:#2563eb}.tag-gold{background:#fef3c7;color:#d97706}'
        +'.tag-purple{background:#ede9fe;color:#7c3aed}'
        +'@media print{h3{font-size:13px}}</style>'
        +'</head><body>'
        +'<div style="background:#0f172a;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px">'
        +'<h1 style="margin:0;font-size:20px">NBA OBE Course File Report</h1>'
        +'<div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:8px;font-size:12px;opacity:.8">'
        +'<span>📚 '+s.name+' ('+s.code+')</span><span>🏛 '+s.dept+'</span>'
        +'<span>👨‍🏫 '+s.faculty+'</span><span>📅 AY '+s.ay+'</span>'
        +'<span>🎯 Target: '+s.coTargetLevel.toFixed(2)+'</span>'
        +'<span>📄 '+new Date().toLocaleDateString('en-IN')+'</span></div></div>'
        +allPages+'</body></html>');
      w.document.close();
      setTimeout(()=>w.print(),1000);
    }
    showToast('Full report opened!','success');
  },600);
}

// ============================================================
//  EXCEL EXPORT
// ============================================================
function exportAllExcel(){
  const s=sub();
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['NBA OBE — '+s.name],[''],['Code',s.code],['Dept',s.dept],['Faculty',s.faculty],['AY',s.ay],['Sem',s.sem],['Target',s.coTargetLevel.toFixed(2)]]),'1_CourseInfo');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CO','Objective','Outcome','Bloom','WK','PI'],...s.cos.map(c=>[c.id,c.objective,c.outcome,c.bloom,c.wk||'WK1',c.pi||''])]),'2_COs');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Roll No','Name','Gender','Category'],...s.students.map(st=>[st.roll,st.name,st.gender,st.category||'General'])]),'3_Students');
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),'PSO1','PSO2','PSO3'];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CO',...allPOs],...s.cos.map((co,ci)=>[co.id,...s.copoPOMatrix[ci]])]),'4_CO-PO Matrix');
  const cieTests=s.assessments.filter(a=>a.type==='CIE');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Roll No','Name',...cieTests.map(a=>a.name)],...s.students.map(st=>[st.roll,st.name,...cieTests.map(a=>s.marks[a.id]?.[st.roll]||'')])]),'10_CIE Marks');
  if(s.coAttainment[0]){
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CO','Bloom','PI','CIA%','ESE%','CES','Direct','Indirect','Final','Level','Status'],...s.cos.map((co,ci)=>{const ca=s.coAttainment[ci];return ca?[co.id,co.bloom,co.pi||'',ca.cia_pct.toFixed(1),ca.ese_pct.toFixed(1),ca.ces.toFixed(2),ca.direct.toFixed(2),ca.indirect.toFixed(2),ca.final.toFixed(2),ca.level,ca.achieved?'Achieved':'Gap']:[];})]),'15_CO Attainment');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['PO/PSO','Name','Attainment','Target','Level','Status'],...s.pos.map((_,pi)=>{const a=s.poAttainment[pi];return ['PO'+(pi+1),s.pos[pi],a?a.att.toFixed(2):'',s.poTarget.toFixed(2),a?a.level:'',a?( a.achieved?'Achieved':'Gap'):''];}), ...s.psos.map((_,pi)=>{const a=s.psoAttainment[pi];return ['PSO'+(pi+1),s.psos[pi],a?a.att.toFixed(2):'',s.psoTarget.toFixed(2),a?a.level:'',a?(a.achieved?'Achieved':'Gap'):''];})]),'18_PO PSO');
  }
  XLSX.writeFile(wb,'NBA_'+s.code+'_'+s.ay+'.xlsx');
  showToast('Excel exported!','success');
}

// ============================================================
//  MODAL HELPERS
// ============================================================
function openAddSubjectModal(){
  document.getElementById('modalTitle').textContent='Add New Subject';
  let body=fg('Course Name','ns_name','','text')+fg('Course Code','ns_code','','text');
  body+='<div class="fg"><label>Department</label><select id="ns_dept">';
  DEPARTMENTS.forEach(d=>{ body+='<option'+(d===(APP.user.dept||DEPARTMENTS[0])?' selected':'')+'>'+d+'</option>'; });
  body+='</select></div>';
  body+=fgSel('Semester','ns_sem',['I','II','III','IV','V','VI','VII','VIII'],'V');
  body+=fg('Academic Year','ns_ay','2024-25','text')+fg('Faculty Name','ns_fac',APP.user.name,'text');
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalFooter').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addSubject()">Add Subject</button>';
  document.getElementById('modalOverlay').classList.add('open');
}
async function addSubject(){
  const name=document.getElementById('ns_name').value;
  const code=document.getElementById('ns_code').value;
  if(!name||!code){showToast('Name and Code required','error');return;}
  const id='sub'+Date.now();
  const s=createDefaultSubject(name,code,document.getElementById('ns_dept').value,document.getElementById('ns_ay').value,document.getElementById('ns_sem').value,document.getElementById('ns_fac').value);
  s.id=id;APP.subjects[id]=s;APP.currentSubjectId=id;
  try{
    await createSubject(s);
    buildSubjectSelector();syncSubjectSelector();closeModal();buildContentPages();navigateTo(0);showToast('Subject added!','success');
  }catch(e){
    showToast(e.message||'Failed to add subject','error');
  }
}
function openAddUserModal(){
  document.getElementById('modalTitle').textContent='Add New User';
  let body=fg('Username','nu_user','','text')+fg('Full Name','nu_name','','text')+fg('Password','nu_pass','','text');
  body+=fgSel('Role','nu_role',['faculty','head','admin'],'faculty');
  body+='<div class="fg"><label>Department</label><select id="nu_dept">';
  DEPARTMENTS.forEach(d=>{ body+='<option>'+d+'</option>'; });
  body+='</select></div>';
  document.getElementById('modalBody').innerHTML=body;
  document.getElementById('modalFooter').innerHTML='<button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="addUser()">Add User</button>';
  document.getElementById('modalOverlay').classList.add('open');
}
async function addUser(){
  const u=document.getElementById('nu_user').value,n=document.getElementById('nu_name').value,p=document.getElementById('nu_pass').value;
  const r=document.getElementById('nu_role').value,d=document.getElementById('nu_dept').value;
  if(!u||!n||!p){showToast('All fields required','error');return;}
  try{
    await apiFetch('/api/users',{method:'POST',body:JSON.stringify({username:u,password:p,role:r,name:n,dept:d})});
    await refreshUsers();
    closeModal();navigateTo(0);showToast('User added!','success');
  }catch(e){
    showToast(e.message||'Failed to add user','error');
  }
}
async function deleteUser(u){
  if(confirm('Remove user '+u+'?')){
    try{
      await apiFetch('/api/users/'+encodeURIComponent(u),{method:'DELETE'});
      await refreshUsers();
      navigateTo(0);showToast('User removed','info');
    }catch(e){
      showToast(e.message||'Failed to remove user','error');
    }
  }
}
function closeModal(e){if(e&&e.target!==document.getElementById('modalOverlay'))return;document.getElementById('modalOverlay').classList.remove('open');}

// ============================================================
//  UTILITY
// ============================================================
function fg(label,id,value,type){return '<div class="fg"><label>'+label+'</label><input type="'+type+'" id="'+id+'" value="'+value+'" placeholder="'+label+'"></div>';}
function fgSel(label,id,opts,selected){return '<div class="fg"><label>'+label+'</label><select id="'+id+'">'+opts.map(o=>'<option'+(o===selected?' selected':'')+'>'+o+'</option>').join('')+'</select></div>';}

let toastTimer;
function showToast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=(type==='success'?'✓ ':type==='error'?'✗ ':'ℹ ')+msg;
  t.className='show '+(type||'success');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.className='',2800);
}


