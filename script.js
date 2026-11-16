const $=s=>document.querySelector(s),KEY='acp_v1';
const NAV=[['dashboard','📊','Dashboard'],['register','🚗','Vehicle Registration'],['queue','⏳','Service Queue'],['ongoing','🔧','Ongoing Services'],['mechanics','👷','Mechanic Management'],['completed','✅','Completed Services'],['billing','💳','Billing Management'],['history','🕘','Service History'],['dsa','🧠','DSA Visualization'],['settings','⚙️','Settings']];
const SVC=['General Service','Engine Repair','Oil Change','Brake Repair','Tyre Replacement','Battery Service','Other'],TYPES=['Car','Bike','SUV','Other'],ST=['Waiting for Mechanic','In Progress','Quality Check','Completed'];
let S,Q,page='dashboard',charts=[],hq='';
const now=()=>new Date().toISOString(),fmt=d=>d?new Date(d).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—',inr=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';'),pad=(p,n)=>p+String(n).padStart(3,'0');
const V=id=>S.vs.find(v=>v.id===id),M=id=>S.ms.find(m=>m.id===id),B=vid=>S.bills.find(b=>b.vid===vid);
const isOn=v=>ST.slice(0,3).includes(v.status),isAct=v=>!['Completed','Cancelled'].includes(v.status);
const BC={Waiting:'w','Waiting for Mechanic':'w','In Progress':'p','Quality Check':'s',Completed:'ok',Cancelled:'d'};
const badge=s=>`<span class="bd ${BC[s]}">${s}</span>`;
const opts=(a,sel)=>a.map(x=>`<option ${x===sel?'selected':''}>${x}</option>`).join('');
const tbl=(h,rows,id='')=>`<div class=tw><table><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody id="${id}">${rows||`<tr><td colspan=${h.length} class=mu>No records found</td></tr>`}</tbody></table></div>`;
const qcards=items=>items.length?items.map((v,i)=>{const n=items.length,l=[i==0&&'FRONT',i==n-1&&'REAR'].filter(Boolean).join(' / ');return `<div class="qc ${i?'':'f'}"><small>${l}</small><b>${v.id}</b> <span class=mono>${v.token}</span><p>${v.customer}</p><p>${v.model}</p><p>${v.service}</p><em>Position ${i+1}</em></div>${i<n-1?'<span class=ar>➜</span>':''}`}).join(''):'<p class=mu>Queue is empty. Register a vehicle to add it at the REAR.</p>';

/* ---------- data ---------- */
function veh(c,m,r,s,x={}){S.n++;return{id:pad('V',S.n),token:'T'+(100+S.n),customer:c,phone:'9876543210',reg:r,model:m,type:'Car',brand:m.split(' ')[0],service:s,desc:'',status:'Waiting',mech:null,start:null,end:null,regAt:now(),...x}}
function blank(){S={n:0,vs:[],ms:[],bills:[],log:[],bn:0,mn:0,q:[],cfg:{admin:'Anila Babu',center:'AutoCare Pro Service Center',theme:'dark'},...(S?{cfg:S.cfg}:{})};Q=new Queue()}
function demo(){blank();[['Rahul','Hyundai i20','KA01AB1234','General Service'],['Priya','Honda City','KA03CD5678','Oil Change'],['Arjun','Royal Enfield','KA05EF9012','Brake Repair',{type:'Bike'}]].forEach(a=>{const v=veh(...a);S.vs.push(v);Q.enqueue(v.id)});
[['Suresh','Engine Repair'],['Ramesh','General Service'],['Kiran','Electrical Repair']].forEach(a=>S.ms.push({id:pad('M',++S.mn),name:a[0],spec:a[1],phone:'98450000'+(10+S.mn),av:'Available'}));log('Sample data loaded');save()}
function load(){try{S=JSON.parse(localStorage[KEY]);Q=new Queue(S.q)}catch(e){S=null;demo()}}
function save(){S.q=Q.display();localStorage[KEY]=JSON.stringify(S)}
function log(m){S.log.unshift({m,t:now()});S.log=S.log.slice(0,25)}
function toast(m,t=''){const e=document.createElement('div');e.className='toast '+t;e.textContent=m;$('#ts').append(e);setTimeout(()=>e.remove(),3200)}
const show=h=>{$('#mb').innerHTML=h;$('#md').classList.add('on')},hide=()=>$('#md').classList.remove('on');
const bell=()=>toast(`${Q.size} vehicle(s) waiting · ${S.vs.filter(isOn).length} in service`,'warn');

