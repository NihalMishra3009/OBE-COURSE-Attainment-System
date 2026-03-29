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

async function deleteCurrentSubject(){
  const ids=Object.keys(APP.subjects);
  if(ids.length<=1){
    showToast('At least one subject is required','error');
    return;
  }
  const id=APP.currentSubjectId;
  const s=APP.subjects[id];
  if(!id || !s) return;
  if(!confirm('Delete subject "'+s.name+'" ('+s.code+')&#8226; This cannot be undone.')) return;
  try{
    await deleteSubject(id);
    delete APP.subjects[id];
    const visibleSubs=getVisibleSubjects();
  if(visibleSubs.length) APP.currentSubjectId=visibleSubs[0].id;
  else APP.currentSubjectId=Object.keys(APP.subjects)[0];
    buildSubjectSelector();
    syncSubjectSelector();
    buildContentPages();
    navigateTo(0);
    showToast('Subject deleted','success');
  }catch(e){
    showToast(e.message||'Delete failed','error');
  }
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
    poTargets:Array(11).fill(2.00),
    psoTargets:Array(3).fill(2.00),
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
    psos:['PSO1 &#8212; Domain Specific Knowledge','PSO2 &#8212; Domain Application','PSO3 &#8212; Professional Practice'],
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
  {id:'pg0',  icon:'&#127968;',label:'Dashboard',                section:'Dashboard'},
  {id:'pg1',  icon:'&#128203;',label:'1. Course Info',           section:'Course Info & Setup'},
  {id:'pg2',  icon:'&#127919;',label:'2. CO / Objectives',       section:'Course Objectives & Outcomes'},
  {id:'pg3',  icon:'&#128101;',label:'3. Student List',          section:'Student List'},
  {id:'pg4',  icon:'&#128279;',label:'4. CO-PO Matrix',          section:'CO-PO Mapping Matrix'},
  {id:'pg5',  icon:'&#128225;',label:'5. Content Delivery',      section:'Modes of Content Delivery'},
  {id:'pg6',  icon:'&#9201;', label:'6. CO Hours',              section:'CO Teaching Hours'},
  {id:'pg7',  icon:'&#129504;',label:'7. Cognition Hrs',         section:'Cognition Learning Hours'},
  {id:'pg8',  icon:'&#128221;',label:'8. Assessments',           section:'Assessment Instruments'},
  {id:'pg9',  icon:'&#128279;',label:'9. CIA Q-Paper',           section:'CIA Question Paper & CO-Q Mapping'},
  {id:'pg10', icon:'&#128202;',label:'10. Marklist',             section:'Direct Assessment &#8212; Marklist'},
  {id:'pg11', icon:'&#128203;',label:'11. Indirect (CES)',       section:'Indirect Assessment &#8212; CES Survey'},
  {id:'pg12', icon:'&#128065;', label:'12. Learner Analysis',    section:'Student Learner Analysis'},
  {id:'pg13', icon:'&#128200;',label:'13. Monitoring',           section:'Learner Monitoring'},
  {id:'pg14', icon:'&#9200;',label:'14. PO/PSO Hours',         section:'PO-PSO Learning Hours'},
  {id:'pg15', icon:'&#127919;',label:'15. CO Attainment',        section:'CO Attainment Calculation'},
  {id:'pg16', icon:'&#128201;',label:'16. CO Gap Chart',         section:'CO Achievement / Gap Chart'},
  {id:'pg17', icon:'&#128260;',label:'17. CO Quality Loop',      section:'CO Quality Loop Closure'},
  {id:'pg18', icon:'&#127942;',label:'18. PO Attainment',        section:'Program Outcomes Attainment'},
  {id:'pg19', icon:'&#128201;',label:'19. PO Gap Chart',         section:'PO Achievement / Gap Chart'},
  {id:'pg20', icon:'&#128260;',label:'20. PO Quality Loop',      section:'PO Quality Loop Closure'},
  {id:'pg21', icon:'&#127891;',label:'21. PSO Quality Loop',     section:'PSO Quality Loop Closure'},
  {id:'pg22', icon:'&#128203;',label:'Annex-I: WK Profile',      section:'Annexure-I: Knowledge & Attitude Profile (WK)'},
  {id:'pg23', icon:'&#127941;',label:'23. Certificate',          section:'Course File Certificate'},
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
  const visibleSubs=getVisibleSubjects();
  if(visibleSubs.length) APP.currentSubjectId=visibleSubs[0].id;
  else APP.currentSubjectId=Object.keys(APP.subjects)[0];
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

function getVisibleSubjects(){
  const u=APP.user;
  return Object.values(APP.subjects).filter(function(s){
    if(u.role==='admin') return true;             // admin sees all
    if(u.role==='head') return s.dept===u.dept;   // head sees own dept
    // faculty sees own subjects (by username) or untagged ones
    return (!s.ownerUsername) || (s.ownerUsername===u.username);
  });
}

function buildSubjectSelector(){
  const sel=document.getElementById('globalSubjectSel');
  sel.innerHTML='';
  getVisibleSubjects().forEach(s=>{
    const opt=document.createElement('option');
    opt.value=s.id;
    opt.textContent=s.code+' &#8212; '+s.name.substring(0,22);
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
  document.getElementById('topbarSub').textContent=s?(s.code+' &#8212; '+s.name):'';
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
  const subjects=getVisibleSubjects();
  let html='<div class="g4" style="margin-bottom:20px">';
  html+='<div class="kpi blue"><div class="kpi-val">'+subjects.length+'</div><div class="kpi-label">Total Subjects</div><div class="kpi-sub">'+APP.user.role+' view</div></div>';
  html+='<div class="kpi green"><div class="kpi-val">'+subjects.reduce((a,s)=>a+s.students.length,0)+'</div><div class="kpi-label">Total Students</div></div>';
  html+='<div class="kpi gold"><div class="kpi-val">'+subjects.filter(s=>s.coAttainment[0]!==null).length+'</div><div class="kpi-label">Calculated</div></div>';
  html+='<div class="kpi purple"><div class="kpi-val">'+(APP.user.role==='admin'?Object.keys(USERS).length:1)+'</div><div class="kpi-label">Users</div></div>';
  html+='</div>';
  html+='<div class="card"><div class="card-header"><div class="card-title">&#128218; My Subjects</div>';
  html+='<div style="display:flex;gap:8px;align-items:center">';
  html+='<button class="btn btn-sm btn-outline" onclick="deleteCurrentSubject()">Delete Subject</button>';
  html+='<button class="btn btn-sm btn-outline" onclick="openAddSubjectModal()">+ Add Subject</button>';
  html+='</div></div><div class="card-body">';
  html+='<div class="g3">';
  subjects.forEach(s=>{
    html+='<div class="subject-card '+(s.id===APP.currentSubjectId?'active-sub':'')+'" onclick="switchSubjectAndGo(\''+s.id+'\',1)">';
    html+='<div class="sub-code">'+s.code+'</div>';
    html+='<div class="sub-name">'+s.name+'</div>';
    html+='<div class="sub-meta">'+s.dept+' &#8226; Sem '+s.sem+' &#8226; '+s.ay+'</div>';
    html+='<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">';
    html+='<span class="tag tag-blue">'+s.cos.length+' COs</span>';
    html+='<span class="tag tag-gray">'+s.students.length+' Students</span>';
    html+=(s.coAttainment[0]!==null?'<span class="tag tag-green">&#10003; Calculated</span>':'<span class="tag tag-gold">Pending</span>');
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
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128100; User Management</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddUserModal()">+ Add User</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Department</th><th>Action</th></tr></thead><tbody>';
  Object.entries(USERS).forEach(([u,d])=>{
    h+='<tr><td><code>'+u+'</code></td><td>'+d.name+'</td>';
    h+='<td><span class="role-badge role-'+d.role+'" style="padding:3px 8px;border-radius:20px;font-size:11px">'+d.role+'</span></td>';
    h+='<td>'+d.dept+'</td>';
    h+='<td><button class="btn btn-sm btn-danger" onclick="deleteUser(\''+u+'\')">&#10005; Remove</button></td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // Departments
  h+='<div class="card"><div class="card-header"><div class="card-title">&#127963; Department Management</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddDeptModal()">+ Add Department</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th>#</th><th class="left">Department Name</th><th>Subjects</th><th>Faculty</th><th>Action</th></tr></thead><tbody>';
  DEPARTMENTS.forEach((d,di)=>{
    h+='<tr><td>'+(di+1)+'</td><td class="left"><strong>'+d+'</strong></td>';
    h+='<td><span class="tag tag-blue">'+Object.values(APP.subjects).filter(s=>s.dept===d).length+'</span></td>';
    h+='<td><span class="tag tag-gray">'+Object.values(USERS).filter(u=>u.dept===d).length+'</span></td>';
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeDept('+di+')">&times;</button></td></tr>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Fill all course details and attainment targets. Click Save &#8212; data reflects across all sections.</div>';
  h+='<div class="g2">';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#127963; Institution Details</div></div><div class="card-body">';
  h+=fg('Institution Name','inst_name',s.instName||s.name,'text');
  h+=fg('Department','inst_dept',s.dept,'text');
  h+=fg('Program','inst_prog',s.program||('B.E. '+s.dept),'text');
  h+=fg('Academic Year','ay',s.ay,'text');
  h+=fgSel('Semester','sem',['I','II','III','IV','V','VI','VII','VIII'],s.sem);
  h+=fg('Faculty Name','faculty_name',s.faculty,'text');
  h+='</div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128218; Course Details</div></div><div class="card-body">';
  h+=fg('Course Name','c_name',s.name,'text');
  h+=fg('Course Code','c_code',s.code,'text');
  h+=fg('Credits','c_credits',s.credits,'number');
  h+=fg('Total Teaching Hours','c_hours',s.totalHours||48,'number');
  h+=fg('Batch / Division','c_batch',s.batch||'2022-26 / A','text');
  h+=fg('CIE Weight (%)','c_ciewt',(s.cieWeight*100),'number');
  h+=fg('ESE Weight (%)','c_esewt',(s.eseWeight*100),'number');
  h+='</div></div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#127919; Attainment Target Configuration</div></div><div class="card-body">';
  h+='<div class="instr"><strong>Marks Threshold:</strong> Minimum % marks a student must score to be counted as "attained" for that CO.</div>';
  h+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
  h+='<label style="font-size:12px;font-weight:700;color:var(--text2)">Marks Threshold (%)</label>';
  h+='<input type="range" min="40" max="80" step="5" value="'+s.coTargetPct+'" oninput="updateTargetPct(this.value)" style="flex:1">';
  h+='<span class="tag tag-blue" style="font-size:16px;font-weight:800;min-width:50px;text-align:center" id="pctDisplay">'+s.coTargetPct+'%</span>';
  h+='</div>';
  h+='<div class="g4" style="margin-bottom:16px">';
  h+='<div class="fg"><label>CO Target (0.00&#8211;3.00)</label>';
  h+='<input type="number" id="co_target" value="'+s.coTargetLevel.toFixed(2)+'" min="0" max="3" step="0.01" style="padding:9px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;width:100%"></div>';
  h+='</div>';
  h+='<div class="card" style="margin-bottom:12px;border-left:4px solid var(--accent)">';
  h+='<div class="card-header"><div class="card-title">&#127919; PO Individual Targets (PO1 &#8211; PO11)</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="setAllPOTargets()">Set All</button></div>';
  h+='<div class="card-body">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">';
  if(!s.poTargets || s.poTargets.length<s.pos.length) s.poTargets=Array(s.pos.length).fill(s.poTarget||2.00);
  s.pos.forEach((po,pi)=>{
    h+='<div style="text-align:center;min-width:64px">';
    h+='<div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:4px">PO'+(pi+1)+'</div>';
    h+='<input type="number" id="po_t_'+pi+'" value="'+s.poTargets[pi].toFixed(2)+'" min="0" max="3" step="0.01" style="width:64px;padding:6px 4px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;font-size:13px;font-weight:700;text-align:center" title="'+po+'">';
    h+='<div style="font-size:9px;color:var(--text3);margin-top:2px;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+po+'">'+po.substring(0,10)+'</div>';
    h+='</div>';
  });
  h+='</div></div></div>';
  h+='<div class="card" style="margin-bottom:16px;border-left:4px solid var(--purple)">';
  h+='<div class="card-header"><div class="card-title">&#127891; PSO Individual Targets (PSO1 &#8211; PSO'+s.psos.length+')</div>';
  h+='<button class="btn btn-sm btn-outline" style="border-color:var(--purple);color:var(--purple)" onclick="setAllPSOTargets()">Set All</button></div>';
  h+='<div class="card-body">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">';
  if(!s.psoTargets || s.psoTargets.length<s.psos.length) s.psoTargets=Array(s.psos.length).fill(s.psoTarget||2.00);
  s.psos.forEach((pso,pi)=>{
    h+='<div style="text-align:center;min-width:100px">';
    h+='<div style="font-size:10px;font-weight:700;color:var(--purple);margin-bottom:4px">PSO'+(pi+1)+'</div>';
    h+='<input type="number" id="pso_t_'+pi+'" value="'+s.psoTargets[pi].toFixed(2)+'" min="0" max="3" step="0.01" style="width:80px;padding:6px 4px;border:1.5px solid #c4b5fd;border-radius:6px;font-family:monospace;font-size:13px;font-weight:700;text-align:center">';
    h+='<div style="font-size:9px;color:var(--text3);margin-top:2px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+pso+'">'+pso.substring(0,14)+'</div>';
    h+='</div>';
  });
  h+='</div></div></div>';
  h+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:8px">';
  h+='<div style="font-size:12px;font-weight:700;color:var(--text2)">Direct Assessment Weight (%)</div>';
  h+='<input type="number" id="dir_wt" value="'+Math.round(s.directWeight*100)+'" min="50" max="90" step="5" style="width:80px;padding:8px;border:1.5px solid var(--border2);border-radius:6px;font-family:monospace;font-size:14px;font-weight:700">';
  h+='<div style="font-size:11px;color:var(--text2)">Indirect Weight: <strong>'+(100-Math.round(s.directWeight*100))+'%</strong></div>';
  h+='</div>';
  // ---- Dynamic Attainment Level Configuration (NBA Standard) ----
  const savedLvlPct = s.attainLvlPct || {3:65,2:55,1:45};
  // Default SEE/CIE/CES ranges from NBA standard (editable)
  if(!s.seeLvl) s.seeLvl = {1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cieLvl) s.cieLvl = {1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cesLvl) s.cesLvl = {1:{min:75,max:80}, 2:{min:80,max:85}, 3:{min:85,max:100}};

  h+='<div style="margin:16px 0;padding:16px;background:linear-gradient(135deg,#f0f7ff,#e8f4ff);border-radius:12px;border:1.5px solid #93c5fd">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
  h+='<strong style="font-size:14px;color:#1d4ed8">A. Level of Attainments &#8212; Class Average for Course Outcome</strong>';
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
  h+='<span style="position:absolute;right:4px;top:0;line-height:16px;font-size:9px;font-weight:700;color:#059669">L3='+l3v2+'%</span>';
  h+='</div>';
  h+='<div style="display:flex;gap:10px;font-size:11px">';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#dbeafe;border-radius:2px;vertical-align:middle"></span> L1=<span id="v_l1">'+l1v2+'</span>%</span>';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#fef3c7;border-radius:2px;vertical-align:middle"></span> L2=<span id="v_l2">'+l2v2+'</span>%</span>';
  h+='<span><span style="display:inline-block;width:10px;height:10px;background:#d1fae5;border-radius:2px;vertical-align:middle"></span> L3=<span id="v_l3">'+l3v2+'</span>%</span>';
  h+='</div></div>';
  h+='<p style="font-size:10px;color:var(--text3);margin-top:6px">* All values are editable. SEE = End Semester Exam, CIE = Continuous Internal Evaluation, CES = Course Exit Survey. Click Save Configuration to persist changes.</p>';
  h+='</div>';
  // Indirect Assessment config
  h+='<div style="margin:16px 0;padding:14px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd">';
  h+='<strong style="font-size:13px;color:var(--accent2)">&#128257; Indirect Assessment (CES) Configuration</strong>';
  h+='<p style="font-size:11px;color:var(--text2);margin:6px 0 10px">CES = Course Exit Survey. Ratings on 1&#8211;5 scale. Set the target score and weight below.</p>';
  h+='<div class="g4">';
  h+='<div class="fg"><label>CES Target Score (1&#8211;5)</label><input type="number" id="ces_target" value="'+(s.cesTarget||3.5)+'" min="1" max="5" step="0.1" style="padding:9px;border:1.5px solid #bae6fd;border-radius:6px;width:100%"></div>';
  h+='<div class="fg"><label>Indirect Weight (%)</label><input type="number" id="indir_wt" value="'+Math.round(s.indirectWeight*100)+'" min="10" max="50" step="5" style="padding:9px;border:1.5px solid #bae6fd;border-radius:6px;width:100%"></div>';
  h+='<div class="fg"><label>CES &#8594; Attainment (Score =4 &#8594; L3)</label><div style="padding:9px;background:#e0f2fe;border-radius:6px;font-size:12px">=4.0&#8594;L3 | =3.5&#8594;L2 | =2.5&#8594;L1 | else&#8594;0</div></div>';
  h+='<div class="fg"><label>CES Survey Status</label><div style="padding:9px;background:#d1fae5;border-radius:6px;font-size:12px;color:var(--green)">'+( (s.cesData&&s.cesData.length)?s.cesData.length+' responses loaded':'Upload in Section 11')+'</div></div>';
  h+='</div></div>';
  h+='<button class="btn btn-primary" style="max-width:200px" onclick="saveCourseInfo()">&#128190; Save Configuration</button>';
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

function setAllPOTargets(){
  const s=sub();
  const v=parseFloat(prompt('Set target for all POs (0.00&#8211;3.00):', (s.poTarget||2.00).toFixed(2)));
  if(isNaN(v)) return;
  if(!s.poTargets || s.poTargets.length<s.pos.length) s.poTargets=Array(s.pos.length).fill(2.00);
  s.poTargets=s.poTargets.map(()=>v);
  s.poTarget=v;
  renderCourseInfo(document.getElementById(PAGES[1].id));
}

function setAllPSOTargets(){
  const s=sub();
  const v=parseFloat(prompt('Set target for all PSOs (0.00&#8211;3.00):', (s.psoTarget||2.00).toFixed(2)));
  if(isNaN(v)) return;
  if(!s.psoTargets || s.psoTargets.length<s.psos.length) s.psoTargets=Array(s.psos.length).fill(2.00);
  s.psoTargets=s.psoTargets.map(()=>v);
  s.psoTarget=v;
  renderCourseInfo(document.getElementById(PAGES[1].id));
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
      +'<span style="position:absolute;right:4px;top:0;line-height:16px;font-size:9px;font-weight:700;color:#059669">L3='+l3+'%</span>';
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
  s.directWeight=(+gv('dir_wt',s.directWeight*100))/100;
  s.indirectWeight=Math.round((1-s.directWeight)*100)/100;
  s.cesTarget=+(gv('ces_target',s.cesTarget||3.5));
  // Save SEE/CIE/CES level ranges (already saved live via updateLvlRange)
  if(!s.seeLvl) s.seeLvl={1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cieLvl) s.cieLvl={1:{min:40,max:54},2:{min:55,max:74},3:{min:75,max:100}};
  if(!s.cesLvl) s.cesLvl={1:{min:75,max:80},2:{min:80,max:85},3:{min:85,max:100}};
  // Save PO/PSO individual targets
  if(!s.poTargets || s.poTargets.length<s.pos.length) s.poTargets=Array(s.pos.length).fill(s.poTarget||2.00);
  s.pos.forEach((_,pi)=>{const el2=document.getElementById('po_t_'+pi);if(el2)s.poTargets[pi]=parseFloat((+el2.value).toFixed(2));});
  s.poTarget=s.poTargets.reduce((a,b)=>a+b,0)/s.poTargets.length;
  if(!s.psoTargets || s.psoTargets.length<s.psos.length) s.psoTargets=Array(s.psos.length).fill(s.psoTarget||2.00);
  s.psos.forEach((_,pi)=>{const el2=document.getElementById('pso_t_'+pi);if(el2)s.psoTargets[pi]=parseFloat((+el2.value).toFixed(2));});
  s.psoTarget=s.psoTargets.reduce((a,b)=>a+b,0)/s.psoTargets.length;

  // Save dynamic attainment level thresholds
  if(!s.attainLvlPct) s.attainLvlPct={};
  [1,2,3].forEach(l=>{const el2=document.getElementById('lvl_pct_'+l);if(el2)s.attainLvlPct[l]=+el2.value;});
  buildSubjectSelector();syncSubjectSelector();
  document.getElementById('topbarSub').textContent=s.code+' &#8212; '+s.name;
  showToast('Configuration saved & reflected across all sections!','success');
}

// ============================================================
//  PAGE 2: CO / OBJECTIVES
// ============================================================
const BLOOM_LEVELS=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
const WK_LEVELS=['WK1','WK2','WK3','WK4','WK5','WK6','WK7','WK8','WK9'];

const BLOOM_DICT={
  Remember:{
    color:'#7c3aed',light:'#ede9fe',
    desc:'Recall facts, names, definitions &#8212; lowest cognitive level.',
    verbs:['Define','List','Name','Recall','Identify','State','Recognize','Memorize',
           'Reproduce','Label','Enumerate','Match','Select','Outline']
  },
  Understand:{
    color:'#2563eb',light:'#dbeafe',
    desc:'Explain ideas or concepts in own words &#8212; interpret and classify.',
    verbs:['Explain','Describe','Summarize','Interpret','Classify','Compare',
           'Paraphrase','Discuss','Illustrate','Translate','Extend','Infer','Predict']
  },
  Apply:{
    color:'#0ea5e9',light:'#e0f2fe',
    desc:'Use knowledge in new situations &#8212; solve, demonstrate, implement.',
    verbs:['Solve','Calculate','Use','Demonstrate','Apply','Execute','Implement',
           'Operate','Show','Sketch','Construct','Compute','Perform','Practice']
  },
  Analyze:{
    color:'#059669',light:'#d1fae5',
    desc:'Break information into parts, find patterns and relationships.',
    verbs:['Analyze','Differentiate','Compare','Contrast','Examine','Distinguish',
           'Organize','Relate','Investigate','Deconstruct','Categorize','Infer','Attribute']
  },
  Evaluate:{
    color:'#d97706',light:'#fef3c7',
    desc:'Make judgements, critique, justify decisions based on criteria.',
    verbs:['Evaluate','Judge','Justify','Critique','Assess','Defend','Argue',
           'Recommend','Appraise','Prioritize','Select','Rate','Support','Validate']
  },
  Create:{
    color:'#dc2626',light:'#fee2e2',
    desc:'Produce new or original work &#8212; design, construct, plan.',
    verbs:['Design','Create','Formulate','Develop','Plan','Build','Produce',
           'Construct','Compose','Generate','Devise','Invent','Prototype','Synthesize']
  }
};

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
  if(!s.syllabusText) s.syllabusText='';
  if(!s.syllabusFileName) s.syllabusFileName='';
  // Active sub-tab: 'cos' | 'bloom' | 'syllabus'
  if(!window._coTab) window._coTab='cos';
  const tab=window._coTab;

  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Define Course Objectives &amp; Outcomes, select Bloom\'s level, upload syllabus, and refer to the Bloom\'s dictionary for action verbs.</div>';

  // Sub-tab bar
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:10px">';
  h+='<button class="btn btn-sm '+(tab==='cos'?'btn-primary':'btn-outline')+'" onclick="setCoTab(\'cos\')">&#127919; CO / Outcomes</button>';
  h+='<button class="btn btn-sm '+(tab==='bloom'?'btn-primary':'btn-outline')+'" onclick="setCoTab(\'bloom\')">&#129504; Bloom\'s Dictionary</button>';
  h+='<button class="btn btn-sm '+(tab==='syllabus'?'btn-primary':'btn-outline')+'" onclick="setCoTab(\'syllabus\')">&#128196; Syllabus</button>';
  h+='</div>';

  // &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552; CO / OUTCOMES TAB &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;
  if(tab==='cos'){
    // Objectives table
    h+='<div class="card"><div class="card-header"><div class="card-title">&#127919; Course Objectives</div>';
    h+='<div style="display:flex;gap:6px">';
    h+='<button class="btn btn-sm btn-outline" onclick="addCO()">+ Add CO</button>';
    h+='<button class="btn btn-sm btn-success" onclick="saveCOs()">&#128190; Save COs</button>';
    h+='</div></div><div class="card-body">';
    h+='<div class="tbl-wrap"><table><thead><tr>';
    h+='<th style="width:60px">CO</th>';
    h+='<th class="left" style="min-width:220px">Objective Statement</th>';
    h+='<th class="left" style="min-width:220px">Outcome Statement</th>';
    h+='<th style="width:130px">Bloom\'s Level</th>';
    h+='<th style="width:170px">WK Level(s)</th>';
    h+='<th class="left" style="min-width:160px">Performance Indicator</th>';
    h+='<th style="width:40px"></th>';
    h+='</tr></thead><tbody>';
    s.cos.forEach(function(co,i){
      const coWks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
      const bColor=BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].color:'var(--accent)';
      const bLight=BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].light:'#dbeafe';
      h+='<tr style="background:'+(i%2?'var(--surface2)':'var(--surface)')+';vertical-align:top">';
      // CO id
      h+='<td style="padding-top:10px"><span class="co-tag">'+co.id+'</span></td>';
      // Objective
      h+='<td class="left"><textarea rows="3" style="width:100%;padding:7px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px;resize:vertical" onchange="sub().cos['+i+'].objective=this.value">'+co.objective+'</textarea></td>';
      // Outcome
      h+='<td class="left"><textarea rows="3" style="width:100%;padding:7px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px;resize:vertical" onchange="sub().cos['+i+'].outcome=this.value">'+co.outcome+'</textarea></td>';
      // Bloom level
      h+='<td>';
      h+='<select style="padding:6px;border:1.5px solid '+bColor+';border-radius:6px;font-family:inherit;font-size:12px;width:100%;color:'+bColor+';font-weight:700;background:'+bLight+'" onchange="sub().cos['+i+'].bloom=this.value;renderCOPage(document.getElementById(PAGES[2].id))">';
      BLOOM_LEVELS.forEach(function(b){ h+='<option'+(co.bloom===b?' selected':'')+'>'+b+'</option>'; });
      h+='</select>';
      h+='<div style="margin-top:4px;font-size:10px;color:'+bColor+';font-weight:700;text-align:center">L'+(BLOOM_LEVELS.indexOf(co.bloom)+1)+' &#8212; '+co.bloom+'</div>';
      // Show 3 verbs from dictionary as hint
      if(BLOOM_DICT[co.bloom]){
        h+='<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:2px">';
        BLOOM_DICT[co.bloom].verbs.slice(0,4).forEach(function(v){
          h+='<span style="font-size:9px;background:'+bLight+';color:'+bColor+';padding:1px 5px;border-radius:10px;font-weight:600">'+v+'</span>';
        });
        h+='</div>';
      }
      h+='</td>';
      // WK multi-checkboxes
      h+='<td><div style="display:flex;flex-wrap:wrap;gap:2px;padding:4px;border:1.5px solid var(--border2);border-radius:6px;background:#fff;max-height:100px;overflow-y:auto">';
      WK_LEVELS.forEach(function(w){
        const sel=coWks.includes(w);
        h+='<label style="display:flex;align-items:center;gap:2px;font-size:9px;font-weight:700;cursor:pointer;padding:2px 4px;border-radius:3px;background:'+(sel?'#dbeafe':'#f1f5f9')+';color:'+(sel?'#2563eb':'#64748b')+'">';
        h+='<input type="checkbox" data-ci="'+i+'" data-wk="'+w+'"'+(sel?' checked':'')+' onchange="handleWKToggle(this)" style="width:10px;height:10px">'+w+'</label>';
      });
      h+='</div></td>';
      // PI textarea
      h+='<td class="left"><textarea rows="3" placeholder="Enter PI code and description..." style="width:100%;padding:5px;border:1.5px solid var(--border2);border-radius:5px;font-family:inherit;font-size:11px;resize:vertical" onchange="sub().cos['+i+'].pi=this.value">'+(co.pi||'')+'</textarea></td>';
      // Delete
      h+='<td style="padding-top:10px"><button class="btn btn-sm btn-danger" onclick="removeCO('+i+')">&#10005;</button></td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div></div>';

    // CO Summary preview
    h+='<div class="card"><div class="card-header"><div class="card-title">&#128196; Report Preview &#8212; CO Summary</div></div><div class="card-body">';
    h+='<div class="tbl-wrap"><table><thead><tr style="background:var(--surface3)">';
    h+='<th>CO</th><th class="left">Objective</th><th class="left">Outcome</th><th>Bloom</th><th>WK</th><th>PI</th></tr></thead><tbody>';
    s.cos.forEach(function(co){
      const wkArr=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
      const bColor=BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].color:'var(--accent)';
      h+='<tr>';
      h+='<td><strong>'+co.id+'</strong></td>';
      h+='<td class="left" style="font-size:11px">'+co.objective.substring(0,55)+'&#8230;</td>';
      h+='<td class="left" style="font-size:11px">'+co.outcome.substring(0,65)+'&#8230;</td>';
      h+='<td><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+(BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].light:'#dbeafe')+';color:'+bColor+'">'+co.bloom+'</span></td>';
      h+='<td>'+wkArr.map(function(w){return '<span class="tag tag-blue" style="font-size:9px;margin:1px">'+w+'</span>';}).join('')+'</td>';
      h+='<td style="font-size:10px;color:var(--text2);max-width:140px">'+(co.pi||'&#8212;')+'</td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div></div>';
  }

  // &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552; BLOOM'S DICTIONARY TAB &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;
  if(tab==='bloom'){
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">';
    BLOOM_LEVELS.forEach(function(level,li){
      const d=BLOOM_DICT[level];
      h+='<div class="card" style="border-left:5px solid '+d.color+'">';
      h+='<div class="card-header" style="background:'+d.light+';border-radius:8px 8px 0 0">';
      h+='<div class="card-title" style="color:'+d.color+'">L'+(li+1)+' &#8212; '+level+'</div>';
      h+='<span style="font-size:11px;color:'+d.color+';font-weight:600">Bloom\'s Level '+(li+1)+'</span>';
      h+='</div><div class="card-body">';
      h+='<p style="font-size:12px;color:var(--text2);margin-bottom:10px">'+d.desc+'</p>';
      h+='<strong style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Action Verbs</strong>';
      h+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">';
      d.verbs.forEach(function(v){
        h+='<span style="padding:3px 9px;border-radius:20px;background:'+d.light+';color:'+d.color+';font-size:11px;font-weight:700;border:1px solid '+d.color+'22">'+v+'</span>';
      });
      h+='</div>';
      // Show BLOOM_PI hints
      if(BLOOM_PI[level]){
        h+='<div style="margin-top:10px">';
        h+='<strong style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Performance Indicators</strong>';
        BLOOM_PI[level].forEach(function(pi){
          h+='<div style="font-size:11px;color:var(--text2);padding:3px 0;border-bottom:1px dashed var(--border)">'+pi+'</div>';
        });
        h+='</div>';
      }
      h+='</div></div>';
    });
    h+='</div>';
    // Quick reference table
    h+='<div class="card" style="margin-top:14px"><div class="card-header"><div class="card-title">&#128202; Quick Reference &#8212; All Verb Levels</div></div><div class="card-body">';
    h+='<div class="tbl-wrap"><table><thead><tr>';
    BLOOM_LEVELS.forEach(function(b,i){
      const d=BLOOM_DICT[b];
      h+='<th style="background:'+d.color+';color:#fff;min-width:110px">L'+(i+1)+': '+b+'</th>';
    });
    h+='</tr></thead><tbody>';
    // max 14 verbs rows
    for(let r=0;r<14;r++){
      h+='<tr>';
      BLOOM_LEVELS.forEach(function(b){
        const v=BLOOM_DICT[b].verbs[r]||'';
        const d=BLOOM_DICT[b];
        h+='<td style="font-size:11px;font-weight:600;color:'+d.color+';background:'+(r%2?d.light+'88':d.light+'44')+';padding:5px 8px">'+v+'</td>';
      });
      h+='</tr>';
    }
    h+='</tbody></table></div></div></div>';
  }

  // &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552; SYLLABUS TAB &#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;&#9552;
  if(tab==='syllabus'){
    if(!s.syllabusModules||!s.syllabusModules.length){
      s.syllabusModules=s.cos.map(function(co,i){
        const coWks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
        return {no:i+1,title:'Module '+(i+1)+': [Title]',topics:'Topic 1\nTopic 2\nTopic 3',
                cos:[co.id],blooms:[co.bloom||'Apply'],wks:coWks.length?coWks:['WK1'],
                hours:Math.round((s.totalHours||48)/s.cos.length)};
      });
    }
    if(!s.syllabusTextBooks)  s.syllabusTextBooks=[{title:'',author:'',pub:'',ed:'',year:''}];
    if(!s.syllabusRefBooks)   s.syllabusRefBooks=[{title:'',author:'',pub:'',ed:'',year:''}];
    if(!s.syllabusAssessment) s.syllabusAssessment={cie:Math.round((s.cieWeight||0.4)*100),ese:Math.round((s.eseWeight||0.6)*100),ciePattern:'',esePattern:'',other:''};

    const BL=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
    const BLC={'Remember':'#7c3aed','Understand':'#2563eb','Apply':'#0ea5e9','Analyze':'#059669','Evaluate':'#d97706','Create':'#dc2626'};
    const BLBg={'Remember':'#ede9fe','Understand':'#dbeafe','Apply':'#e0f2fe','Analyze':'#d1fae5','Evaluate':'#fef3c7','Create':'#fee2e2'};
    const WKL=['WK1','WK2','WK3','WK4','WK5','WK6','WK7','WK8','WK9'];

    h+='<div class="card">';
    h+='<div class="card-header">';
    h+='<div class="card-title">&#128196; Syllabus &#8212; '+s.name+' ('+s.code+')</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    h+='<button class="btn btn-sm btn-outline" onclick="triggerUpload(\'syllabusFile\')">&#128193; Upload TXT/DOCX</button>';
    h+='<input type="file" id="syllabusFile" accept=".txt,.text,.docx" style="display:none" onchange="uploadSyllabus(this)">';
    h+='<button class="btn btn-sm btn-success" onclick="saveSyllabusTable()">&#128190; Save</button>';
    h+='<button class="btn btn-sm btn-purple" onclick="exportSyllabusExcel()">&#128202; Export Excel</button>';
    h+='</div></div>';
    h+='<div class="card-body">';

    // &#9472;&#9472; MODULE TABLE &#9472;&#9472;
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
    h+='<strong style="font-size:13px;color:var(--accent)">&#128203; Module-wise Syllabus</strong>';
    h+='<button class="btn btn-sm btn-outline" onclick="addSyllabusModule()">+ Add Module</button>';
    h+='</div>';

    h+='<div class="tbl-wrap"><table style="font-size:12px;border-collapse:collapse;width:100%">';
    h+='<thead><tr style="background:#1e40af;color:#fff;text-align:center">';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;width:54px">Module<br>No</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;min-width:130px;text-align:left">Module Title</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;min-width:200px;text-align:left">Detailed Syllabus<br><small style="font-weight:400;font-size:10px">(one topic per line)</small></th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;min-width:70px">CO(s)</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;min-width:160px">Bloom\'s Level(s)</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;min-width:130px">WK(s)</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;width:56px">Hours</th>';
    h+='<th style="padding:8px 6px;border:1px solid #93c5fd;width:32px"></th>';
    h+='</tr></thead><tbody>';

    s.syllabusModules.forEach(function(mod,mi){
      const modCOs=Array.isArray(mod.cos)?mod.cos:(mod.cos?[mod.cos]:[]);
      const modBlooms=Array.isArray(mod.blooms)?mod.blooms:(mod.blooms?[mod.blooms]:[]);
      const modWKs=Array.isArray(mod.wks)?mod.wks:(mod.wks?[mod.wks]:[]);
      const topics=mod.topics||'';

      h+='<tr style="background:'+(mi%2?'#f0f7ff':'#fff')+';vertical-align:top">';

      // Module No
      h+='<td style="padding:5px;border:1px solid #bfdbfe;text-align:center">';
      h+='<input type="number" value="'+mod.no+'" min="1" style="width:42px;padding:4px;border:1px solid #bfdbfe;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;text-align:center" onchange="sub().syllabusModules['+mi+'].no=+this.value">';
      h+='</td>';

      // Title
      h+='<td style="padding:5px;border:1px solid #bfdbfe">';
      h+='<input type="text" value="'+mod.title.replace(/"/g,'&quot;')+'" style="width:100%;padding:5px;border:1px solid #bfdbfe;border-radius:4px;font-family:inherit;font-size:12px" onchange="sub().syllabusModules['+mi+'].title=this.value">';
      h+='</td>';

      // Topics
      h+='<td style="padding:5px;border:1px solid #bfdbfe">';
      h+='<textarea rows="4" style="width:100%;padding:5px;border:1px solid #bfdbfe;border-radius:4px;font-family:inherit;font-size:11px;resize:vertical;line-height:1.5" onchange="sub().syllabusModules['+mi+'].topics=this.value">'+topics+'</textarea>';
      h+='</td>';

      // CO multi-checkboxes
      h+='<td style="padding:5px;border:1px solid #bfdbfe">';
      h+='<div style="display:flex;flex-direction:column;gap:3px">';
      s.cos.forEach(function(co){
        const chk=modCOs.includes(co.id);
        h+='<label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 4px;border-radius:4px;background:'+(chk?'#dbeafe':'#f8fafc')+';font-size:11px;font-weight:700;color:'+(chk?'#2563eb':'#94a3b8')+'">';
        h+='<input type="checkbox" data-mi="'+mi+'" data-co="'+co.id+'"'+(chk?' checked':'')+' onchange="toggleSylMod(this,\'cos\')" style="width:11px;height:11px">'+co.id+'</label>';
      });
      h+='</div></td>';

      // Bloom's multi-checkboxes
      h+='<td style="padding:5px;border:1px solid #bfdbfe">';
      h+='<div style="display:flex;flex-direction:column;gap:2px">';
      BL.forEach(function(bl,li){
        const chk=modBlooms.includes(bl);
        const col=BLC[bl];const bg=BLBg[bl];
        h+='<label style="display:flex;align-items:center;gap:3px;cursor:pointer;padding:2px 5px;border-radius:4px;background:'+(chk?bg:'#f8fafc')+';border:1px solid '+(chk?col+'55':'#e2e8f0')+';font-size:10px;font-weight:700;color:'+(chk?col:'#94a3b8')+'">';
        h+='<input type="checkbox" data-mi="'+mi+'" data-bl="'+bl+'"'+(chk?' checked':'')+' onchange="toggleSylMod(this,\'blooms\')" style="width:10px;height:10px">L'+(li+1)+' '+bl+'</label>';
      });
      h+='</div></td>';

      // WK multi-checkboxes
      h+='<td style="padding:5px;border:1px solid #bfdbfe">';
      h+='<div style="display:flex;flex-wrap:wrap;gap:3px">';
      WKL.forEach(function(wk){
        const chk=modWKs.includes(wk);
        h+='<label style="display:flex;align-items:center;gap:2px;cursor:pointer;padding:2px 5px;border-radius:4px;background:'+(chk?'#dbeafe':'#f1f5f9')+';font-size:10px;font-weight:700;color:'+(chk?'#2563eb':'#64748b')+';border:1px solid '+(chk?'#93c5fd':'#e2e8f0')+'">';
        h+='<input type="checkbox" data-mi="'+mi+'" data-wk="'+wk+'"'+(chk?' checked':'')+' onchange="toggleSylMod(this,\'wks\')" style="width:10px;height:10px">'+wk+'</label>';
      });
      h+='</div></td>';

      // Hours
      h+='<td style="padding:5px;border:1px solid #bfdbfe;text-align:center">';
      h+='<input type="number" value="'+(mod.hours||8)+'" min="1" max="60" style="width:46px;padding:4px;border:1px solid #bfdbfe;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;text-align:center" onchange="sub().syllabusModules['+mi+'].hours=+this.value">';
      h+='</td>';

      // Delete
      h+='<td style="padding:5px;border:1px solid #bfdbfe;text-align:center">';
      h+='<button class="btn btn-sm btn-danger" style="padding:3px 6px" onclick="removeSyllabusModule('+mi+')">&#10005;</button>';
      h+='</td>';
      h+='</tr>';
    });

    // Total row
    const totHrs=s.syllabusModules.reduce(function(a,m){return a+(m.hours||0);},0);
    const tgt=s.totalHours||48;
    h+='<tr style="background:#dbeafe">';
    h+='<td colspan="6" style="padding:7px 12px;border:1px solid #bfdbfe;font-weight:700;font-size:12px;color:#1d4ed8;text-align:right">Total Hours</td>';
    h+='<td style="padding:7px;border:1px solid #bfdbfe;text-align:center;font-family:monospace;font-size:13px;font-weight:800;color:'+(totHrs===tgt?'var(--green)':totHrs>tgt?'var(--red)':'var(--gold)')+'">'+totHrs+' / '+tgt+'</td>';
    h+='<td style="border:1px solid #bfdbfe"></td></tr>';
    h+='</tbody></table></div>';

    // &#9472;&#9472; TEXT BOOKS &#9472;&#9472;
    h+='<div style="margin-top:20px">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
    h+='<strong style="font-size:13px;color:#1d4ed8">&#128215; Text Books</strong>';
    h+='<button class="btn btn-sm btn-outline" onclick="addSyllabusBook(\'text\')">+ Add</button>';
    h+='</div>';
    h+='<div class="tbl-wrap"><table style="font-size:12px;border-collapse:collapse;width:100%">';
    h+='<thead><tr style="background:#1e40af;color:#fff">';
    h+='<th style="padding:7px;border:1px solid #93c5fd;width:32px;text-align:center">#</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd">Title</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd">Author(s)</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd">Publisher</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd;width:60px">Edition</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd;width:58px">Year</th>';
    h+='<th style="padding:7px;border:1px solid #93c5fd;width:32px"></th>';
    h+='</tr></thead><tbody>';
    s.syllabusTextBooks.forEach(function(bk,bi){
      h+='<tr style="background:'+(bi%2?'#f0f7ff':'#fff')+'">';
      h+='<td style="padding:5px;border:1px solid #bfdbfe;text-align:center;font-weight:700;color:#1d4ed8">'+(bi+1)+'</td>';
      ['title','author','pub'].forEach(function(fld){
        h+='<td style="padding:4px;border:1px solid #bfdbfe">';
        h+='<input type="text" value="'+(bk[fld]||'').replace(/"/g,'&quot;')+'" placeholder="'+fld+'" onchange="sub().syllabusTextBooks['+bi+'][\''+fld+'\']=this.value" style="width:100%;padding:4px;border:1px solid #bfdbfe;border-radius:3px;font-family:inherit;font-size:11px">';
        h+='</td>';
      });
      h+='<td style="padding:4px;border:1px solid #bfdbfe"><input type="text" value="'+(bk.ed||'')+'" placeholder="3rd" onchange="sub().syllabusTextBooks['+bi+'].ed=this.value" style="width:56px;padding:4px;border:1px solid #bfdbfe;border-radius:3px;font-family:inherit;font-size:11px"></td>';
      h+='<td style="padding:4px;border:1px solid #bfdbfe"><input type="number" value="'+(bk.year||2020)+'" min="1900" max="2099" onchange="sub().syllabusTextBooks['+bi+'].year=+this.value" style="width:54px;padding:4px;border:1px solid #bfdbfe;border-radius:3px;font-family:monospace;font-size:11px"></td>';
      h+='<td style="padding:4px;border:1px solid #bfdbfe;text-align:center"><button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:10px" onclick="removeSyllabusBook(\'text\','+bi+')">&#10005;</button></td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div>';

    // &#9472;&#9472; REFERENCE BOOKS &#9472;&#9472;
    h+='<div style="margin-top:16px">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
    h+='<strong style="font-size:13px;color:#7c3aed">&#128216; Reference Books</strong>';
    h+='<button class="btn btn-sm btn-outline" style="border-color:var(--purple);color:var(--purple)" onclick="addSyllabusBook(\'ref\')">+ Add</button>';
    h+='</div>';
    h+='<div class="tbl-wrap"><table style="font-size:12px;border-collapse:collapse;width:100%">';
    h+='<thead><tr style="background:#6d28d9;color:#fff">';
    h+='<th style="padding:7px;border:1px solid #c4b5fd;width:32px;text-align:center">#</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd">Title</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd">Author(s)</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd">Publisher</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd;width:60px">Edition</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd;width:58px">Year</th>';
    h+='<th style="padding:7px;border:1px solid #c4b5fd;width:32px"></th>';
    h+='</tr></thead><tbody>';
    s.syllabusRefBooks.forEach(function(bk,bi){
      h+='<tr style="background:'+(bi%2?'#faf5ff':'#fff')+'">';
      h+='<td style="padding:5px;border:1px solid #c4b5fd;text-align:center;font-weight:700;color:#7c3aed">'+(bi+1)+'</td>';
      ['title','author','pub'].forEach(function(fld){
        h+='<td style="padding:4px;border:1px solid #c4b5fd">';
        h+='<input type="text" value="'+(bk[fld]||'').replace(/"/g,'&quot;')+'" placeholder="'+fld+'" onchange="sub().syllabusRefBooks['+bi+'][\''+fld+'\']=this.value" style="width:100%;padding:4px;border:1px solid #c4b5fd;border-radius:3px;font-family:inherit;font-size:11px">';
        h+='</td>';
      });
      h+='<td style="padding:4px;border:1px solid #c4b5fd"><input type="text" value="'+(bk.ed||'')+'" placeholder="3rd" onchange="sub().syllabusRefBooks['+bi+'].ed=this.value" style="width:56px;padding:4px;border:1px solid #c4b5fd;border-radius:3px;font-family:inherit;font-size:11px"></td>';
      h+='<td style="padding:4px;border:1px solid #c4b5fd"><input type="number" value="'+(bk.year||2020)+'" min="1900" max="2099" onchange="sub().syllabusRefBooks['+bi+'].year=+this.value" style="width:54px;padding:4px;border:1px solid #c4b5fd;border-radius:3px;font-family:monospace;font-size:11px"></td>';
      h+='<td style="padding:4px;border:1px solid #c4b5fd;text-align:center"><button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:10px" onclick="removeSyllabusBook(\'ref\','+bi+')">&#10005;</button></td>';
      h+='</tr>';
    });
    h+='</tbody></table></div></div>';

    // &#9472;&#9472; ASSESSMENT PATTERN &#9472;&#9472;
    const asp=s.syllabusAssessment;
    h+='<div style="margin-top:16px;padding:14px;background:#f0fdf4;border-radius:10px;border:1.5px solid #86efac">';
    h+='<strong style="font-size:13px;color:var(--green);display:block;margin-bottom:12px">&#128202; Assessment Pattern</strong>';
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">';
    h+='<div class="fg"><label style="font-size:11px">CIE Weight (%)</label>';
    h+='<input type="number" value="'+asp.cie+'" min="0" max="100" onchange="sub().syllabusAssessment.cie=+this.value" style="padding:7px;border:1.5px solid #86efac;border-radius:5px;width:100%;font-family:monospace;font-size:14px;font-weight:700"></div>';
    h+='<div class="fg"><label style="font-size:11px">ESE Weight (%)</label>';
    h+='<input type="number" value="'+asp.ese+'" min="0" max="100" onchange="sub().syllabusAssessment.ese=+this.value" style="padding:7px;border:1.5px solid #86efac;border-radius:5px;width:100%;font-family:monospace;font-size:14px;font-weight:700"></div>';
    h+='<div class="fg"><label style="font-size:11px">CIE Pattern / Components</label>';
    h+='<input type="text" value="'+(asp.ciePattern||'').replace(/"/g,'&quot;')+'" placeholder="e.g. 2 tests &#215; 30 marks" onchange="sub().syllabusAssessment.ciePattern=this.value" style="padding:7px;border:1.5px solid #86efac;border-radius:5px;width:100%;font-family:inherit;font-size:12px"></div>';
    h+='<div class="fg"><label style="font-size:11px">ESE Pattern / Duration</label>';
    h+='<input type="text" value="'+(asp.esePattern||'').replace(/"/g,'&quot;')+'" placeholder="e.g. 3-hour exam, 100 marks" onchange="sub().syllabusAssessment.esePattern=this.value" style="padding:7px;border:1.5px solid #86efac;border-radius:5px;width:100%;font-family:inherit;font-size:12px"></div>';
    h+='<div class="fg" style="grid-column:1/-1"><label style="font-size:11px">Other (Lab, Mini-project, Seminar&#8230;)</label>';
    h+='<textarea rows="2" onchange="sub().syllabusAssessment.other=this.value" style="width:100%;padding:7px;border:1.5px solid #86efac;border-radius:5px;font-family:inherit;font-size:12px;resize:vertical" placeholder="e.g. Lab: 25 marks, Mini-project: 25 marks">'+(asp.other||'')+'</textarea></div>';
    h+='</div></div>';

    h+='</div></div>';
  }
  el.innerHTML=h;
}
function setCoTab(t){ window._coTab=t; renderCOPage(document.getElementById(PAGES[2].id)); }
function toggleSylMod(el,field){
  const mi=+el.getAttribute('data-mi');
  const s=sub();
  const mod=s.syllabusModules[mi];
  if(!Array.isArray(mod[field])) mod[field]=[];
  const val=el.getAttribute('data-co')||el.getAttribute('data-bl')||el.getAttribute('data-wk');
  if(el.checked){if(!mod[field].includes(val)) mod[field].push(val);}
  else mod[field]=mod[field].filter(function(x){return x!==val;});
}
function addSyllabusModule(){
  const s=sub();
  if(!s.syllabusModules) s.syllabusModules=[];
  const n=s.syllabusModules.length+1;
  s.syllabusModules.push({no:n,title:'Module '+n+': [Title]',topics:'Topic 1\nTopic 2\nTopic 3',
    cos:[(s.cos[0]||{id:'CO1'}).id],blooms:['Apply'],wks:['WK1'],hours:8});
  renderCOPage(document.getElementById(PAGES[2].id));
}
function removeSyllabusModule(mi){
  sub().syllabusModules.splice(mi,1);
  renderCOPage(document.getElementById(PAGES[2].id));
}
function addSyllabusBook(type){
  const key=type==='text'?'syllabusTextBooks':'syllabusRefBooks';
  if(!sub()[key]) sub()[key]=[];
  sub()[key].push({title:'',author:'',pub:'',ed:'',year:2020});
  renderCOPage(document.getElementById(PAGES[2].id));
}
function removeSyllabusBook(type,bi){
  const key=type==='text'?'syllabusTextBooks':'syllabusRefBooks';
  sub()[key].splice(bi,1);
  renderCOPage(document.getElementById(PAGES[2].id));
}
function saveSyllabusTable(){
  showToast('Syllabus saved!','success');
}
function openSyllabusTemplateModal(){ renderCOPage(document.getElementById(PAGES[2].id)); }
function generateSyllabusTemplate(){ renderCOPage(document.getElementById(PAGES[2].id)); }
function applySyllabusTemplate(){ showToast('Syllabus saved','success'); }
function exportSyllabusExcel(){
  const s=sub();
  const rows=[['Module No','Module Title','Topics','CO(s)','Bloom\'s Level(s)','WK(s)','Hours']];
  (s.syllabusModules||[]).forEach(function(m){
    rows.push([m.no,m.title,(m.topics||'').replace(/\n/g,'; '),
      (m.cos||[]).join(', '),(m.blooms||[]).join(', '),(m.wks||[]).join(', '),m.hours||0]);
  });
  rows.push([],['\ud83d\udcd7 TEXT BOOKS'],['#','Title','Author','Publisher','Edition','Year']);
  (s.syllabusTextBooks||[]).forEach(function(bk,i){
    rows.push([i+1,bk.title||'',bk.author||'',bk.pub||'',bk.ed||'',bk.year||'']);
  });
  rows.push([],['\ud83d\udcd8 REFERENCE BOOKS'],['#','Title','Author','Publisher','Edition','Year']);
  (s.syllabusRefBooks||[]).forEach(function(bk,i){
    rows.push([i+1,bk.title||'',bk.author||'',bk.pub||'',bk.ed||'',bk.year||'']);
  });
  const asp=s.syllabusAssessment||{};
  rows.push([],['\ud83d\udcca ASSESSMENT PATTERN'],['Component','Weight %','Pattern/Details']);
  rows.push(['CIE',asp.cie||40,asp.ciePattern||'']);
  rows.push(['ESE',asp.ese||60,asp.esePattern||'']);
  if(asp.other) rows.push(['Other','',asp.other]);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:10},{wch:28},{wch:50},{wch:12},{wch:22},{wch:18},{wch:7}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Syllabus');
  XLSX.writeFile(wb,(s.code||'Course')+'_Syllabus.xlsx');
  showToast('Exported!','success');
}
function addCO(){
  const s=sub();
  const n=s.cos.length+1;
  s.cos.push({id:'CO'+n,objective:'Objective for CO'+n,outcome:'Students will be able to ...',bloom:'Apply',wk:['WK1'],pi:''});
  if(!s.copoPOMatrix) s.copoPOMatrix=[];
  s.copoPOMatrix.push(Array(14).fill(0));
  if(!s.bloomHrs) s.bloomHrs=[];
  s.bloomHrs.push(Array(6).fill(0));
  if(!s.coHours) s.coHours=[];
  s.coHours.push(Array((s.hourCols||[]).length).fill(0));
  s.coAttainment=s.cos.map(function(){return null;});
  renderCOPage(document.getElementById(PAGES[2].id));
  showToast('CO'+n+' added','success');
}
function removeCO(i){
  const s=sub();
  if(s.cos.length<=1){showToast('At least 1 CO required','error');return;}
  s.cos.splice(i,1);
  if(s.copoPOMatrix) s.copoPOMatrix.splice(i,1);
  if(s.bloomHrs) s.bloomHrs.splice(i,1);
  if(s.coHours) s.coHours.splice(i,1);
  s.cos.forEach(function(co,idx){co.id='CO'+(idx+1);});
  s.coAttainment=s.cos.map(function(){return null;});
  renderCOPage(document.getElementById(PAGES[2].id));
  showToast('CO removed','info');
}
function uploadSyllabus(input){
  const f=input.files[0];if(!f)return;
  sub().syllabusFileName=f.name;
  const name=f.name.toLowerCase();
  const reader=new FileReader();
  if(name.endsWith('.txt')||name.endsWith('.text')){
    reader.onload=function(e){sub().syllabusText=e.target.result;showToast('Loaded: '+f.name,'success');renderCOPage(document.getElementById(PAGES[2].id));};
    reader.readAsText(f);
  } else if(name.endsWith('.docx')){
    reader.onload=function(e){
      if(typeof mammoth!=='undefined'){
        mammoth.extractRawText({arrayBuffer:e.target.result}).then(function(r){
          sub().syllabusText=r.value||'';showToast('DOCX extracted: '+f.name,'success');renderCOPage(document.getElementById(PAGES[2].id));
        }).catch(function(){showToast('Could not extract DOCX','error');});
      } else {showToast('mammoth library not loaded','error');}
    };
    reader.readAsArrayBuffer(f);
  } else {showToast('Supports TXT and DOCX only','info');}
}
function buildSyllabusPreview(t){return '';}
function livePreviewSyllabus(t){sub().syllabusText=t;}
function clearSyllabus(){sub().syllabusText='';sub().syllabusFileName='';renderCOPage(document.getElementById(PAGES[2].id));showToast('Cleared','info');}
function saveSyllabus(){const el=document.getElementById('syllabusText');if(el)sub().syllabusText=el.value;showToast('Saved!','success');}

function autoMapCOsFromSyllabus(){
  const s=sub();
  const el=document.getElementById('syllabusText');
  if(el) s.syllabusText=el.value;
  if(!s.syllabusText){showToast('Paste syllabus text first','error');return;}
  const text=s.syllabusText.toLowerCase();
  const hints=[];
  if(/data struct|tree|graph|sort|search/i.test(text)) hints.push('Understand and implement fundamental data structures');
  if(/algorithm|complex|efficient/i.test(text)) hints.push('Analyze algorithm complexity and efficiency');
  if(/design|pattern|architect/i.test(text)) hints.push('Design solutions using appropriate patterns');
  if(/implement|program|code|software/i.test(text)) hints.push('Implement programs using appropriate techniques');
  if(/network|protocol|communicate/i.test(text)) hints.push('Apply networking protocols in system design');
  if(hints.length){
    showToast(hints.length+' outcome suggestions &#8212; check CO outcomes!','info');
    s.cos.forEach(function(co,i){if(hints[i]) co.outcome='Students will be able to '+hints[i];});
    renderCOPage(document.getElementById(PAGES[2].id));
  } else {
    showToast('Could not auto-detect &#8212; edit COs manually','info');
  }
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Upload student list via Excel (Roll No, Name, Gender) or add manually. No attendance needed here.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  h+='<button class="btn btn-sm btn-gold" onclick="downloadStudentTemplate()">&#11015; Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'stuUpload\').click()">&#128193; Upload Excel</button>';
  h+='<input type="file" id="stuUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadStudents(this)">';
  h+='<button class="btn btn-sm btn-success" onclick="genSampleStudents()">&#127922; Sample Students</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="openAddStudentModal()">+ Add Manual</button></div>';
  if(!s.students.length){
    h+='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:48px">&#128101;</div><div>No students yet. Upload Excel or add manually.</div></div></div>';
  } else {
    h+='<div class="card"><div class="card-header"><div class="card-title">&#128101; Student List</div>';
    h+='<div class="kpi blue" style="padding:8px"><div class="kpi-val" style="font-size:20px">'+s.students.length+'</div><div class="kpi-label">Students</div></div>';
    h+='</div><div class="card-body"><div class="tbl-wrap"><table>';
    h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th><th>Gender</th><th>Category</th><th>Action</th></tr></thead><tbody>';
    s.students.forEach((st,i)=>{
      h+='<tr><td>'+(i+1)+'</td><td class="left"><code style="font-size:11px">'+st.roll+'</code></td>';
      h+='<td class="left">'+st.name+'</td><td>'+st.gender+'</td><td>'+(st.category||'General')+'</td>';
      h+='<td><button class="btn btn-sm btn-danger" onclick="removeStudent('+i+')">&times;</button></td></tr>';
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
  if(!s.copoJustification) s.copoJustification={};
  const allPOs=[...s.pos.map(function(_,i){return 'PO'+(i+1);}),
                ...s.psos.map(function(_,i){return 'PSO'+(i+1);})];
  const allPONames=[...s.pos,...s.psos];

  // Sub-tab: 'matrix' | 'justify'
  if(!window._copoTab) window._copoTab='matrix';
  const tab=window._copoTab;

  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Map each CO to POs/PSOs (1=Low, 2=Medium, 3=High). Then add justification text for each mapping in the Justification tab.</div>';

  // Tab bar
  h+='<div style="display:flex;gap:6px;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:10px">';
  h+='<button class="btn btn-sm '+(tab==='matrix'?'btn-primary':'btn-outline')+'" onclick="setCopoTab(\'matrix\')">&#128279; Mapping Matrix</button>';
  h+='<button class="btn btn-sm '+(tab==='justify'?'btn-primary':'btn-outline')+'" onclick="setCopoTab(\'justify\')">&#9997;&#65039; Justification</button>';
  h+='</div>';

  // &#226;&#8226;&#144;&#226;&#8226;&#144; MATRIX TAB &#226;&#8226;&#144;&#226;&#8226;&#144;
  if(tab==='matrix'){
    h+='<div class="card"><div class="card-header"><div class="card-title">&#128279; CO-PO / CO-PSO Mapping Matrix</div>';
    h+='<div style="display:flex;gap:8px;align-items:center">';
    h+='<span class="tag tag-green" style="font-size:11px">3 = High</span>';
    h+='<span class="tag tag-gold" style="font-size:11px">2 = Medium</span>';
    h+='<span class="tag tag-blue" style="font-size:11px">1 = Low</span>';
    h+='<button class="btn btn-sm btn-success" onclick="showToast(\'Matrix saved!\',\'success\')">&#128190; Save</button>';
    h+='</div></div><div class="card-body">';
    h+='<div class="tbl-wrap"><table>';
    h+='<thead><tr><th style="min-width:60px;position:sticky;left:0;background:var(--surface3);z-index:1">CO</th>';
    // PO headers
    s.pos.forEach(function(_,i){
      h+='<th style="width:46px;font-size:11px;background:#dbeafe;color:#1d4ed8">PO'+(i+1)+'</th>';
    });
    // PSO headers
    s.psos.forEach(function(_,i){
      h+='<th style="width:52px;font-size:11px;background:#ede9fe;color:#7c3aed">PSO'+(i+1)+'</th>';
    });
    h+='<th style="width:50px">Avg</th></tr></thead><tbody>';
    s.cos.forEach(function(co,ci){
      const nz=s.copoPOMatrix[ci].filter(function(v){return v>0;});
      const avg=nz.length?(nz.reduce(function(a,b){return a+b;},0)/nz.length).toFixed(2):'-';
      h+='<tr><td style="position:sticky;left:0;background:var(--surface);z-index:1"><span class="co-tag">'+co.id+'</span></td>';
      s.copoPOMatrix[ci].forEach(function(v,pi){
        const isPSO=pi>=s.pos.length;
        const bg=isPSO?'#f5f3ff':'';
        h+='<td style="background:'+bg+'"><div class="mv mv-'+v+'" onclick="cycleMV('+ci+','+pi+',this)" style="cursor:pointer;user-select:none">'+(v||'')+'</div></td>';
      });
      h+='<td><strong class="tag tag-blue" style="font-family:monospace;font-size:11px">'+avg+'</strong></td></tr>';
    });
    // Avg row
    h+='<tr style="background:var(--surface2)"><td style="position:sticky;left:0;background:var(--surface2);font-weight:700;font-size:12px">Avg</td>';
    allPOs.forEach(function(_,pi){
      const vals=s.copoPOMatrix.map(function(row){return row[pi];}).filter(function(v){return v>0;});
      const avg=vals.length?(vals.reduce(function(a,b){return a+b;},0)/vals.length).toFixed(2):'-';
      const isPSO=pi>=s.pos.length;
      h+='<td style="background:'+(isPSO?'#f5f3ff':'')+';font-family:monospace;font-size:11px;font-weight:700;text-align:center">'+avg+'</td>';
    });
    h+='<td></td></tr>';
    h+='</tbody></table></div>';
    // Full print view
    h+='<div style="margin-top:16px;background:var(--surface2);border-radius:8px;padding:14px">';
    h+='<strong style="color:var(--accent);font-size:13px">&#128196; Full Matrix Report View</strong>';
    h+='<div id="copoPrintView" style="margin-top:10px;overflow-x:auto"></div></div>';
    h+='</div></div>';
  }

  // &#226;&#8226;&#144;&#226;&#8226;&#144; JUSTIFICATION TAB &#226;&#8226;&#144;&#226;&#8226;&#144;
  if(tab==='justify'){
    h+='<div class="instr" style="background:#f0fdf4;border-color:#86efac">&#9997;&#65039; Enter justification for each CO &#8594; PO/PSO mapping. Explain <em>why</em> and <em>how</em> this CO contributes to the PO/PSO. Only mapped (1/2/3) pairs are shown.</div>';

    s.cos.forEach(function(co,ci){
      const mapped=[];
      s.copoPOMatrix[ci].forEach(function(v,pi){
        if(v>0) mapped.push({pi:pi,v:v,label:allPOs[pi],name:allPONames[pi]});
      });
      if(!mapped.length) return;
      const bColor=BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].color:'var(--accent)';
      const bLight=BLOOM_DICT[co.bloom]?BLOOM_DICT[co.bloom].light:'#dbeafe';

      h+='<div class="card" style="margin-bottom:14px;border-left:4px solid '+bColor+'">';
      h+='<div class="card-header" style="background:'+bLight+'44">';
      h+='<div class="card-title"><span class="co-tag">'+co.id+'</span> ';
      h+='<span style="font-size:12px;color:var(--text2);font-weight:400">'+co.outcome.substring(0,70)+'...</span></div>';
      h+='<span style="font-size:11px;font-weight:600;color:'+bColor+'">'+co.bloom+' (L'+(BLOOM_LEVELS.indexOf(co.bloom)+1)+')</span>';
      h+='</div><div class="card-body">';
      h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">';

      mapped.forEach(function(m){
        const key=co.id+'_'+m.label;
        const savedJ=(s.copoJustification&&s.copoJustification[key])||'';
        const isPSO=m.pi>=s.pos.length;
        const strength=m.v===3?'High':m.v===2?'Medium':'Low';
        const sColor=m.v===3?'var(--green)':m.v===2?'var(--gold)':'var(--accent)';

        h+='<div style="padding:10px;border:1.5px solid '+(isPSO?'#c4b5fd':'#bfdbfe')+';border-radius:8px;background:'+(isPSO?'#faf5ff':'#f8faff')+'">';
        h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
        h+='<span style="font-weight:800;font-size:13px;color:'+(isPSO?'var(--purple)':'var(--accent)')+'">'+m.label+'</span>';
        h+='<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:'+sColor+'22;color:'+sColor+'">'+strength+' ('+m.v+')</span>';
        h+='</div>';
        h+='<div style="font-size:10px;color:var(--text2);margin-bottom:6px">'+m.name.substring(0,50)+'</div>';
        h+='<textarea rows="3" data-key="'+key+'" placeholder="Justify how '+co.id+' maps to '+m.label+' ('+strength+' level)...\ne.g. This CO develops skills in '+co.bloom.toLowerCase()+' which directly supports '+m.label+'..." style="width:100%;padding:6px;border:1px solid '+(isPSO?'#c4b5fd':'#bfdbfe')+';border-radius:5px;font-family:inherit;font-size:11px;resize:vertical;background:#fff" onchange="saveJustification(this)">'+savedJ+'</textarea>';
        h+='</div>';
      });
      h+='</div>';
      // CO-level summary justification
      const coKey=co.id+'_summary';
      const coSummary=(s.copoJustification&&s.copoJustification[coKey])||'';
      h+='<div style="margin-top:10px">';
      h+='<label style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">'+co.id+' Overall Justification (optional)</label>';
      h+='<textarea rows="2" data-key="'+coKey+'" placeholder="Overall rationale for how this CO contributes to the program..." style="width:100%;padding:7px;border:1.5px solid var(--border2);border-radius:6px;font-family:inherit;font-size:12px;margin-top:4px;resize:vertical" onchange="saveJustification(this)">'+coSummary+'</textarea>';
      h+='</div>';
      h+='</div></div>';
    });

    if(!s.cos.some(function(co,ci){return s.copoPOMatrix[ci].some(function(v){return v>0;});})){
      h+='<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3)">No CO-PO mappings yet. Go to the Matrix tab and set mapping values first.</div></div>';
    }

    // Export justification button
    h+='<div style="margin-top:10px;display:flex;gap:8px">';
    h+='<button class="btn btn-sm btn-gold" onclick="downloadJustification()">&#128202; Export Justification Excel</button>';
    h+='</div>';
  }

  el.innerHTML=h;
  if(tab==='matrix') buildCopoPrintView();
}
function setCopoTab(t){ window._copoTab=t; renderCOPOMatrix(document.getElementById(PAGES[4].id)); }
function saveJustification(el){
  const key=el.getAttribute('data-key');
  if(!sub().copoJustification) sub().copoJustification={};
  sub().copoJustification[key]=el.value;
}
function downloadJustification(){
  const s=sub();
  const rows=[['CO','PO/PSO','Strength','CO Outcome','PO/PSO Name','Justification']];
  const allPONames=[...s.pos,...s.psos];
  const allPOLabels=[...s.pos.map(function(_,i){return 'PO'+(i+1);}),
                     ...s.psos.map(function(_,i){return 'PSO'+(i+1);})];
  s.cos.forEach(function(co,ci){
    s.copoPOMatrix[ci].forEach(function(v,pi){
      if(!v) return;
      const key=co.id+'_'+allPOLabels[pi];
      rows.push([
        co.id, allPOLabels[pi],
        v===3?'High':v===2?'Medium':'Low',
        co.outcome.substring(0,80),
        allPONames[pi],
        (s.copoJustification&&s.copoJustification[key])||''
      ]);
    });
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:6},{wch:6},{wch:8},{wch:50},{wch:40},{wch:60}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'CO-PO Justification');
  XLSX.writeFile(wb,s.code+'_CO_PO_Justification.xlsx');
  showToast('Justification exported!','success');
}
function buildCopoPrintView(){
  const s=sub();
  const el=document.getElementById('copoPrintView');
  if(!el||!s)return;
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),...s.psos.map((_,i)=>'PSO'+(i+1))];
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Enter hours for each CO under each delivery mode.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128225; Modes of Content Delivery</div>';
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
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeDeliveryMode('+mi+')">&times;</button></td></tr>';
  });
  h+='</tbody><tfoot id="delivFoot"></tfoot></table></div></div></div>';
  // Chart: CO-wise total delivery hours
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; CO Delivery Hours &#8212; Bar Chart</div></div><div class="card-body">';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Enter teaching hours per CO per hour type. Totals auto-computed.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#9201; CO Teaching Hours</div>';
  h+='<button class="btn btn-sm btn-outline" onclick="addHourCol()">+ Add Column</button></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th class="left">CO</th><th class="left">Outcome</th>';
  s.hourCols.forEach((c,i)=>{ h+='<th>'+c+' <button class="btn btn-sm btn-danger" style="padding:1px 5px;font-size:10px" onclick="removeHourCol('+i+')">&times;</button></th>'; });
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
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; CO Teaching Hours &#8212; Bar Chart</div></div><div class="card-body">';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Enter hours spent at each cognitive level (Bloom\'s Taxonomy) per CO.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#129504; Cognition Learning Hours (Bloom\'s Taxonomy)</div></div><div class="card-body">';
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
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; Cognition Hours &#8212; Bloom\'s Level Distribution Chart</div></div><div class="card-body">';
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
//  PAGE 8: ASSESSMENTS &#8212; Direct & Indirect
// ============================================================
function renderAssessments(el){
  const s=sub();
  const directTypes=['CIE','ESE','Lab','Assignment','Seminar'];
  const indirectTypes=['CES','Peer Review','Alumni Survey','Employer Survey','Exit Survey'];
  const directList=s.assessments.filter(a=>directTypes.includes(a.type)||!indirectTypes.includes(a.type));
  const indirectList=s.assessments.filter(a=>indirectTypes.includes(a.type));

  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Direct assessments measure CO attainment directly through marks. Indirect assessments capture student/stakeholder perception. Both contribute to final CO attainment.</div>';

  // Summary KPIs
  h+='<div class="g4" style="margin-bottom:20px">';
  h+='<div class="kpi blue"><div class="kpi-val">'+directList.length+'</div><div class="kpi-label">Direct Assessments</div><div class="kpi-sub">CIE + ESE + Lab</div></div>';
  h+='<div class="kpi purple"><div class="kpi-val">'+indirectList.length+'</div><div class="kpi-label">Indirect Assessments</div><div class="kpi-sub">CES + Survey</div></div>';
  h+='<div class="kpi green"><div class="kpi-val">'+(s.cieWeight*100).toFixed(0)+'%</div><div class="kpi-label">CIE Weight</div></div>';
  h+='<div class="kpi gold"><div class="kpi-val">'+(s.directWeight*100).toFixed(0)+'%</div><div class="kpi-label">Direct Weight</div></div>';
  h+='</div>';

  // ---- DIRECT ASSESSMENT TABLE ----
  h+='<div class="card" style="border-left:4px solid var(--accent)">';
  h+='<div class="card-header"><div class="card-title">&#128221; Direct Assessments <span style="font-size:11px;color:var(--text2);font-weight:400">(CIE / ESE / Lab / Assignment)</span></div>';
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
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeAssessment('+ai+')">&times;</button></td></tr>';
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
  h+='<div class="card-header"><div class="card-title">&#128257; Indirect Assessments <span style="font-size:11px;color:var(--text2);font-weight:400">(CES / Survey / Peer Review)</span></div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" style="border-color:var(--purple);color:var(--purple)" onclick="addIndirectAssessment()">+ Add Indirect</button>';
  h+='</div></div><div class="card-body">';
  h+='<div class="instr" style="background:#f5f3ff;border-color:#c4b5fd">Indirect assessments do not use marks &#8212; they use <strong>ratings (1&#8211;5 scale)</strong>. Configure survey data in Section 11 (CES). They contribute as the Indirect component to CO attainment.</div>';
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
    h+='<td><span class="tag tag-blue" style="font-size:11px">1&#8211;5</span></td>';
    h+='<td><input type="number" value="'+(a.indirTarget||3.5)+'" min="1" max="5" step="0.1" onchange="sub().assessments['+ai+'].indirTarget=+this.value" style="width:50px"></td>';
    s.cos.forEach((_,ci)=>{
      h+='<td><input type="checkbox"'+(a.coCoverage&&a.coCoverage.includes(ci)?' checked':'')+' onchange="toggleCOCov('+ai+','+ci+',this.checked)" style="width:16px;height:16px;cursor:pointer"></td>';
    });
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeAssessment('+ai+')">&times;</button></td></tr>';
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

  let h='<div class="instr"><strong>&#128204; Instructions:</strong> For each CIA test, map questions to COs, Bloom\'s level, Performance Indicator and marks. Use "Print Question Paper" to generate printable exam sheet.</div>';
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
  h+='<div class="card-title">&#128221; '+test.name+' &#8212; Question Paper Setup</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" onclick="addQRow('+tIdx+')">+ Add Question</button>';
  h+='<button class="btn btn-sm btn-gold" onclick="printCIAQPaper('+tIdx+')">&#128424; Print Question Paper</button>';
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
    h+='<td><button class="btn btn-sm btn-danger" onclick="removeQRow('+tIdx+','+qi+')">&times;</button></td></tr>';
  });
  h+='</tbody><tfoot><tr>';
  h+='<td colspan="2" class="left"><strong>Total</strong></td>';
  h+='<td><strong>'+qrows.reduce((a,q)=>a+q.marks,0)+'</strong></td>';
  h+='<td colspan="'+(s.cos.length+3)+'"></td></tr></tfoot></table></div>';
  // Bloom distribution summary
  if(qrows.length){
    h+='<div style="margin-top:12px;background:var(--surface2);border-radius:8px;padding:12px">';
    h+='<strong style="font-size:13px;color:var(--accent)">&#128202; Bloom\'s Level Distribution in this Test</strong>';
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
  let html='<!DOCTYPE html><html><head><title>'+test.name+' &#8212; Question Paper</title>';
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
  html+='<h2 style="font-size:18px;margin:8px 0">'+test.name+' &#8212; Question Paper</h2>';
  html+='<div class="meta"><span>Department: '+s.dept+'</span><span>Faculty: '+s.faculty+'</span><span>Max Marks: '+maxMarks+'</span><span>Time: 1 Hour</span></div><hr>';
  html+='<div style="font-size:13px;margin:8px 0"><strong>&#128204; Instructions:</strong> Attempt all questions. Marks are indicated against each question.</div><hr>';
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
    html+='<tr><td>Q'+(qi+1)+'</td><td style="text-align:left">'+(q.desc||'&#8212;')+'</td><td>'+cos+'</td><td>'+(q.bloom||'Apply')+'</td><td style="font-size:10px">'+(q.pi||'&#8212;')+'</td><td>'+q.marks+'</td></tr>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Upload marks via Excel or enter manually. All students are shown.</div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  ['cie','ese','lab'].forEach(t=>{
    h+='<button class="btn btn-sm '+(t===viewType?'btn-primary':'btn-outline')+'" onclick="window._markView=\''+t+'\';renderMarklist(document.getElementById(PAGES[10].id))">'+t.toUpperCase()+'</button>';
  });
  h+='<button class="btn btn-sm btn-gold" onclick="downloadMarksTemplate(\''+viewType+'\')">&#11015; Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'mUpload_'+viewType+'\').click()">&#128193; Upload</button>';
  h+='<input type="file" id="mUpload_'+viewType+'" accept=".xlsx,.xls" style="display:none" onchange="uploadMarks(this,\''+viewType+'\')">';
  h+='<button class="btn btn-sm btn-success" onclick="autoFillMarks(\''+viewType+'\')">&#127922; Sample</button></div>';
  if(viewType==='lab'){h+=renderLabTable(s);el.innerHTML=h;return;}
  if(!s.students.length){h+='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3)">Add students first (Section 3)</div></div>';el.innerHTML=h;return;}
  const colTotals=assessList.map(a=>{
    const vals=s.students.map(st=>s.marks[a.id]?.[st.roll]||0);
    return {avg:(vals.reduce((a,b)=>a+b,0)/Math.max(vals.length,1)).toFixed(1)};
  });
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; '+viewType.toUpperCase()+' Marks</div>';
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
    h+='<strong style="color:var(--accent2)">&#128202; ESE &#8212; CO-wise Contribution Analysis</strong>';
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
    h+='</tbody><tfoot><tr><td colspan="3" class="left"><strong>CO Pass% (='+s.coTargetPct+'%)</strong></td>';
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
  let h='<div class="card"><div class="card-header"><div class="card-title">&#128300; Lab Term Work</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-sm btn-outline" onclick="addLabCol()">+ Add Column</button>';
  h+='<button class="btn btn-sm btn-gold" onclick="downloadLabTemplate()">&#11015; Template</button>';
  h+='<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'labUpload\').click()">&#128193; Upload</button>';
  h+='<input type="file" id="labUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadLabMarks(this)">';
  h+='</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>#</th><th class="left">Roll No</th><th class="left">Name</th>';
  s.labTWCols.forEach((c,i)=>{ h+='<th>'+c+' <button class="btn btn-sm btn-danger" style="padding:1px 4px;font-size:9px" onclick="removeLabCol('+i+')">&times;</button></th>'; });
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
  const indirectTypes=['CES','Peer Review','Alumni Survey','Employer Survey','Exit Survey'];
  const indirAssessments=s.assessments.filter(a=>indirectTypes.includes(a.type));
  if(window._cesTab===undefined) window._cesTab='ces';
  const activeTab=window._cesTab;

  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Manage all Indirect Assessments &#8212; upload or enter ratings manually (1&#8211;5 scale per CO). Each tab shows a full student-wise table with CO averages.</div>';

  const tabBtns=[];
  tabBtns.push('<button class="btn btn-sm '+(activeTab==='ces'?'btn-primary':'btn-outline')+'" onclick="setCESTab(this)" data-tab="ces">&#128202; CES Survey</button>');
  indirAssessments.forEach((a,i)=>{
    tabBtns.push('<button class="btn btn-sm '+(activeTab==='indir_'+i?'btn-purple':'btn-outline')+'" onclick="setCESTab(this)" data-tab="indir_'+i+'">&#128257; '+a.name+'</button>');
  });
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:2px solid var(--border);padding-bottom:10px">'+tabBtns.join('')+'</div>';

  if(activeTab==='ces'){
    h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; Course Exit Survey (CES)</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap">';
    h+='<button class="btn btn-sm btn-gold" onclick="downloadCESTemplate()">&#11015; Template</button>';
    h+='<button class="btn btn-sm btn-outline" onclick="triggerUpload(\"cesUpload\")">&#128193; Upload Excel</button>';
    h+='<input type="file" id="cesUpload" accept=".xlsx,.xls" style="display:none" onchange="uploadCES(this)">';
    h+='<button class="btn btn-sm btn-success" onclick="generateSampleCES()">&#127922; Sample</button>';
    h+='<button class="btn btn-sm btn-danger" style="background:var(--red-light);color:var(--red)" onclick="clearCESData()">&#128465; Clear</button>';
    h+='</div></div><div class="card-body">';

    if(!s.cesData||!s.cesData.length){
      h+='<div class="upload-zone" onclick="triggerUpload(\"cesUpload\")" style="margin-bottom:16px">';
      h+='<div class="upload-icon">&#128202;</div>';
      h+='<div class="upload-title">Upload CES Survey Excel</div>';
      h+='<div class="upload-sub">Columns: Roll No, CO1_Rating &#8230; CO'+s.cos.length+'_Rating (1&#8211;5 scale). Or click &#127922; Sample to auto-generate.</div></div>';
      if(s.students.length){
        h+='<div style="text-align:center;color:var(--text3);font-size:12px;margin-bottom:10px">&#8212; or enter ratings manually &#8212;</div>';
        h+=buildCESManualTable(s);
      } else {
        h+='<div style="text-align:center;padding:20px;color:var(--text3)">Add students first (Section 3), then enter CES ratings here.</div>';
      }
    } else {
      const target=s.cesTarget||3.5;
      const coScores=s.cos.map((_,ci)=>{
        const vals=s.cesData.map(r=>+(r['CO'+(ci+1)+'_Rating']||0)).filter(v=>v>0);
        return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length):0;
      });
      const overall=coScores.reduce((a,b)=>a+b,0)/Math.max(coScores.length,1);

      h+='<div class="g4" style="margin-bottom:16px">';
      h+='<div class="kpi blue"><div class="kpi-val">'+s.cesData.length+'</div><div class="kpi-label">Responses</div><div class="kpi-sub">of '+s.students.length+' students</div></div>';
      h+='<div class="kpi green"><div class="kpi-val">'+coScores.filter(v=>v>=target).length+'/'+s.cos.length+'</div><div class="kpi-label">COs Achieved</div><div class="kpi-sub">Target '+target.toFixed(1)+'</div></div>';
      h+='<div class="kpi gold"><div class="kpi-val">'+overall.toFixed(2)+'</div><div class="kpi-label">Overall Avg</div><div class="kpi-sub">Scale 1&#8211;5</div></div>';
      h+='<div class="kpi purple"><div class="kpi-val">'+(s.cesData.length/Math.max(s.students.length,1)*100).toFixed(0)+'%</div><div class="kpi-label">Response Rate</div></div>';
      h+='</div>';

      h+='<div style="padding:12px;background:var(--surface2);border-radius:8px;margin-bottom:14px">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      h+='<strong style="font-size:12px;color:var(--accent)">CO-wise Average Rating (target: '+target.toFixed(1)+')</strong>';
      h+='<span style="font-size:11px;color:var(--text2)">Scale 1&#8211;5</span></div>';
      h+='<div style="display:flex;gap:8px;align-items:flex-end;height:80px">';
      coScores.forEach((sc,ci)=>{
        const pct=(sc/5)*100;
        const col=sc>=target?'var(--green)':sc>=(target-0.5)?'var(--gold)':'var(--red)';
        h+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">';
        h+='<span style="font-size:10px;font-weight:800;color:'+col+'">'+sc.toFixed(1)+'</span>';
        h+='<div style="width:100%;background:#e2e8f0;border-radius:3px 3px 0 0;height:50px;display:flex;align-items:flex-end">';
        h+='<div style="width:100%;height:'+pct+'%;background:'+col+';border-radius:3px 3px 0 0;min-height:2px"></div></div>';
        h+='<span style="font-size:10px;font-weight:700;color:var(--text2)">'+s.cos[ci].id+'</span>';
        h+='</div>';
      });
      h+='</div></div>';

      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      h+='<strong style="font-size:13px">&#128203; Student-wise Ratings Table</strong>';
      h+='<span style="font-size:11px;color:var(--text2)">Edit any cell directly | Color: &#128994; =4 &#128993; =3 &#128308; <3</span>';
      h+='</div>';
      h+='<div class="tbl-wrap"><table><thead><tr style="background:#f1f5f9">';
      h+='<th style="width:36px">#</th><th class="left" style="min-width:90px">Roll No</th><th class="left" style="min-width:110px">Name</th>';
      s.cos.forEach(co=>{h+='<th style="min-width:62px">'+co.id+'<div style="font-size:9px;font-weight:400;color:var(--text3)">1&#8211;5</div></th>';});
      h+='<th style="min-width:50px">Avg</th></tr></thead><tbody>';

      s.cesData.forEach((row,ri)=>{
        const ratings=s.cos.map((_,ci)=>+(row['CO'+(ci+1)+'_Rating']||0));
        const filled=ratings.filter(v=>v>0);
        const avg=filled.length?(filled.reduce((a,b)=>a+b,0)/filled.length):0;
        const stObj=s.students.find(st=>st.roll==row['Roll No'])||{};
        h+='<tr style="background:'+(ri%2?'var(--surface2)':'var(--surface)')+'">';
        h+='<td style="font-size:11px;color:var(--text3);text-align:center">'+(ri+1)+'</td>';
        h+='<td class="left"><code style="font-size:11px">'+row['Roll No']+'</code></td>';
        h+='<td class="left" style="font-size:12px">'+(stObj.name||'&#8212;')+'</td>';
        s.cos.forEach((_,ci)=>{
          const v=+(row['CO'+(ci+1)+'_Rating']||0);
          const bg=v>=4?'#d1fae5':v>=3?'#fef3c7':v>=1?'#fee2e2':'';
          h+='<td style="padding:3px 4px;background:'+bg+'">';
          h+='<input type="number" value="'+v+'" min="0" max="5" step="0.5" data-ri="'+ri+'" data-ci="'+ci+'" onchange="setCESRating(+this.dataset.ri,+this.dataset.ci,+this.value);updateCellBg(this.parentElement,+this.value)" style="width:52px;padding:3px;border:1px solid #e2e8f0;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;text-align:center;background:transparent">';
          h+='</td>';
        });
        h+='<td style="text-align:center"><strong style="font-family:monospace;font-size:12px;color:'+(avg>=target?'var(--green)':'var(--red)')+'">'+( avg?avg.toFixed(1):'&#8212;')+'</strong></td>';
        h+='</tr>';
      });

      h+='<tr style="background:#dbeafe">';
      h+='<td colspan="3" class="left" style="padding:7px 10px;font-size:12px;font-weight:700;color:#1d4ed8">CLASS AVERAGE</td>';
      coScores.forEach(sc=>{
        const col=sc>=target?'var(--green)':sc>=(target-0.5)?'var(--gold)':'var(--red)';
        h+='<td style="text-align:center;font-family:monospace;font-size:13px;font-weight:800;color:'+col+'">'+sc.toFixed(2)+'</td>';
      });
      h+='<td style="text-align:center;font-family:monospace;font-size:12px;font-weight:700;color:var(--accent)">'+overall.toFixed(2)+'</td>';
      h+='</tr></tbody></table></div>';

      h+='<div style="margin-top:14px;padding:12px;background:var(--surface2);border-radius:8px">';
      h+='<strong style="font-size:12px;color:var(--text)">CO Attainment from CES</strong>';
      h+='<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr style="background:var(--surface3)">';
      h+='<th>CO</th><th class="left">Outcome</th><th>Avg</th><th>Stars</th><th>Level</th><th>Status</th></tr></thead><tbody>';
      s.cos.forEach((co,ci)=>{
        const sc=coScores[ci];const t=target;
        const att=sc>=4?3:sc>=t?2:sc>=2.5?1:0;
        const met=sc>=t;
        const stars='&#9733;'.repeat(Math.min(5,Math.round(sc)))+'&#9734;'.repeat(Math.max(0,5-Math.round(sc)));
        h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
        h+='<td class="left" style="font-size:11px">'+co.outcome.substring(0,55)+'...</td>';
        h+='<td><strong style="font-family:monospace;color:'+(met?'var(--green)':'var(--red)')+'">'+sc.toFixed(2)+'</strong></td>';
        h+='<td style="color:#f59e0b">'+stars+'</td>';
        h+='<td><div style="width:26px;height:26px;border-radius:50%;background:'+(att===3?'var(--green)':att===2?'var(--gold)':att===1?'var(--accent)':'var(--red)')+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;margin:auto">'+att+'</div></td>';
        h+='<td><span class="tag '+(met?'tag-green':'tag-red')+'">'+(met?'&#9989; Achieved':'&#10060; Gap')+'</span></td></tr>';
      });
      h+='</tbody></table></div></div>';
    }
    h+='</div></div>';
  }

  indirAssessments.forEach((a,i)=>{
    if(activeTab!==('indir_'+i)) return;
    if(!s.indirMarks) s.indirMarks={};
    const aKey='indir_'+a.id;
    if(!s.indirMarks[aKey]) s.indirMarks[aKey]={};

    const coAvgs=s.cos.map((_,ci)=>{
      const vals=Object.values(s.indirMarks[aKey]).map(row=>+(row['CO'+(ci+1)]||0)).filter(v=>v>0);
      return vals.length?(vals.reduce((x,y)=>x+y,0)/vals.length):0;
    });
    const tgt=+(a.indirTarget||3.5);

    h+='<div class="card" style="border-left:4px solid var(--purple)">';
    h+='<div class="card-header">';
    h+='<div class="card-title">&#128257; '+a.name+' <span style="font-size:11px;color:var(--text2);font-weight:400">('+a.type+' &#183; '+(a.method||'Survey')+' &#183; Target: '+tgt+')</span></div>';
    h+='<div style="display:flex;gap:6px">';
    h+='<button class="btn btn-sm btn-gold" onclick="downloadIndirTemplate(\"'+a.id+'\")">&#11015; Template</button>';
    h+='<button class="btn btn-sm btn-outline" onclick="triggerUpload(\"iu_'+a.id+'\")">&#128193; Upload</button>';
    h+='<input type="file" id="iu_'+a.id+'" accept=".xlsx,.xls" style="display:none" onchange="uploadIndirMarks(this,\"'+a.id+'\")">';
    h+='<button class="btn btn-sm btn-success" onclick="sampleIndirMarks(\"'+a.id+'\")">&#127922; Sample</button>';
    h+='</div></div><div class="card-body">';

    h+='<div class="g4" style="margin-bottom:14px">';
    h+='<div class="kpi purple" style="padding:10px"><div class="kpi-val" style="font-size:20px">'+Object.keys(s.indirMarks[aKey]).length+'</div><div class="kpi-label">Responses</div></div>';
    h+='<div class="kpi green" style="padding:10px"><div class="kpi-val" style="font-size:20px">'+coAvgs.filter(v=>v>=tgt).length+'/'+s.cos.length+'</div><div class="kpi-label">COs Met</div></div>';
    h+='<div class="kpi gold" style="padding:10px"><div class="kpi-val" style="font-size:20px">'+tgt+'</div><div class="kpi-label">Target</div></div>';
    const overallIndir=coAvgs.filter(v=>v>0).reduce((x,y)=>x+y,0)/Math.max(coAvgs.filter(v=>v>0).length,1);
    h+='<div class="kpi blue" style="padding:10px"><div class="kpi-val" style="font-size:20px">'+(overallIndir?overallIndir.toFixed(2):'&#8212;')+'</div><div class="kpi-label">Overall Avg</div></div>';
    h+='</div>';

    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    h+='<strong style="font-size:13px">&#128203; Student-wise Rating Entry Table (1&#8211;5 per CO)</strong>';
    h+='<span style="font-size:11px;color:var(--text2)">Enter or upload ratings. Auto-saved.</span>';
    h+='</div>';
    h+='<div class="tbl-wrap"><table><thead><tr style="background:#f5f3ff">';
    h+='<th style="width:36px">#</th><th class="left" style="min-width:90px">Roll No</th><th class="left" style="min-width:110px">Name</th>';
    s.cos.forEach(co=>{h+='<th style="min-width:62px">'+co.id+'<div style="font-size:9px;color:var(--text3);font-weight:400">Rating</div></th>';});
    h+='<th>Avg</th></tr></thead><tbody>';

    s.students.forEach((st,si)=>{
      const rowData=s.indirMarks[aKey][st.roll]||{};
      const ratings=s.cos.map((_,ci)=>+(rowData['CO'+(ci+1)]||0));
      const filled=ratings.filter(v=>v>0);
      const avg=filled.length?(filled.reduce((x,y)=>x+y,0)/filled.length):0;
      h+='<tr style="background:'+(si%2?'var(--surface2)':'var(--surface)')+'">';
      h+='<td style="font-size:11px;color:var(--text3);text-align:center">'+(si+1)+'</td>';
      h+='<td class="left"><code style="font-size:11px">'+st.roll+'</code></td>';
      h+='<td class="left" style="font-size:12px">'+st.name+'</td>';
      s.cos.forEach((_,ci)=>{
        const v=+(rowData['CO'+(ci+1)]||0);
        const bg=v>=4?'#d1fae5':v>=3?'#fef3c7':v>=1?'#fee2e2':'';
        h+='<td style="padding:3px 4px;background:'+bg+'">';
        h+='<input type="number" value="'+v+'" min="0" max="5" step="0.5" style="width:52px;padding:3px;border:1px solid #e2e8f0;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;text-align:center;background:transparent" data-roll="'+st.roll+'" data-ai="'+a.id+'" data-ci="'+ci+'" onchange="setIndirRating(this);updateCellBg(this.parentElement,+this.value)"></td>';
      });
      h+='<td style="text-align:center"><strong style="font-family:monospace;font-size:12px;color:'+(avg>=tgt?'var(--green)':'var(--red)')+'">'+( avg?avg.toFixed(1):'&#8212;')+'</strong></td>';
      h+='</tr>';
    });

    h+='<tr style="background:#f5f3ff">';
    h+='<td colspan="3" class="left" style="padding:7px 10px;font-size:12px;font-weight:700;color:var(--purple)">CLASS AVERAGE</td>';
    coAvgs.forEach(ca=>{
      const col=ca>=tgt?'var(--green)':ca>=(tgt-0.5)?'var(--gold)':'var(--red)';
      h+='<td style="text-align:center;font-family:monospace;font-size:12px;font-weight:800;color:'+col+'">'+(ca?ca.toFixed(2):'&#8212;')+'</td>';
    });
    h+='<td style="text-align:center;font-family:monospace;font-size:12px;color:var(--purple)">'+(overallIndir?overallIndir.toFixed(2):'&#8212;')+'</td>';
    h+='</tr></tbody></table></div>';
    h+='</div></div>';
  });

  if(indirAssessments.length===0 && activeTab!=='ces'){
    h+='<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3)">No indirect assessments defined. Go to Section 8 and click <strong>+ Add Indirect</strong>.</div></div>';
  }

  el.innerHTML=h;
}

function buildCESManualTable(s){
  if(!s.cesData||!s.cesData.length){
    s.cesData=s.students.map(st=>{
      const row={'Roll No':st.roll};
      s.cos.forEach((_,ci)=>{row['CO'+(ci+1)+'_Rating']=0;});
      return row;
    });
  }
  return '<div style="margin-top:4px"><div class="tbl-wrap"><table><thead><tr>'
    +'<th>#</th><th class="left">Roll No</th><th class="left">Name</th>'
    +s.cos.map(co=>'<th>'+co.id+'</th>').join('')
    +'</tr></thead><tbody>'
    +s.students.map((st,si)=>{
      const rowIdx=s.cesData.findIndex(r=>r['Roll No']==st.roll);
      const row=rowIdx>=0?s.cesData[rowIdx]:{'Roll No':st.roll};
      return '<tr style="background:'+(si%2?'var(--surface2)':'var(--surface)')+'"><td>'+(si+1)+'</td>'
        +'<td class="left"><code style="font-size:11px">'+st.roll+'</code></td>'
        +'<td class="left" style="font-size:12px">'+st.name+'</td>'
        +s.cos.map((_,ci)=>{
          const v=+(row['CO'+(ci+1)+'_Rating']||0);
          return '<td><input type="number" value="'+v+'" min="0" max="5" step="0.5" style="width:52px;padding:3px 4px;border:1.5px solid var(--border2);border-radius:4px;font-family:monospace;font-size:12px;text-align:center" onchange="setCESRating('+(rowIdx>=0?rowIdx:si)+','+ci+',+this.value)"></td>';
        }).join('')
        +'</tr>';
    }).join('')
    +'</tbody></table></div></div>';
}

function uploadCES(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
    const coCount=sub().cos.length;
    sub().cesData=rows.map(r=>{
      const out={};
      const keys=Object.keys(r||{});
      keys.forEach(k=>{
        const rawKey=String(k).trim();
        const norm=rawKey.toLowerCase().replace(/[\s_-]/g,'');
        const val=r[k];
        if(!out['Roll No'] && (norm==='rollno' || norm==='rollnumber' || norm==='roll')){
          out['Roll No']=val;
          return;
        }
        const m=norm.match(/^co(\d+)(rating)?$/);
        if(m){
          const idx=+m[1];
          if(idx>=1 && idx<=coCount){
            out['CO'+idx+'_Rating']=val;
          }
        }
      });
      for(let i=1;i<=coCount;i++){
        const key='CO'+i+'_Rating';
        const v=out[key];
        out[key]=(v===undefined||v===null||v==="")?0:+v||0;
      }
      if(out['Roll No']===undefined) out['Roll No']=r['Roll No']||r['RollNo']||'';
      return out;
    });
    showToast(sub().cesData.length+' CES responses loaded','success');
    window._cesTab='ces';
    renderCES(document.getElementById(PAGES[11].id));
  };
  reader.readAsArrayBuffer(f);
}
function generateSampleCES(){
  const s=sub();
  s.cesData=s.students.map(st=>{
    const row={'Roll No':st.roll};
    s.cos.forEach((_,ci)=>{row['CO'+(ci+1)+'_Rating']=+(3+Math.random()*2).toFixed(1);});
    return row;
  });
  showToast('Sample CES generated &#8212; '+s.cesData.length+' responses','info');
  renderCES(document.getElementById(PAGES[11].id));
}
function setCESTab(el){
  const tabId=(typeof el==='string')?el:(el&&el.getAttribute?el.getAttribute('data-tab'):el);
  window._cesTab=tabId||'ces';
  renderCES(document.getElementById(PAGES[11].id));
}
function triggerUpload(id){
  const el=document.getElementById(id);
  if(el) el.click();
}
function updateCellBg(cell,v){
  cell.style.background=v>=4?'#d1fae5':v>=3?'#fef3c7':v>=1?'#fee2e2':'';
}
function setCESRating(rowIdx,ci,val){
  const s=sub();
  if(!s.cesData||!s.cesData[rowIdx]) return;
  s.cesData[rowIdx]['CO'+(ci+1)+'_Rating']=Math.max(0,Math.min(5,val));
}
function setIndirRating(el){
  const roll=el.getAttribute('data-roll');
  const ai=el.getAttribute('data-ai');
  const ci=+el.getAttribute('data-ci');
  const val=Math.max(0,Math.min(5,+el.value));
  const s=sub();
  if(!s.indirMarks) s.indirMarks={};
  const key='indir_'+ai;
  if(!s.indirMarks[key]) s.indirMarks[key]={};
  if(!s.indirMarks[key][roll]) s.indirMarks[key][roll]={};
  s.indirMarks[key][roll]['CO'+(ci+1)]=val;
}
function clearCESData(){
  if(confirm('Clear all CES data?')){
    sub().cesData=[];
    renderCES(document.getElementById(PAGES[11].id));
    showToast('CES data cleared','info');
  }
}
function downloadCESTemplate(){
  const s=sub();
  const headers=['Roll No'];
  s.cos.forEach((_,i)=>{headers.push('CO'+(i+1)+'_Rating');});
  const rows=[headers];
  s.students.forEach(st=>{
    const r=[st.roll];
    s.cos.forEach(()=>{r.push('');});
    rows.push(r);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'CES');
  XLSX.writeFile(wb,'ces_template.xlsx');
}
function downloadIndirTemplate(aid){
  const s=sub();
  const a=s.assessments.find(x=>x.id===aid);
  const name=(a?a.name:'Indirect').replace(/[^a-z0-9]/gi,'_');
  const headers=['Roll No'];
  s.cos.forEach((_,i)=>{headers.push('CO'+(i+1));});
  const rows=[headers];
  s.students.forEach(st=>{
    const r=[st.roll];
    s.cos.forEach(()=>{r.push('');});
    rows.push(r);
  });
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,name);
  XLSX.writeFile(wb,name+'_template.xlsx');
}
function uploadIndirMarks(input,aid){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'array'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:0});
    const s=sub();
    if(!s.indirMarks) s.indirMarks={};
    const key='indir_'+aid;
    s.indirMarks[key]={};
    rows.forEach(row=>{
      const roll=row['Roll No']||row['roll']||row['RollNo']||'';
      if(roll) s.indirMarks[key][roll]=row;
    });
    showToast(rows.length+' indirect responses loaded','success');
    renderCES(document.getElementById(PAGES[11].id));
  };
  reader.readAsArrayBuffer(f);
}
function sampleIndirMarks(aid){
  const s=sub();
  if(!s.indirMarks) s.indirMarks={};
  const key='indir_'+aid;
  s.indirMarks[key]={};
  s.students.forEach(st=>{
    const row={'Roll No':st.roll};
    s.cos.forEach((_,ci)=>{row['CO'+(ci+1)]=+(3+Math.random()*2).toFixed(1);});
    s.indirMarks[key][st.roll]=row;
  });
  showToast('Sample indirect ratings generated','info');
  renderCES(document.getElementById(PAGES[11].id));
}
function saveIndirMarks(){
  showToast('Indirect marks saved!','success');
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
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128202; Performance Distribution</div></div><div class="card-body" style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">';
  h+=chartSvg;
  h+='<div style="flex:1;min-width:200px">';
  catCounts.forEach((n,i)=>{const pct=rows.length?((n/rows.length)*100).toFixed(1):0;h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:700;color:'+catColors2[i]+'">'+cats2[i]+'</span><span>'+n+' students ('+pct+'%)</span></div><div style="height:8px;background:#f1f5f9;border-radius:4px"><div style="height:8px;width:'+pct+'%;background:'+catColors2[i]+';border-radius:4px"></div></div></div>';});
  h+='</div></div></div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128065; Student Classification</div></div><div class="card-body"><div class="tbl-wrap"><table>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Record remedial and advanced activities per CO. Update status as actions are implemented.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128200; Monitoring Actions per CO</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>CO</th><th>Bloom</th><th>PI</th><th>Slow</th><th>Avg</th><th>Fast</th><th class="left">Remedial Action</th><th class="left">Advanced Activity</th><th>Status</th></tr></thead><tbody>';
  s.cos.forEach((co,ci)=>{
    const rows=s.students.map(st=>{const total=s.assessments.reduce((a,b)=>a+(s.marks[b.id]?.[st.roll]||0),0);const mx=s.assessments.reduce((a,b)=>a+b.max,0)||1;return(total/mx)*100;});
    const slow=rows.filter(p=>p<40).length,avg=rows.filter(p=>p>=40&&p<60).length,fast=rows.filter(p=>p>=75).length;
    const mon=s.monitoringActions[ci];
    h+='<tr><td><span class="co-tag">'+co.id+'</span></td>';
    h+='<td><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span></td>';
    h+='<td style="font-size:10px;color:var(--text2);max-width:120px">'+(co.pi||'&#8212;')+'</td>';
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
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),...s.psos.map((_,i)=>'PSO'+(i+1))];
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Enter learning hours attributable to each PO/PSO via each CO. Pre-filled from CO-PO matrix. Avg Hrs/CO calculated automatically.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#9200; PO/PSO Learning Hours</div>';
  h+='<button class="btn btn-sm btn-success" onclick="showToast(\'PO Hours saved!\',\'success\')">&#128190; Save</button>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Click Calculate to compute CO attainment from CIE, ESE, and CES data. Target: '+s.coTargetLevel.toFixed(2)+'</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#127919; CO Attainment</div>';
  h+='<button class="btn btn-sm btn-purple" onclick="calculateAll()">&#9889; Calculate All</button>';
  h+='</div><div class="card-body">';
  if(!s.coAttainment[0]){
    h+='<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:48px">&#9889;</div>Click Calculate to compute attainment</div>';
  } else {
    h+='<div class="g4" style="margin-bottom:20px">';
    s.coAttainment.forEach((ca,ci)=>{
      if(!ca)return;
      h+='<div class="kpi '+(ca.achieved?'green':'red')+'">';
      h+='<div class="kpi-val">'+s.cos[ci].id+'</div>';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-top:4px">';
      h+='<div class="attain-level attain-'+( ca.level||0)+'">'+( ca.level||0)+'</div>';
      h+='<div><div class="kpi-label">'+(ca.achieved?'&#9989; Achieved':'&#10060; Gap')+'</div>';
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
      h+='<td style="font-size:10px;color:var(--text2);max-width:130px">'+(co.pi||'&#8212;')+'</td>';
      h+='<td class="pct-cell">'+ca.cia_pct.toFixed(1)+'%<div class="prog-wrap"><div class="prog-bar bc-achieved" style="width:'+Math.min(100,ca.cia_pct)+'%"></div></div></td>';
      h+='<td class="pct-cell">'+ca.ese_pct.toFixed(1)+'%<div class="prog-wrap"><div class="prog-bar" style="width:'+Math.min(100,ca.ese_pct)+'%;background:var(--accent2)"></div></div></td>';
      h+='<td><strong>'+ca.ces.toFixed(2)+'</strong></td>';
      h+='<td><strong>'+ca.direct.toFixed(2)+'</strong></td>';
      h+='<td><strong>'+ca.indirect.toFixed(2)+'</strong></td>';
      h+='<td><strong style="font-size:16px;color:'+(ca.achieved?'var(--green)':'var(--red)')+'">'+ca.final.toFixed(2)+'</strong></td>';
      h+='<td style="font-family:monospace">'+s.coTargetLevel.toFixed(2)+'</td>';
      h+='<td><div class="attain-level attain-'+(ca.level||0)+'">'+(ca.level||0)+'</div></td>';
      h+='<td><span class="tag '+(ca.achieved?'tag-green':'tag-red')+'">'+(ca.achieved?'&#9989; Met':'&#10060; Gap')+'</span></td>';
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
  let h='<div class="card"><div class="card-header"><div class="card-title">&#128201; CO Achievement vs Target</div></div><div class="card-body">';
  h+='<div class="bar-chart">';
  s.cos.forEach((co,ci)=>{
    const ca=s.coAttainment[ci];const v=ca?.final||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.coTargetLevel/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars">';
    h+='<div class="bc-bar bc-achieved" style="height:'+achH+'px" title="'+co.id+': '+v.toFixed(2)+'"></div>';
    h+='<div class="bc-bar bc-target" style="height:'+tgtH+'px" title="Target: '+s.coTargetLevel.toFixed(2)+'"></div>';
    h+='</div><div class="bc-label">'+co.id+'</div>';
    h+='<span class="tag '+(ca?.achieved?'tag-green':'tag-red')+'" style="font-size:9px;margin-top:3px">'+(ca?.achieved?'&#9989;':'&#10060;')+'</span></div>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Quality Loop documents corrective actions for COs that did not achieve target.</div>';
  s.cos.forEach((co,ci)=>{
    const ca=s.coAttainment[ci];
    if(!ca){h+='<div class="card"><div class="card-body">Run calculation first</div></div>';return;}
    h+='<div class="card"><div class="card-header">';
    h+='<div class="card-title">&#128260; '+co.id+' &#8212; Quality Loop</div>';
    h+='<div style="display:flex;gap:8px"><span class="tag tag-purple" style="font-size:10px">'+co.bloom+'</span>';
    h+='<span class="tag '+(ca.achieved?'tag-green':'tag-red')+'">'+(ca.achieved?'&#9989; Closed':'&#10060; Action Needed')+'</span></div>';
    h+='</div><div class="card-body">';
    h+='<div class="ql-flow">';
    h+='<div class="ql-box achieved"><div class="ql-label">CO Defined</div><div class="ql-val">&#10003;</div></div>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> PO/PSO attainment is computed from CO attainment weighted by CO-PO mapping values.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#127942; PO & PSO Attainment</div>';
  h+='<button class="btn btn-sm btn-purple" onclick="calculateAll()">&#9889; Calculate</button>';
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
      h+='<td><strong style="font-family:monospace;font-size:15px;color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'&#8212;')+'</strong>';
      if(a) h+='<div class="prog-wrap"><div class="prog-bar bc-achieved" style="width:'+Math.min(100,(a.att/3)*100)+'%"></div></div>';
      h+='</td><td style="font-family:monospace">'+s.poTarget.toFixed(2)+'</td>';
      h+='<td>'+(a?'<div class="attain-level attain-'+(a.level||0)+'">'+(a.level||0)+'</div>':'&#8212;')+'</td>';
      h+='<td>'+(a?'<span class="tag '+(a.achieved?'tag-green':'tag-red')+'">'+(a.achieved?'&#9989; Met':'&#10060; Gap')+'</span>':'&#8212;')+'</td></tr>';
    });
    s.psos.forEach((p,pi)=>{
      const a=s.psoAttainment[pi];
      h+='<tr style="background:var(--surface2)"><td><span class="tag tag-purple">PSO'+(pi+1)+'</span></td>';
      h+='<td class="left" style="font-size:12px">'+p+'</td>';
      h+='<td><strong style="font-family:monospace;font-size:15px;color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'&#8212;')+'</strong></td>';
      h+='<td style="font-family:monospace">'+s.psoTarget.toFixed(2)+'</td>';
      h+='<td>'+(a?'<div class="attain-level attain-'+(a.level||0)+'">'+(a.level||0)+'</div>':'&#8212;')+'</td>';
      h+='<td>'+(a?'<span class="tag '+(a.achieved?'tag-green':'tag-red')+'">'+(a.achieved?'&#9989; Met':'&#10060; Gap')+'</span>':'&#8212;')+'</td></tr>';
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
  let h='<div class="card"><div class="card-header"><div class="card-title">&#128201; PO/PSO Gap Chart</div></div><div class="card-body">';
  h+='<div class="bar-chart">';
  s.pos.forEach((p,pi)=>{
    const a=s.poAttainment[pi];const v=a?.att||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.poTarget/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars"><div class="bc-bar bc-achieved" style="height:'+achH+'px" title="PO'+(pi+1)+': '+v.toFixed(2)+'"></div><div class="bc-bar bc-target" style="height:'+tgtH+'px"></div></div><div class="bc-label">PO'+(pi+1)+'</div><span class="tag '+(a?.achieved?'tag-green':'tag-red')+'" style="font-size:9px">'+(a?.achieved?'&#9989;':'&#10060;')+'</span></div>';
  });
  s.psos.forEach((_,pi)=>{
    const a=s.psoAttainment[pi];const v=a?.att||0;
    const achH=Math.round((v/3)*maxH);const tgtH=Math.round((s.psoTarget/3)*maxH);
    h+='<div class="bc-group"><div class="bc-bars"><div class="bc-bar" style="height:'+achH+'px;background:var(--purple)" title="PSO'+(pi+1)+': '+v.toFixed(2)+'"></div><div class="bc-bar bc-target" style="height:'+tgtH+'px"></div></div><div class="bc-label">PSO'+(pi+1)+'</div><span class="tag '+(a?.achieved?'tag-green':'tag-red')+'" style="font-size:9px">'+(a?.achieved?'&#9989;':'&#10060;')+'</span></div>';
  });
  h+='</div></div></div>';
  el.innerHTML=h;
}

// ============================================================
//  PAGE 20: PO QUALITY LOOP
// ============================================================
function renderPOQuality(el){
  const s=sub();
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Document corrective actions for POs that did not achieve target.</div>';
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128260; PO Quality Loop</div></div><div class="card-body"><div class="tbl-wrap"><table>';
  h+='<thead><tr><th>PO</th><th class="left">Name</th><th>Attainment</th><th>Target</th><th>Gap</th><th class="left">Corrective Action</th></tr></thead><tbody>';
  s.pos.forEach((p,pi)=>{
    const a=s.poAttainment[pi];const att=a?.att||0;const gap=s.poTarget-att;
    h+='<tr><td><span class="po-tag">PO'+(pi+1)+'</span></td>';
    h+='<td class="left" style="font-size:12px">'+p+'</td>';
    h+='<td style="font-family:monospace">'+(a?a.att.toFixed(2):'&#8212;')+'</td>';
    h+='<td style="font-family:monospace">'+s.poTarget.toFixed(2)+'</td>';
    h+='<td class="pct-cell" style="color:'+(gap>0?'var(--red)':'var(--green)')+'">'+(a?(gap>0?'+'+gap.toFixed(2):gap.toFixed(2)):'&#8212;')+'</td>';
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
  let h='<div class="instr"><strong>&#128204; Instructions:</strong> Document corrective actions for PSOs.</div>';
  s.psos.forEach((pso,pi)=>{
    const a=s.psoAttainment[pi];
    h+='<div class="card"><div class="card-header"><div class="card-title">&#127891; PSO'+(pi+1)+' Quality Loop</div>';
    h+='<span class="tag '+(a&&a.achieved?'tag-green':'tag-red')+'">'+(a&&a.achieved?'&#9989; Achieved':'&#10060; Gap')+'</span>';
    h+='</div><div class="card-body">';
    h+='<div class="ql-flow"><div class="ql-box"><div class="ql-label">PSO</div><div class="ql-val" style="font-size:12px">PSO'+(pi+1)+'</div></div>';
    h+='<div class="ql-box"><div class="ql-label">Attainment</div><div class="ql-val" style="color:'+(a&&a.achieved?'var(--green)':'var(--red)')+'">'+(a?a.att.toFixed(2):'&#8212;')+'</div></div>';
    h+='<div class="ql-box"><div class="ql-label">Target</div><div class="ql-val">'+s.psoTarget.toFixed(2)+'</div></div>';
    h+='<div class="ql-box '+(a&&a.achieved?'achieved':'')+'"><div class="ql-label">Status</div><div class="ql-val">'+(a&&a.achieved?'&#9989;':'&#10060;')+'</div></div></div>';
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
  {wk:'WK2',title:'Basic Sciences',desc:'Knowledge of science facts, concepts, principles and theories relevant to the engineering discipline &#8212; physics, chemistry, biology as applicable.'},
  {wk:'WK3',title:'Computing',desc:'Knowledge of computational techniques, algorithms, data structures, programming languages and software tools relevant to engineering.'},
  {wk:'WK4',title:'Engineering Fundamentals',desc:'Knowledge of engineering fundamentals: electrical, mechanical, chemical or civil engineering sciences and principles underpinning the discipline.'},
  {wk:'WK5',title:'Specialist Engineering Knowledge',desc:'Detailed, technical, and specialised knowledge of the engineering discipline that provides depth appropriate to undertake complex problem solving.'},
  {wk:'WK6',title:'Engineering Design',desc:'Knowledge required to undertake engineering design including design processes, methods, tools, standards and constraints (economic, social, environmental, ethical, health & safety).'},
  {wk:'WK7',title:'Technical Practice & Projects',desc:'Knowledge of engineering practice: workshop, laboratory, field skills, project management techniques, professional codes of practice and technical standards.'},
  {wk:'WK8',title:'Societal, Legal & Ethical',desc:'Knowledge of social, cultural, global, environmental and economic aspects of engineering practice &#8212; including sustainability, professional ethics and legal frameworks.'},
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
  let h='<div class="instr"><strong>&#128204; Annexure-I:</strong> Knowledge Base (WK) profile maps each PO to knowledge domains per NBA framework. WK level for each CO is set in Section 2.</div>';
  // WK profile table
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128203; Knowledge Base (WK) Profile &#8212; NBA Annexure-I</div></div><div class="card-body">';
  h+='<div class="tbl-wrap"><table><thead><tr><th style="width:60px">WK</th><th class="left" style="width:160px">Domain</th><th class="left">Description</th><th>CO Mapping</th><th>PO Mapping</th></tr></thead><tbody>';
  WK_PROFILE.forEach(wk=>{
    const mappedCOs=s.cos.filter(co=>{const wks=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:['WK1']);return wks.includes(wk.wk);}).map(co=>co.id);
    const mappedPOs=PO_WK_MAP.filter(p=>p.wks.includes(wk.wk)).map(p=>p.po);
    h+='<tr><td><span class="tag tag-blue" style="font-size:13px;padding:4px 10px">'+wk.wk+'</span></td>';
    h+='<td class="left"><strong>'+wk.title+'</strong></td>';
    h+='<td class="left" style="font-size:12px;color:var(--text2)">'+wk.desc+'</td>';
    h+='<td>'+( mappedCOs.length?mappedCOs.map(c=>'<span class="co-tag" style="font-size:10px;margin:1px">'+c+'</span>').join(''):'<span class="tag tag-gray">&#8212;</span>')+'</td>';
    h+='<td style="font-size:11px">'+( mappedPOs.join(', ')||'&#8212;')+'</td></tr>';
  });
  h+='</tbody></table></div></div></div>';
  // PO-WK mapping
  h+='<div class="card"><div class="card-header"><div class="card-title">&#128279; Program Outcomes &#8212; WK Knowledge Base Mapping</div></div><div class="card-body">';
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
  h+='<div class="card"><div class="card-header"><div class="card-title">&#129513; CO &#8212; WK Knowledge Profile Matrix</div></div><div class="card-body">';
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
      h+='<td style="text-align:center;background:'+(hit?'#d1fae5':'#f8fafc')+';cursor:default">'+(hit?'<strong style="color:var(--green);font-size:14px">&#9679;</strong>':'<span style="color:#e2e8f0">&#9675;</span>')+'</td>';
    });
    h+='</tr>';
  });
    h+='</tbody></table></div>';
  h+='<div style="margin-top:10px;font-size:12px;color:var(--text2)">WK levels (WK1&#8211;WK9) are set in Section 2. Each CO can map to multiple WK domains. &#8226; indicates mapping per NBA Annexure-I framework. NBA requires all POs have COs mapped to required WK levels.</div>';
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
    <button class="btn btn-primary" style="margin-right:8px" onclick="printCertificate()">&#128424; Print Certificate</button>
    <button class="btn btn-sm btn-gold" onclick="generateFullReport()">&#128196; Full Report</button>
  </div>
  <div id="certPrint" style="background:#fff;border:3px solid #d97706;border-radius:16px;max-width:800px;margin:0 auto;padding:48px;position:relative;overflow:hidden">
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
      <div style="font-size:13px;color:#64748b;margin:6px 0 24px;letter-spacing:1px">Outcome Based Education &#8212; Attainment Documentation</div>
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
  setTimeout(function(){
    const s=sub();

    // Force-render every sub-tab for all pages with sub-tabs
    const savedCoTab=window._coTab;
    const savedCopoTab=window._copoTab;
    const savedMarkView=window._markView;
    const savedCoqIdx=window._coqTestIdx;

    // Tab 2: render all 3 sub-tabs
    window._coTab='cos'; renderPage(2);
    window._coTab='bloom'; renderPage(2);
    window._coTab='syllabus'; renderPage(2);
    // Tab 4: render both sub-tabs
    window._copoTab='matrix'; renderPage(4);
    window._copoTab='justify'; renderPage(4);
    // Tab 9: render all CIE tests
    const cieTests=s.assessments.filter(function(a){return a.type==='CIE';});
    cieTests.forEach(function(_,ti){ window._coqTestIdx=ti; renderPage(9); });
    // Tab 10: render all marklist types
    ['cie','ese','lab'].forEach(function(t){ window._markView=t; renderPage(10); });
    // Render remaining pages normally
    PAGES.forEach(function(_,i){ if(![2,4,9,10].includes(i)) renderPage(i); });

    // Restore
    window._coTab=savedCoTab; window._copoTab=savedCopoTab;
    window._markView=savedMarkView; window._coqTestIdx=savedCoqIdx;

    const sanitizePage=(p)=>{
      const clone=p.cloneNode(true);
      const toText=(el)=>{
        let val='';
        if(el.tagName==='SELECT'){
          val=el.options[el.selectedIndex]?.text||'';
        } else if(el.type==='checkbox' || el.type==='radio'){
          val=el.checked?'Yes':'No';
        } else {
          val=el.value ?? el.textContent ?? '';
        }
        const span=document.createElement('span');
        span.textContent=val;
        span.style.display='inline-block';
        span.style.minWidth='40px';
        span.style.padding='2px 6px';
        span.style.border='1px solid #cbd5e1';
        span.style.borderRadius='4px';
        span.style.background='#fff';
        span.style.fontFamily='inherit';
        span.style.fontSize='11px';
        return span;
      };
      clone.querySelectorAll('input,select,textarea').forEach(el=>{el.replaceWith(toText(el));});
      clone.querySelectorAll('.btn,.upload-zone').forEach(el=>el.remove());
      return clone.innerHTML;
    };

    const indexRows=PAGES.slice(1).map(function(p,i){
      return '<tr>'
        +'<td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#2563eb">'+(i+1)+'</td>'
        +'<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:13px;text-align:left">'+p.icon+' '+p.section+'</td>'
        +'<td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">'+(i+2)+'</td>'
        +'</tr>';
    }).join('');

    const logoSrc=location.origin+'/SIGCE LOGO.jpeg';
    const coverPage=
      '<div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#fff;padding:60px 40px;text-align:center;page-break-after:always">'
      +'<div style="width:110px;height:110px;border-radius:22px;background:#fff;display:flex;align-items:center;justify-content:center;margin-bottom:28px;box-shadow:0 16px 28px rgba(15,23,42,.18)">'
      +'<img src="'+logoSrc+'" alt="SIGCE Logo" style="width:90px;height:90px;object-fit:contain"></div>'
      +'<div style="color:#0f172a;font-size:26px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px">Smt. Indira Gandhi College of Engineering</div>'
      +'<div style="color:#334155;font-size:16px;font-weight:600;margin-bottom:40px">Outcome Based Education &#8212; Attainment Report</div>'
      +'<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px 48px;max-width:560px;width:100%;box-shadow:0 18px 40px rgba(15,23,42,.12)">'
      +'<table style="width:100%;border-collapse:collapse;color:#000;font-size:14px">'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;width:180px;text-align:left;font-weight:700">Course Name</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700">'+s.name+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Course Code</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left;font-weight:700">'+s.code+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Department</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+s.dept+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Program</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+(s.program||'B.E. '+s.dept)+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Faculty</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+s.faculty+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Academic Year</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+s.ay+' | Semester '+s.sem+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Batch / Division</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+(s.batch||'&#8212;')+'</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">Credits</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+s.credits+' Credits | '+(s.totalHours||48)+' Hours</td></tr>'
      +'<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#000;text-align:left;font-weight:700">CO Target</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:left">'+s.coTargetLevel.toFixed(2)+' | Threshold '+s.coTargetPct+'%</td></tr>'
      +'<tr><td style="padding:10px 0;color:#000;text-align:left;font-weight:700">Generated</td><td style="padding:10px 0;text-align:left">'+new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})+'</td></tr>'
      +'</table></div>'
      +'<div style="margin-top:40px;color:#64748b;font-size:11px">Outcome Based Education Framework</div>'
      +'</div>';

    const coAchieved=s.coAttainment.filter(function(c){return c&&c.achieved;}).length;
    const coTotal=s.cos.length;
    const poAchieved=s.poAttainment.filter(function(p){return p&&p.achieved;}).length;

    const indexPage=
      '<div style="padding:40px;page-break-after:always;display:flex;flex-direction:column;align-items:center">'
      +'<div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px;display:flex;align-items:flex-end;justify-content:space-between;width:100%;max-width:820px">'
      +'<div><div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px">OBE Course File</div>'
      +'<h1 style="font-size:28px;font-weight:800;color:#0f172a;margin:0">Table of Contents</h1></div>'
      +'<div style="text-align:right;font-size:12px;color:#64748b">'
      +'<div><strong>'+s.code+'</strong> &#8212; '+s.name+'</div>'
      +'<div>'+s.dept+' | AY '+s.ay+'</div>'
      +'</div></div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;width:100%;max-width:820px">'
      +'<div style="background:#dbeafe;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:#1d4ed8">'+coTotal+'</div><div style="font-size:11px;color:#1e40af;font-weight:600">Course Outcomes</div></div>'
      +'<div style="background:#d1fae5;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:#059669">'+coAchieved+'</div><div style="font-size:11px;color:#065f46;font-weight:600">COs Achieved</div></div>'
      +'<div style="background:#fef3c7;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:#d97706">'+s.students.length+'</div><div style="font-size:11px;color:#92400e;font-weight:600">Students</div></div>'
      +'<div style="background:#ede9fe;border-radius:10px;padding:14px;text-align:center"><div style="font-size:24px;font-weight:800;color:#7c3aed">'+poAchieved+'</div><div style="font-size:11px;color:#4c1d95;font-weight:600">POs Achieved</div></div>'
      +'</div>'
      +'<table style="width:100%;max-width:820px;border-collapse:collapse;font-size:13px">'
      +'<thead><tr style="background:#0f172a;color:#fff">'
      +'<th style="padding:10px 14px;border:1px solid #334155;width:50px;text-align:center">#</th>'
      +'<th style="padding:10px 14px;border:1px solid #334155;text-align:left">Section Title</th>'
      +'<th style="padding:10px 14px;border:1px solid #334155;width:60px;text-align:center">Page</th>'
      +'</tr></thead>'
      +'<tbody>'+indexRows+'</tbody>'
      +'</table>'
      +'</div>';

    function secHeader(label,title,code,name,ay){
          return '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #2563eb;padding-bottom:10px;margin-bottom:20px">'
            +'<div><div style="font-size:10px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px">'+label+'</div>'
            +'<h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0">'+title+'</h2></div>'
            +'<div style="text-align:right;font-size:10px;color:#94a3b8"><div>'+code+' &#8212; '+name+'</div><div>'+ay+'</div></div>'
            +'</div>';
        }

        // &#9472;&#9472; Generate Tab 2 content: COs + Bloom Dict + Syllabus &#9472;&#9472;
        function buildTab2(){
          const BL=['Remember','Understand','Apply','Analyze','Evaluate','Create'];
          const BLC={'Remember':'#7c3aed','Understand':'#2563eb','Apply':'#0ea5e9','Analyze':'#059669','Evaluate':'#d97706','Create':'#dc2626'};
          const BLBg={'Remember':'#ede9fe','Understand':'#dbeafe','Apply':'#e0f2fe','Analyze':'#d1fae5','Evaluate':'#fef3c7','Create':'#fee2e2'};
          let h='';

          // 2A &#8212; Course Objectives & Outcomes
          h+='<h3 style="color:#2563eb;font-size:14px;margin:0 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">A. Course Objectives</h3>';
          h+='<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">';
          h+='<thead><tr style="background:#f1f5f9"><th style="padding:7px 10px;border:1px solid #e2e8f0;width:60px">OBJ#</th><th style="padding:7px 10px;border:1px solid #e2e8f0;text-align:left">Objective Statement</th></tr></thead><tbody>';
          s.cos.forEach(function(co,i){
            h+='<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;border:1px solid #e2e8f0;text-align:center;font-weight:700;color:#7c3aed">OBJ'+(i+1)+'</td>';
            h+='<td style="padding:6px 10px;border:1px solid #e2e8f0">'+co.objective+'</td></tr>';
          });
          h+='</tbody></table>';

          h+='<h3 style="color:#2563eb;font-size:14px;margin:0 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">B. Course Outcomes with Bloom\'s Level, WK &amp; Performance Indicators</h3>';
          h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">';
          h+='<thead><tr style="background:#1e40af;color:#fff">';
          h+='<th style="padding:7px;border:1px solid #93c5fd;width:40px">CO</th>';
          h+='<th style="padding:7px;border:1px solid #93c5fd;text-align:left;min-width:160px">Outcome Statement</th>';
          h+='<th style="padding:7px;border:1px solid #93c5fd;width:90px">Bloom\'s Level</th>';
          h+='<th style="padding:7px;border:1px solid #93c5fd;width:100px">WK Level(s)</th>';
          h+='<th style="padding:7px;border:1px solid #93c5fd;text-align:left">Performance Indicator</th>';
          h+='</tr></thead><tbody>';
          s.cos.forEach(function(co,i){
            const wkArr=Array.isArray(co.wk)?co.wk:(co.wk?[co.wk]:[]);
            const bCol=BLC[co.bloom]||'#2563eb';
            const bBg=BLBg[co.bloom]||'#dbeafe';
            h+='<tr style="background:'+(i%2?'#f8fafc':'#fff')+'">';
            h+='<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:800;color:#2563eb">'+co.id+'</td>';
            h+='<td style="padding:6px;border:1px solid #e2e8f0">'+co.outcome+'</td>';
            h+='<td style="padding:6px;border:1px solid #e2e8f0;text-align:center"><span style="padding:3px 8px;border-radius:20px;background:'+bBg+';color:'+bCol+';font-weight:700;font-size:10px">'+co.bloom+'</span><div style="font-size:9px;color:'+bCol+';margin-top:2px">L'+(BL.indexOf(co.bloom)+1)+'</div></td>';
            h+='<td style="padding:6px;border:1px solid #e2e8f0;text-align:center">'+wkArr.map(function(w){return '<span style="display:inline-block;padding:2px 5px;background:#dbeafe;color:#2563eb;border-radius:4px;font-size:9px;font-weight:700;margin:1px">'+w+'</span>';}).join('')+'</td>';
            h+='<td style="padding:6px;border:1px solid #e2e8f0;font-size:10px;color:#475569">'+(co.pi||'&#8212;')+'</td>';
            h+='</tr>';
          });
          h+='</tbody></table>';

          // 2C &#8212; Bloom's Dictionary reference table
          h+='<h3 style="color:#2563eb;font-size:14px;margin:16px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">C. Bloom\'s Taxonomy &#8212; Action Verb Reference</h3>';
          h+='<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px">';
          h+='<thead><tr>';
          BL.forEach(function(b,i){ h+='<th style="padding:6px 8px;border:1px solid #e2e8f0;background:'+BLC[b]+';color:#fff;text-align:center">L'+(i+1)+': '+b+'</th>'; });
          h+='</tr></thead><tbody>';
          const BD=typeof BLOOM_DICT!=='undefined'?BLOOM_DICT:{};
          const maxV=Math.max.apply(null,BL.map(function(b){return BD[b]?BD[b].verbs.length:0;}));
          for(let r=0;r<Math.min(maxV,14);r++){
            h+='<tr>';
            BL.forEach(function(b){
              const v=BD[b]&&BD[b].verbs[r]?BD[b].verbs[r]:'';
              h+='<td style="padding:5px 7px;border:1px solid #e2e8f0;background:'+(r%2?BLBg[b]+'66':BLBg[b]+'33')+';color:'+BLC[b]+';font-weight:600;text-align:center">'+v+'</td>';
            });
            h+='</tr>';
          }
          h+='</tbody></table>';

          // 2D &#8212; Syllabus
          if(s.syllabusModules&&s.syllabusModules.length){
            h+='<h3 style="color:#2563eb;font-size:14px;margin:16px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">D. Module-wise Syllabus</h3>';
            h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">';
            h+='<thead><tr style="background:#1e40af;color:#fff">';
            h+='<th style="padding:7px;border:1px solid #93c5fd;width:50px;text-align:center">Mod No</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;min-width:110px">Module Title</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;text-align:left;min-width:180px">Detailed Syllabus</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;width:50px">CO(s)</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;width:80px">Bloom\'s</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;width:70px">WK(s)</th>';
            h+='<th style="padding:7px;border:1px solid #93c5fd;width:48px">Hours</th>';
            h+='</tr></thead><tbody>';
            s.syllabusModules.forEach(function(mod,mi){
              const topicLines=(mod.topics||'').split('\n').filter(function(l){return l.trim();});
              h+='<tr style="background:'+(mi%2?'#f0f7ff':'#fff')+';vertical-align:top">';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center;font-weight:800;color:#1d4ed8">'+mod.no+'</td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;font-weight:600">'+mod.title+'</td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe"><ul style="margin:0;padding-left:14px">';
              topicLines.forEach(function(t){ h+='<li style="margin-bottom:2px">'+t+'</li>'; });
              h+='</ul></td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">'+((mod.cos||[]).join('<br>'))+'</td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;font-size:10px">'+((mod.blooms||[]).join(', '))+'</td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;font-size:10px">'+((mod.wks||[]).join(', '))+'</td>';
              h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center;font-weight:700">'+(mod.hours||'&#8212;')+'</td>';
              h+='</tr>';
            });
            const totH=s.syllabusModules.reduce(function(a,m){return a+(m.hours||0);},0);
            h+='<tr style="background:#dbeafe;font-weight:700"><td colspan="6" style="padding:6px 10px;border:1px solid #bfdbfe;text-align:right;color:#1d4ed8">Total Hours</td><td style="padding:6px;border:1px solid #bfdbfe;text-align:center;color:#059669">'+totH+' / '+(s.totalHours||48)+'</td></tr>';
            h+='</tbody></table>';
            // Text books
            if(s.syllabusTextBooks&&s.syllabusTextBooks.some(function(b){return b.title;})){
              h+='<p style="font-weight:700;color:#1d4ed8;margin:10px 0 4px">Text Books</p>';
              h+='<ol style="margin:0;padding-left:20px;font-size:11px">';
              s.syllabusTextBooks.forEach(function(bk){if(bk.title) h+='<li style="margin-bottom:3px">'+bk.title+' &#8212; '+bk.author+', '+bk.pub+(bk.ed?', '+bk.ed+' ed.':'')+( bk.year?', '+bk.year:'')+'</li>';});
              h+='</ol>';
            }
            if(s.syllabusRefBooks&&s.syllabusRefBooks.some(function(b){return b.title;})){
              h+='<p style="font-weight:700;color:#7c3aed;margin:10px 0 4px">Reference Books</p>';
              h+='<ol style="margin:0;padding-left:20px;font-size:11px">';
              s.syllabusRefBooks.forEach(function(bk){if(bk.title) h+='<li style="margin-bottom:3px">'+bk.title+' &#8212; '+bk.author+', '+bk.pub+(bk.ed?', '+bk.ed+' ed.':'')+( bk.year?', '+bk.year:'')+'</li>';});
              h+='</ol>';
            }
            const asp=s.syllabusAssessment||{};
            if(asp.cie||asp.ese){
              h+='<p style="font-weight:700;color:#059669;margin:10px 0 4px">Assessment Pattern</p>';
              h+='<table style="border-collapse:collapse;font-size:11px"><thead><tr style="background:#d1fae5"><th style="padding:5px 10px;border:1px solid #86efac">Component</th><th style="padding:5px 10px;border:1px solid #86efac">Weight%</th><th style="padding:5px 10px;border:1px solid #86efac">Pattern/Details</th></tr></thead><tbody>';
              h+='<tr><td style="padding:5px 10px;border:1px solid #86efac">CIE</td><td style="padding:5px 10px;border:1px solid #86efac;text-align:center">'+(asp.cie||40)+'%</td><td style="padding:5px 10px;border:1px solid #86efac">'+(asp.ciePattern||'&#8212;')+'</td></tr>';
              h+='<tr><td style="padding:5px 10px;border:1px solid #86efac">ESE</td><td style="padding:5px 10px;border:1px solid #86efac;text-align:center">'+(asp.ese||60)+'%</td><td style="padding:5px 10px;border:1px solid #86efac">'+(asp.esePattern||'&#8212;')+'</td></tr>';
              if(asp.other) h+='<tr><td style="padding:5px 10px;border:1px solid #86efac">Other</td><td style="padding:5px 10px;border:1px solid #86efac">&#8212;</td><td style="padding:5px 10px;border:1px solid #86efac">'+asp.other+'</td></tr>';
              h+='</tbody></table>';
            }
          }
          return h;
        }

        // &#9472;&#9472; Generate Tab 4 content: Matrix + Justification &#9472;&#9472;
        function buildTab4(){
          const allPOs=[...s.pos.map(function(_,i){return 'PO'+(i+1);}), ...s.psos.map(function(_,i){return 'PSO'+(i+1);})];
          const allPONames=[...s.pos,...s.psos];
          let h='';
          h+='<h3 style="color:#2563eb;font-size:14px;margin:0 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">A. CO-PO / CO-PSO Mapping Matrix</h3>';
          h+='<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px">';
          h+='<thead><tr style="background:#1e40af;color:#fff"><th style="padding:6px;border:1px solid #93c5fd">CO</th>';
          s.pos.forEach(function(_,i){ h+='<th style="padding:5px 4px;border:1px solid #93c5fd;background:#1e40af;min-width:28px;text-align:center">PO'+(i+1)+'</th>'; });
          s.psos.forEach(function(_,i){ h+='<th style="padding:5px 4px;border:1px solid #93c5fd;background:#5b21b6;min-width:34px;text-align:center">PSO'+(i+1)+'</th>'; });
          h+='<th style="padding:5px;border:1px solid #93c5fd">Avg</th></tr></thead><tbody>';
          s.cos.forEach(function(co,ci){
            const row=s.copoPOMatrix[ci]||[];
            const nz=row.filter(function(v){return v>0;});
            const avg=nz.length?(nz.reduce(function(a,b){return a+b;},0)/nz.length).toFixed(2):'-';
            h+='<tr style="background:'+(ci%2?'#f0f7ff':'#fff')+'">';
            h+='<td style="padding:5px 8px;border:1px solid #e2e8f0;font-weight:800;color:#2563eb">'+co.id+'</td>';
            row.forEach(function(v,pi){
              const bg=v===3?'#d1fae5':v===2?'#fef3c7':v===1?'#dbeafe':'';
              const col=v===3?'#059669':v===2?'#d97706':v===1?'#2563eb':'#94a3b8';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;text-align:center;background:'+bg+';font-weight:700;color:'+col+'">'+(v||'')+'</td>';
            });
            h+='<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700">'+avg+'</td>';
            h+='</tr>';
          });
          // PO avg row
          h+='<tr style="background:#dbeafe;font-weight:700"><td style="padding:5px 8px;border:1px solid #bfdbfe;color:#1d4ed8">Avg</td>';
          allPOs.forEach(function(_,pi){
            const vals=s.copoPOMatrix.map(function(row){return row[pi]||0;}).filter(function(v){return v>0;});
            const avg=vals.length?(vals.reduce(function(a,b){return a+b;},0)/vals.length).toFixed(2):'-';
            h+='<td style="padding:5px;border:1px solid #bfdbfe;text-align:center">'+avg+'</td>';
          });
          h+='<td style="border:1px solid #bfdbfe"></td></tr>';
          h+='</tbody></table>';

          // Justification
          if(s.copoJustification&&Object.keys(s.copoJustification).length){
            h+='<h3 style="color:#2563eb;font-size:14px;margin:16px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">B. CO-PO Mapping Justification</h3>';
            h+='<table style="width:100%;border-collapse:collapse;font-size:11px">';
            h+='<thead><tr style="background:#0f172a;color:#fff"><th style="padding:7px;border:1px solid #334155;width:40px">CO</th><th style="padding:7px;border:1px solid #334155;width:50px">PO/PSO</th><th style="padding:7px;border:1px solid #334155;width:50px">Level</th><th style="padding:7px;border:1px solid #334155;text-align:left">Justification</th></tr></thead><tbody>';
            s.cos.forEach(function(co,ci){
              s.copoPOMatrix[ci].forEach(function(v,pi){
                if(!v) return;
                const key=co.id+'_'+allPOs[pi];
                const just=(s.copoJustification&&s.copoJustification[key])||'';
                const str=v===3?'High':v===2?'Medium':'Low';
                h+='<tr style="background:'+(ci%2?'#f8fafc':'#fff')+'">';
                h+='<td style="padding:5px 8px;border:1px solid #e2e8f0;font-weight:700;color:#2563eb">'+co.id+'</td>';
                h+='<td style="padding:5px 8px;border:1px solid #e2e8f0;font-weight:700">'+allPOs[pi]+'</td>';
                h+='<td style="padding:5px 8px;border:1px solid #e2e8f0;color:'+(v===3?'#059669':v===2?'#d97706':'#2563eb')+'">'+str+'</td>';
                h+='<td style="padding:5px 8px;border:1px solid #e2e8f0">'+(just||'<em style="color:#94a3b8">Not provided</em>')+'</td>';
                h+='</tr>';
              });
            });
            h+='</tbody></table>';
          }
          return h;
        }

        // &#9472;&#9472; Generate Tab 6 content: CO Hours with chart summary &#9472;&#9472;
        function buildTab6(){
          let h='';
          h+='<h3 style="color:#2563eb;font-size:14px;margin:0 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">CO Teaching Hours</h3>';
          h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px">';
          h+='<thead><tr style="background:#1e40af;color:#fff"><th style="padding:7px;border:1px solid #93c5fd">CO</th><th style="padding:7px;border:1px solid #93c5fd;text-align:left">Outcome</th>';
          (s.hourCols||[]).forEach(function(c){ h+='<th style="padding:7px;border:1px solid #93c5fd;text-align:center">'+c+'</th>'; });
          h+='<th style="padding:7px;border:1px solid #93c5fd;text-align:center">Total</th></tr></thead><tbody>';
          s.cos.forEach(function(co,ci){
            const hrs=(s.coHours||[[]])[ci]||[];
            const total=hrs.reduce(function(a,b){return a+b;},0);
            h+='<tr style="background:'+(ci%2?'#f0f7ff':'#fff')+'">';
            h+='<td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:800;color:#2563eb">'+co.id+'</td>';
            h+='<td style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px">'+co.outcome.substring(0,60)+'...</td>';
            hrs.forEach(function(v){ h+='<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:600">'+v+'</td>'; });
            h+='<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:800;color:#059669">'+total+'</td>';
            h+='</tr>';
          });
          // Total row
          h+='<tr style="background:#dbeafe;font-weight:700"><td colspan="2" style="padding:6px 8px;border:1px solid #bfdbfe;text-align:right;color:#1d4ed8">Total</td>';
          (s.hourCols||[]).forEach(function(_,hi){
            const t=s.cos.reduce(function(a,_,ci){return a+((s.coHours||[[]])[ci]||[])[hi]||0;},0);
            h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center">'+t+'</td>';
          });
          const grand=s.cos.reduce(function(a,_,ci){return a+((s.coHours||[[]])[ci]||[]).reduce(function(x,y){return x+y;},0);},0);
          h+='<td style="padding:6px;border:1px solid #bfdbfe;text-align:center;font-weight:800">'+grand+'</td></tr>';
          h+='</tbody></table>';
          return h;
        }

        // &#9472;&#9472; Generate Tab 9: CIA Q-Papers &#9472;&#9472;
        function buildTab9(){
          const cieTests=s.assessments.filter(function(a){return a.type==='CIE';});
          if(!cieTests.length) return '<p style="color:#94a3b8;font-size:12px">No CIE assessments defined.</p>';
          let h='';
          cieTests.forEach(function(test){
            const tIdx=s.assessments.indexOf(test);
            const qmap=s.coqMaps&&s.coqMaps[tIdx]?s.coqMaps[tIdx]:[];
            h+='<h3 style="color:#2563eb;font-size:13px;margin:0 0 8px;padding:6px 10px;background:#dbeafe;border-radius:6px">'+test.name+' &#8212; Q-Paper (Max: '+test.max+')</h3>';
            if(!qmap.length){h+='<p style="font-size:11px;color:#94a3b8;margin-bottom:12px">No questions mapped.</p>';return;}
            h+='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px">';
            h+='<thead><tr style="background:#1e40af;color:#fff"><th style="padding:6px;border:1px solid #93c5fd;width:30px">Q</th><th style="padding:6px;border:1px solid #93c5fd;text-align:left">Description</th><th style="padding:6px;border:1px solid #93c5fd;width:40px">Marks</th><th style="padding:6px;border:1px solid #93c5fd;width:50px">CO(s)</th><th style="padding:6px;border:1px solid #93c5fd;width:80px">Bloom\'s</th><th style="padding:6px;border:1px solid #93c5fd;text-align:left">PI</th></tr></thead><tbody>';
            qmap.forEach(function(q,qi){
              if(!q) return;
              h+='<tr style="background:'+(qi%2?'#f0f7ff':'#fff')+'">';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;text-align:center;font-weight:700">Q'+(qi+1)+'</td>';
              h+='<td style="padding:5px;border:1px solid #e2e8f0">'+(q.desc||'&#8212;')+'</td>';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;text-align:center;font-weight:700">'+( q.marks||'&#8212;')+'</td>';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;text-align:center">'+((q.cos||[]).map(function(ci){return s.cos[ci]?s.cos[ci].id:'CO'+(ci+1);}).join(', '))+'</td>';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;text-align:center">'+(q.bloom||'&#8212;')+'</td>';
              h+='<td style="padding:5px;border:1px solid #e2e8f0;font-size:10px;color:#475569">'+(q.pi||'&#8212;')+'</td>';
              h+='</tr>';
            });
            h+='</tbody></table>';
          });
          return h;
        }

        // &#9472;&#9472; Generate Tab 10: Marklist (CIE + ESE + Lab) &#9472;&#9472;
        function buildTab10(){
          let h='';
          const types=[{key:'CIE',label:'CIE (Continuous Internal Evaluation)'},
                       {key:'ESE',label:'ESE (End Semester Exam)'},
                       {key:'Lab',label:'Lab Assessment'}];
          types.forEach(function(t){
            const assessList=s.assessments.filter(function(a){return a.type===t.key;});
            if(!assessList.length) return;
            h+='<h3 style="color:#2563eb;font-size:13px;margin:0 0 8px;padding:6px 10px;background:#dbeafe;border-radius:6px">'+t.label+'</h3>';
            if(!s.students.length){h+='<p style="font-size:11px;color:#94a3b8;margin-bottom:12px">No students added.</p>';return;}
            h+='<div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:10px">';
            h+='<thead><tr style="background:#1e40af;color:#fff">';
            h+='<th style="padding:5px;border:1px solid #93c5fd;width:30px">#</th>';
            h+='<th style="padding:5px;border:1px solid #93c5fd;text-align:left;min-width:80px">Roll No</th>';
            h+='<th style="padding:5px;border:1px solid #93c5fd;text-align:left;min-width:100px">Name</th>';
            assessList.forEach(function(a){ h+='<th style="padding:5px;border:1px solid #93c5fd;min-width:45px">'+a.name+'<div style="font-size:9px;font-weight:400">/'+a.max+'</div></th>'; });
            h+='<th style="padding:5px;border:1px solid #93c5fd;min-width:45px">Total</th>';
            h+='<th style="padding:5px;border:1px solid #93c5fd;min-width:45px">%</th>';
            h+='</tr></thead><tbody>';
            s.students.forEach(function(st,si){
              const mks=assessList.map(function(a){return s.marks&&s.marks[a.id]?( s.marks[a.id][st.roll]||0):0;});
              const maxT=assessList.reduce(function(a,b){return a+b.max;},0);
              const total=mks.reduce(function(a,b){return a+b;},0);
              const pct=maxT?((total/maxT)*100).toFixed(1):0;
              h+='<tr style="background:'+(si%2?'#f8fafc':'#fff')+'">';
              h+='<td style="padding:4px;border:1px solid #e2e8f0;text-align:center;color:#94a3b8">'+(si+1)+'</td>';
              h+='<td style="padding:4px;border:1px solid #e2e8f0;font-family:monospace;font-size:10px">'+st.roll+'</td>';
              h+='<td style="padding:4px;border:1px solid #e2e8f0">'+st.name+'</td>';
              mks.forEach(function(m){ h+='<td style="padding:4px;border:1px solid #e2e8f0;text-align:center;font-weight:600">'+m+'</td>'; });
              h+='<td style="padding:4px;border:1px solid #e2e8f0;text-align:center;font-weight:800;color:#1d4ed8">'+total+'</td>';
              h+='<td style="padding:4px;border:1px solid #e2e8f0;text-align:center;color:'+(+pct>=60?'#059669':'#dc2626')+'">'+pct+'%</td>';
              h+='</tr>';
            });
            h+='</tbody></table></div>';
          });
          return h;
        }


    const sectionPages=PAGES.slice(1).map(function(p,rawIdx){
          const i=rawIdx+1; // actual page index
          const hdr=secHeader(p.label,p.section,s.code,s.name,s.ay);
          let content='';
          if(i===2)       content=buildTab2();
          else if(i===4)  content=buildTab4();
          else if(i===6)  content=buildTab6();
          else if(i===9)  content=buildTab9();
          else if(i===10) content=buildTab10();
          else {
            const el=document.getElementById(p.id);
            content=el?sanitizePage(el):'';
          }
          return '<div style="page-break-before:always;padding:28px 36px">'+hdr+content+'</div>';
        }).join('');

    const allCSS=Array.from(document.styleSheets).map(function(ss){
      try{return Array.from(ss.cssRules).map(function(r){return r.cssText;}).join('\n');}
      catch(e){return '';}
    }).join('\n');

    const w=window.open('','_blank');
    if(w){
      w.document.write(
        '<!DOCTYPE html><html lang="en"><head>'
        +'<meta charset="UTF-8">'
        +'<title>OBE Course File &#8212; '+s.name+' ('+s.code+')</title>'
        +'<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">'
        +'<style>'
        +allCSS
        +'body{background:#fff!important;font-family:"Plus Jakarta Sans",sans-serif;color:#000!important}'
        +'*{color:#000!important}'
        +'.sidebar,.topbar,.mobile-menu-btn,.nav-item,.btn-primary,.btn-outline,.btn-sm,.btn-gold,.btn-success,.btn-purple,.btn-danger,.subject-selector,.sidebar-footer,.instr{display:none!important}'
        +'.page{display:block!important;opacity:1!important}'
        +'.shell-grid,.main-content{display:block!important}'
        +'.content-body{padding:0!important}'
        +'@page{margin:15mm;size:A4}'
        +'@media print{'
        +'  .page{page-break-inside:avoid}'
        +'  button,.btn{display:none!important}'
        +'  input[type=range]{display:none}'
        +'  .tbl-wrap{overflow:visible!important}'
        +'}'
        +'</style>'
        +'</head><body>'
        +coverPage
        +indexPage
        +sectionPages
        +'</body></html>'
      );
      w.document.close();
      setTimeout(function(){w.print();},1200);
    }
    showToast('Full report ready &#8212; '+PAGES.length+' sections','success');
  },800);
}

// ============================================================
//  EXCEL EXPORT
// ============================================================
function exportAllExcel(){
  const s=sub();
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['NBA OBE &#8212; '+s.name],[''],['Code',s.code],['Dept',s.dept],['Faculty',s.faculty],['AY',s.ay],['Sem',s.sem],['Target',s.coTargetLevel.toFixed(2)]]),'1_CourseInfo');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['CO','Objective','Outcome','Bloom','WK','PI'],...s.cos.map(c=>[c.id,c.objective,c.outcome,c.bloom,c.wk||'WK1',c.pi||''])]),'2_COs');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Roll No','Name','Gender','Category'],...s.students.map(st=>[st.roll,st.name,st.gender,st.category||'General'])]),'3_Students');
  const allPOs=[...s.pos.map((_,i)=>'PO'+(i+1)),...s.psos.map((_,i)=>'PSO'+(i+1))];
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
  s.id=id;
  s.ownerUsername=APP.user.username;
  s.ownerRole=APP.user.role;
  APP.subjects[id]=s;APP.currentSubjectId=id;
  try{
    await createSubject(s);
    buildSubjectSelector();syncSubjectSelector();closeModal();buildContentPages();navigateTo(0);showToast('Subject added! Visible only to your login.','success');
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
  const icon=type==='success'?String.fromCharCode(9989):type==='error'?String.fromCharCode(10060):String.fromCharCode(8505);
  let cleanMsg=String(msg||'');
  // Decode numeric entities (handles both normal and escaped ampersand)
  cleanMsg=cleanMsg
    .replace(/&amp;#x([0-9a-fA-F]+);/g,function(_,n){return String.fromCharCode(parseInt(n,16));})
    .replace(/&#x([0-9a-fA-F]+);/g,function(_,n){return String.fromCharCode(parseInt(n,16));})
    .replace(/&amp;#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));});
  t.textContent=icon+' '+cleanMsg;
  t.className='show '+(type||'success');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.className='',2800);
}