/* ---------- operations ---------- */
function register(e){e.preventDefault();const f=e.target,g=n=>f[n].value.trim(),reg=g('reg').toUpperCase().replace(/[\s-]/g,''),ph=g('phone');
 if(!g('customer')||!g('model')||!g('brand'))return toast('Fill all required fields','err');
 if(!/^[6-9]\d{9}$/.test(ph))return toast('Enter a valid 10-digit mobile number','err');
 if(!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(reg))return toast('Vehicle number format: KA01AB1234','err');
 if(S.vs.some(v=>v.reg===reg&&isAct(v)))return toast('This vehicle is already registered and active','warn');
 const v=veh(esc(g('customer')),esc(g('model')),reg,g('service'),{phone:ph,type:g('type'),brand:esc(g('brand')),desc:esc(g('desc'))});
 S.vs.push(v);Q.enqueue(v.id);log(`${v.id} ${v.customer} enqueued at REAR (${v.token})`);save();toast(`Registered ${v.id} · Token ${v.token} · Position ${Q.size}`);nav('queue')}
function assign(v,m){const o=M(v.mech);if(o&&o.av==='Busy')o.av='Available';v.mech=m.id;m.av='Busy';if(v.status==='Waiting for Mechanic'){v.status='In Progress';v.start=now()}}
function callNext(){if(Q.isEmpty())return toast('Queue is empty — nothing to dequeue','warn');
 const go=()=>{const v=V(Q.dequeue());v.status='Waiting for Mechanic';const m=S.ms.find(m=>m.av==='Available'&&m.spec===v.service)||S.ms.find(m=>m.av==='Available');if(m)assign(v,m);
  log(`${v.id} dequeued from FRONT`+(m?` · mechanic ${m.name}`:''));save();toast(`${v.id} called`+(m?` · mechanic ${m.name} suggested`:' · no mechanic free, assign manually'),m?'':'warn');render()};
 const f=$('.qc');f?(f.classList.add('out'),setTimeout(go,380)):go()}
const peek=()=>{const v=V(Q.peek());toast(v?`PEEK → ${v.id} · ${v.customer} · ${v.service} (${v.token})`:'Queue is empty','warn')};
const chk=()=>toast(Q.isEmpty()?'isEmpty() = true':`isEmpty() = false · ${Q.size} waiting`);
const refresh=()=>{render();toast(`DISPLAY: ${Q.size} vehicle(s) in queue (FRONT→REAR)`)};
function resetQ(){if(Q.isEmpty())return toast('Queue already empty','warn');if(!confirm('Cancel all waiting vehicles and reset the queue?'))return;Q.display().forEach(id=>V(id).status='Cancelled');Q=new Queue();log('Queue reset');save();render();toast('Queue reset','warn')}
function setMech(id,mid){if(mid){assign(V(id),M(mid));log(`${id} assigned to ${M(mid).name}`);save();render();toast('Mechanic assigned')}}
function setSt(id,st){const v=V(id);v.status=st;if(!v.start&&st!=='Waiting for Mechanic')v.start=now();
 if(st==='Completed'){v.end=now();const m=M(v.mech);if(m)m.av='Available';log(`${id} service completed`);toast(`${id} completed — create its bill`)}else toast(`${id}: ${st}`);save();render()}
function saveMech(e){e.preventDefault();const f=e.target;if(!/^\d{10}$/.test(f.phone.value))return toast('Phone must be 10 digits','err');
 S.ms.push({id:pad('M',++S.mn),name:esc(f.name.value.trim()),spec:esc(f.spec.value.trim()),phone:f.phone.value,av:f.av.value});log('Mechanic added');save();render();toast('Mechanic added')}
function editMech(id){const m=M(id),n=prompt('Name',m.name);if(n===null)return;const s=prompt('Specialization',m.spec),p=prompt('Phone (10 digits)',m.phone);
 if(!n.trim()||!/^\d{10}$/.test(p||''))return toast('Invalid details','err');m.name=esc(n.trim());m.spec=esc((s||m.spec).trim());m.phone=p;save();render();toast('Mechanic updated')}
function delMech(id){const m=M(id);if(m.av==='Busy')return toast('Mechanic is busy with a vehicle','warn');if(!confirm('Delete '+m.name+'?'))return;S.ms=S.ms.filter(x=>x.id!==id);save();render();toast('Mechanic deleted','warn')}
const setAv=(id,v)=>{const m=M(id);if(m.av==='Busy'&&v!=='Busy')return toast('Complete the vehicle first','warn'),render();m.av=v;save();render()};
function det(id){const v=V(id),m=M(v.mech),b=B(id);show(`<h3>${v.id} · ${v.customer}</h3><div class=li><span>Vehicle</span><b>${v.brand} ${v.model} (${v.type})</b></div><div class=li><span>Reg. No.</span><b>${v.reg}</b></div><div class=li><span>Phone</span><b>${v.phone}</b></div><div class=li><span>Service</span><b>${v.service}</b></div><div class=li><span>Token</span><b>${v.token}</b></div><div class=li><span>Mechanic</span><b>${m?m.name:'—'}</b></div><div class=li><span>Registered</span><b>${fmt(v.regAt)}</b></div><div class=li><span>Completed</span><b>${fmt(v.end)}</b></div><div class=li><span>Status</span>${badge(v.status)}</div><div class=li><span>Notes</span><b>${v.desc||'—'}</b></div><div class=li><span>Bill</span><b>${b?b.no+' · '+inr(b.total)+' · '+b.paid:'—'}</b></div><div class=np><button class="btn g" onclick=hide()>Close</button></div>`)}
function mkBill(e){e.preventDefault();const f=e.target,v=V(f.vid.value);if(!v)return toast('Select a completed vehicle','err');const l=+f.l.value||0,p=+f.p.value||0,x=+f.x.value||0;
 S.bn++;S.bills.push({no:'INV'+(1000+S.bn),vid:v.id,l,p,x,total:l+p+x,method:f.method.value,paid:f.paid.value,at:now()});log(`Bill generated for ${v.id}`);save();render();toast('Bill generated')}
const calc=()=>{const f=$('#bf');$('#tot').textContent=inr((+f.l.value||0)+(+f.p.value||0)+(+f.x.value||0))};
const togPay=no=>{const b=S.bills.find(b=>b.no===no);b.paid=b.paid==='Paid'?'Pending':'Paid';save();render()};
function inv(no){const b=S.bills.find(b=>b.no===no),v=V(b.vid);show(`<div class=invoice><h2>🛡 ${esc(S.cfg.center)}</h2><p class=mu>Invoice ${b.no} · ${fmt(b.at)}</p><hr><p>Customer: <b>${v.customer}</b> (${v.phone})</p><p>Vehicle: ${v.model} · ${v.reg}</p><p>Service: ${v.service}</p><hr><table style="width:100%"><tr><td>Labour Charges</td><td align=right>${inr(b.l)}</td></tr><tr><td>Spare Parts</td><td align=right>${inr(b.p)}</td></tr><tr><td>Additional Charges</td><td align=right>${inr(b.x)}</td></tr></table><hr><h3>Total: ${inr(b.total)}</h3><p>Payment: ${b.method} · <b>${b.paid}</b></p></div><div class=np><button class=btn onclick=window.print()>🖨 Print Invoice</button> <button class="btn g" onclick=hide()>Close</button></div>`)}
function saveCfg(e){e.preventDefault();const f=e.target;S.cfg={admin:esc(f.admin.value.trim()||'Admin'),center:esc(f.center.value.trim()||'AutoCare Pro'),theme:f.theme.value};save();chrome();toast('Settings saved')}
function clearAll(){if(confirm('Delete ALL vehicles, mechanics, bills and queue data?')){blank();save();render();toast('All data cleared','warn')}}
function loadDemo(){if(confirm('Replace current data with sample data?')){demo();render();toast('Sample data loaded')}}

/* ---------- DSA demo ---------- */
let D=new Queue(),dmsg='Queue is empty. Try Enqueue V001.';
function dop(op,x){if(op=='enq')dmsg=D.display().includes(x)?`${x} is already in the queue`:(D.enqueue(x),`ENQUEUE(${x}): inserted at REAR · O(1)`);
 else if(op=='deq')dmsg=D.isEmpty()?'Underflow: cannot dequeue from an empty queue':`DEQUEUE(): removed ${D.dequeue()} from FRONT · O(1)`;
 else if(op=='peek')dmsg=D.isEmpty()?'Queue is empty':`PEEK(): FRONT is ${D.peek()} · O(1)`;
 else if(op=='dis')dmsg=`DISPLAY(): [${D.display().join(', ')||'empty'}] · O(n)`;else{D=new Queue();dmsg='Queue reset'}render()}

/* ---------- pages ---------- */
const rowV=v=>`<div class=li><span><b>${v.id}</b> ${v.customer} · ${v.model}</span>${badge(v.status)}</div>`;
const P={
dashboard(){const on=S.vs.filter(isOn),av=S.ms.filter(m=>m.av==='Available');
 return `<div class=hero><h2>Welcome to AutoCare Pro</h2><p class=mu>Manage your service center operations efficiently.</p></div>
 <div class=grid4>${[['Total Vehicles',S.vs.length,'🚗','c1'],['Waiting Vehicles',Q.size,'⏳','c2'],['Ongoing Services',on.length,'🔧','c3'],['Completed Services',S.vs.filter(v=>v.status==='Completed').length,'✅','c4']].map(a=>`<div class="stat ${a[3]}"><span>${a[2]}</span><small>${a[0]}</small><b>${a[1]}</b></div>`).join('')}</div>
 <div class=qa><button class=btn onclick="nav('register')">➕ Register New Vehicle</button><button class=btn onclick=callNext()>▶ Call Next Vehicle</button><button class="btn g" onclick="nav('queue')">👁 View Queue</button><button class="btn g" onclick="nav('billing')">🧾 Generate Bill</button></div>
 <div class=card><h3>Live Service Queue</h3><div class=qrow>${qcards(Q.display().map(V))}</div></div>
 <div class=g2><div class=card><h3>Recently Registered</h3>${S.vs.slice(-4).reverse().map(rowV).join('')||'<p class=mu>None yet</p>'}</div>
 <div class=card><h3>Currently Servicing</h3>${on.map(rowV).join('')||'<p class=mu>No vehicle in service</p>'}</div>
 <div class=card><h3>Available Mechanics</h3>${av.map(m=>`<div class=li><span>${m.name}</span><small>${m.spec}</small></div>`).join('')||'<p class=mu>No mechanic available</p>'}</div>
 <div class=card><h3>Recent Activities</h3>${S.log.slice(0,5).map(l=>`<div class=li><span>${l.m}</span><small>${new Date(l.t).toLocaleTimeString('en-IN',{timeStyle:'short'})}</small></div>`).join('')||'<p class=mu>No activity</p>'}</div></div>
 <div class=g2><div class=card><h3>Weekly Service Statistics</h3><canvas id=c1></canvas></div><div class=card><h3>Service Categories</h3><canvas id=c2></canvas></div><div class=card><h3>Mechanic Workload</h3><canvas id=c3></canvas></div>
 <div class=card><h3>Summary</h3><div class=li><span>Total revenue</span><b>${inr(S.bills.reduce((a,b)=>a+b.total,0))}</b></div><div class=li><span>Services completed</span><b>${S.vs.filter(v=>v.status==='Completed').length}</b></div><div class=li><span>Current queue length</span><b>${Q.size}</b></div></div></div>`},
register(){return `<div class=card><h3>Register Vehicle</h3><form onsubmit="register(event)" class=fm>
 <label>Customer Name*<input name=customer required></label><label>Phone Number*<input name=phone maxlength=10 required placeholder=9876543210></label>
 <label>Vehicle Registration Number*<input name=reg required placeholder=KA01AB1234></label><label>Vehicle Model*<input name=model required></label>
 <label>Vehicle Type<select name=type>${opts(TYPES)}</select></label><label>Vehicle Brand*<input name=brand required></label>
 <label>Service Required<select name=service>${opts(SVC)}</select></label><label class=fw>Additional Description<textarea name=desc rows=3></textarea></label>
 <div class=fw><button class=btn>Register Vehicle</button> <button type=reset class="btn g">Reset Form</button></div></form></div>`},
queue(){const f=Q.peek(),r=Q.display().slice(-1)[0];return `<div class=card><div class=bar><h3>FIFO Service Queue · ${Q.size} waiting</h3><div><button class=btn onclick="nav('register')">➕ Add to Queue</button><button class="btn ok" onclick=callNext()>▶ Call Next Vehicle</button><button class="btn g" onclick=peek()>👁 View Next Vehicle</button><button class="btn g" onclick=refresh()>🔄 Refresh Queue</button><button class="btn g" onclick=chk()>❔ Check Queue</button><button class="btn d" onclick=resetQ()>🗑 Reset</button></div></div>
 <div class=qrow>${qcards(Q.display().map(V))}</div><p class=mu>FRONT → <span class=mono>${f||'null'}</span> &nbsp; REAR → <span class=mono>${r||'null'}</span> &nbsp; Estimated wait for a new vehicle: position ${Q.size+1}</p></div>`},
ongoing(){const rows=S.vs.filter(isOn).map(v=>{const m=M(v.mech),fr=S.ms.filter(x=>x.av==='Available');return `<tr><td>${v.id}</td><td>${v.customer}</td><td>${v.model}</td><td>${v.service}</td><td>${m?m.name:`<select onchange="setMech('${v.id}',this.value)"><option value="">Assign…</option>${fr.map(x=>`<option value=${x.id}>${x.name}</option>`).join('')}</select>`}</td><td>${fmt(v.start)}</td><td><select onchange="setSt('${v.id}',this.value)">${opts(ST,v.status)}</select></td><td><button class="btn ok sm" onclick="setSt('${v.id}','Completed')">Mark Completed</button></td></tr>`}).join('');
 return `<div class=card><h3>Ongoing Services</h3>${tbl(['Vehicle ID','Customer','Vehicle Model','Service Type','Assigned Mechanic','Start Time','Status','Action'],rows)}</div>`},
mechanics(){const rows=S.ms.map(m=>`<tr><td>${m.id}</td><td>${m.name}</td><td>${m.spec}</td><td>${m.phone}</td><td><select onchange="setAv('${m.id}',this.value)">${opts(['Available','Busy','On Leave'],m.av)}</select></td><td><button class="btn g sm" onclick="editMech('${m.id}')">Edit</button> <button class="btn d sm" onclick="delMech('${m.id}')">Delete</button></td></tr>`).join('');
 return `<div class=card><h3>Add Mechanic</h3><form onsubmit="saveMech(event)" class=fm><label>Name<input name=name required></label><label>Specialization<input name=spec required></label><label>Phone<input name=phone maxlength=10 required></label><label>Availability<select name=av>${opts(['Available','On Leave'])}</select></label><div class=fw><button class=btn>Add Mechanic</button></div></form></div><div class=card><h3>Mechanics</h3>${tbl(['ID','Name','Specialization','Phone','Availability','Actions'],rows)}</div>`},
completed(){return `<div class=card><div class=bar><h3>Completed Services</h3><input id=cs oninput="$('#cb').innerHTML=crow()" placeholder="Search…" style="max-width:240px"></div>${tbl(['Vehicle ID','Customer Name','Vehicle Model','Service Type','Assigned Mechanic','Completion Date','Total Amount','Status'],crow(),'cb')}</div>`},
billing(){const el=S.vs.filter(v=>v.status==='Completed'&&!B(v.id)),rows=S.bills.slice().reverse().map(b=>`<tr><td>${b.no}</td><td>${V(b.vid).customer}</td><td>${V(b.vid).reg}</td><td>${inr(b.total)}</td><td>${b.method}</td><td><span class="bd ${b.paid==='Paid'?'ok':'w'}">${b.paid}</span></td><td><button class="btn g sm" onclick="inv('${b.no}')">View / Print</button> <button class="btn g sm" onclick="togPay('${b.no}')">Toggle Paid</button></td></tr>`).join('');
 return `<div class=card><h3>Generate Bill</h3>${el.length?`<form id=bf onsubmit="mkBill(event)" oninput=calc() class=fm><label>Completed Vehicle<select name=vid>${el.map(v=>`<option value=${v.id}>${v.id} · ${v.customer} · ${v.reg} · ${v.service}</option>`).join('')}</select></label><label>Labour Charges (₹)<input name=l type=number min=0 value=0></label><label>Spare Parts (₹)<input name=p type=number min=0 value=0></label><label>Additional Charges (₹)<input name=x type=number min=0 value=0></label><label>Payment Method<select name=method>${opts(['Cash','UPI','Card'])}</select></label><label>Payment Status<select name=paid>${opts(['Pending','Paid'])}</select></label><div class=fw><h3>Total: <span id=tot>₹0</span></h3><button class=btn>Generate Bill</button></div></form>`:'<p class=mu>No completed vehicles waiting for a bill. Complete a service first.</p>'}</div>
 <div class=card><h3>Billing History · Revenue ${inr(S.bills.reduce((a,b)=>a+b.total,0))}</h3>${tbl(['Bill No.','Customer','Vehicle No.','Total','Method','Payment','Actions'],rows)}</div>`},
history(){return `<div class=card><div class=bar><h3>Service History</h3><div><input id=hs value="${esc(hq)}" oninput="$('#hb').innerHTML=hrow()" placeholder="Vehicle no. or customer"><select id=hf onchange="$('#hb').innerHTML=hrow()"><option value="">All statuses</option>${opts([...ST,'Waiting','Cancelled'])}</select></div></div>${tbl(['ID','Customer','Vehicle No.','Model','Service','Status','Registered','Bill',''],hrow(),'hb')}</div>`},
dsa(){const it=D.display();return `<div class=card><h3>What is a Queue?</h3><p>A Queue is a linear data structure that follows <b>FIFO – First In First Out</b>. Here, vehicles are <b>enqueued at the REAR</b>, <b>dequeued from the FRONT</b>, and <b>peek</b> shows the next vehicle waiting.</p></div>
 <div class=card><h3>Interactive Queue Demo</h3><div class=qa>${['V001','V002','V003'].map(x=>`<button class=btn onclick="dop('enq','${x}')">Enqueue ${x}</button>`).join('')}<button class="btn ok" onclick="dop('deq')">Dequeue</button><button class="btn g" onclick="dop('peek')">Peek</button><button class="btn g" onclick="dop('dis')">Display</button><button class="btn d" onclick="dop('reset')">Reset</button></div>
 <div class=qrow>${it.length?it.map((x,i)=>`<div class="qc ${i?'':'f'}"><small>${[i==0&&'FRONT',i==it.length-1&&'REAR'].filter(Boolean).join(' / ')}</small><b>${x}</b></div>${i<it.length-1?'<span class=ar>➜</span>':''}`).join(''):'<p class=mu>Empty queue</p>'}</div>
 <p>FRONT → <span class=mono>${D.peek()||'null'}</span> · REAR → <span class=mono>${it.slice(-1)[0]||'null'}</span> · Length: <b>${D.size}</b></p><p class=mono>${dmsg}</p></div>
 <div class=card><h3>Time Complexity</h3>${tbl(['Operation','Time Complexity','Meaning'],[['Enqueue','O(1)','Insert at REAR'],['Dequeue','O(1)','Remove from FRONT'],['Peek','O(1)','Read FRONT'],['Display','O(n)','Visit all elements']].map(r=>`<tr><td>${r[0]}</td><td class=mono>${r[1]}</td><td>${r[2]}</td></tr>`).join(''))}</div>`},
settings(){const c=S.cfg;return `<div class=card><h3>Profile &amp; Preferences</h3><form onsubmit="saveCfg(event)" class=fm><label>Admin Name<input name=admin value="${c.admin}"></label><label>Service Center Name<input name=center value="${c.center}"></label><label>Theme<select name=theme>${['dark','light'].map(t=>`<option ${c.theme===t?'selected':''}>${t}</option>`).join('')}</select></label><div class=fw><button class=btn>Save Settings</button></div></form></div>
 <div class=card><h3>Data Management</h3><p class=mu>Data is stored in your browser's LocalStorage.</p><div class=qa style="margin-top:12px"><button class="btn g" onclick=loadDemo()>Load Sample Data</button><button class="btn d" onclick=clearAll()>Clear All Data</button></div></div>`}};
const crow=()=>{const q=($('#cs')?.value||'').toLowerCase();return S.vs.filter(v=>v.status==='Completed'&&(v.id+v.customer+v.reg+v.service).toLowerCase().includes(q)).map(v=>`<tr><td>${v.id}</td><td>${v.customer}</td><td>${v.model}</td><td>${v.service}</td><td>${(M(v.mech)||{name:'—'}).name}</td><td>${fmt(v.end)}</td><td>${B(v.id)?inr(B(v.id).total):'Not billed'}</td><td>${badge(v.status)} <button class="btn g sm" onclick="det('${v.id}')">Details</button></td></tr>`).join('')};
const hrow=()=>{const q=($('#hs')?$('#hs').value:hq).toLowerCase(),f=$('#hf')?$('#hf').value:'';return S.vs.filter(v=>(v.reg+v.customer+v.id).toLowerCase().includes(q)&&(!f||v.status===f)).map(v=>`<tr><td>${v.id}</td><td>${v.customer}</td><td>${v.reg}</td><td>${v.model}</td><td>${v.service}</td><td>${badge(v.status)}</td><td>${fmt(v.regAt)}</td><td>${B(v.id)?B(v.id).no+' · '+inr(B(v.id).total):'—'}</td><td><button class="btn g sm" onclick="det('${v.id}')">View</button></td></tr>`).join('')};

function drawCharts(){charts.forEach(c=>c.destroy());charts=[];if(!window.Chart||!$('#c1'))return;Chart.defaults.color='#91A0B7';
 const days=[...Array(7)].map((_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toDateString()}),cnt=(k,d)=>S.vs.filter(v=>v[k]&&new Date(v[k]).toDateString()===d).length,col=['#18B6E8','#3978FF','#20C997','#F5A623','#F05252','#9B7BFF','#91A0B7'];
 charts.push(new Chart($('#c1'),{type:'bar',data:{labels:days.map(d=>d.slice(0,10)),datasets:[{label:'Registered',data:days.map(d=>cnt('regAt',d)),backgroundColor:col[0]},{label:'Completed',data:days.map(d=>cnt('end',d)),backgroundColor:col[2]}]},options:{scales:{y:{beginAtZero:true,ticks:{precision:0}}}}}));
 charts.push(new Chart($('#c2'),{type:'doughnut',data:{labels:SVC,datasets:[{data:SVC.map(s=>S.vs.filter(v=>v.service===s).length),backgroundColor:col}]},options:{plugins:{legend:{position:'right'}}}}));
 charts.push(new Chart($('#c3'),{type:'bar',data:{labels:S.ms.map(m=>m.name),datasets:[{label:'Services handled',data:S.ms.map(m=>S.vs.filter(v=>v.mech===m.id).length),backgroundColor:col[1]}]},options:{scales:{y:{beginAtZero:true,ticks:{precision:0}}}}}))}

function chrome(){document.documentElement.dataset.theme=S.cfg.theme;$('#un').textContent=S.cfg.admin;$('#av').textContent=S.cfg.admin[0]||'A'}
function render(){const v=$('#view');v.className='';v.innerHTML=P[page]();void v.offsetWidth;v.className='v';$('#ttl').textContent=NAV.find(n=>n[0]===page)[2];
 document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.p===page));if(page==='dashboard')drawCharts()}
function nav(p){page=p;document.body.classList.remove('open');render();scrollTo(0,0)}
$('#nav').innerHTML=NAV.map(n=>`<a data-p=${n[0]} onclick="nav('${n[0]}')">${n[1]} ${n[2]}</a>`).join('');
$('#dt').textContent=new Date().toLocaleDateString('en-IN',{dateStyle:'full'});
load();chrome();render();setTimeout(()=>$('#ld').classList.add('x'),500);
