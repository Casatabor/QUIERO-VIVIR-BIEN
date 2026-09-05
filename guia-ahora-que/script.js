
const steps = [
  {id:1,label:"Mira dónde estás"},
  {id:2,label:"Qué quiero (más y menos)"},
  {id:3,label:"Tu necesidad"},
  {id:4,label:"Tu brújula"},
  {id:5,label:"Tu próximo paso"}
];

const ratingItems = [
  "Mi vida se siente mía.",
  "Me siento bien con mi carrera/trabajo actual.",
  "Me siento bien con mi formación y competencias.",
  "Siento que estoy aprendiendo y creciendo.",
  "Tengo claridad sobre lo que quiero.",
  "Tengo energía para hacer cambios.",
  "Veo oportunidades para avanzar.",
  "Sé cuál podría ser mi próximo paso."
];

const moreItems = [
  "Tiempo para mí","Flexibilidad","Estabilidad","Mejores ingresos","Propósito / impacto",
  "Aprendizaje","Nuevos desafíos","Espacio para la creatividad","Autonomía","Reconocimiento",
  "Liderazgo","Contactos y networking","Oportunidades internacionales","Oportunidades de investigar",
  "Formación / nuevas competencias","Acceso a becas o financiamiento","Equilibrio vida–trabajo","Otro"
];

const lessItems = [
  "Sobrecarga","Estrés constante","Estancamiento","Falta de propósito","Incertidumbre","Rutina",
  "Poco espacio para crecer","Procesos repetitivos que podrían automatizarse","Falta de reconocimiento",
  "Horarios poco compatibles con mi vida","Ambientes que me desgastan",
  "Sentir que estoy desaprovechando mis capacidades","Burocracia","Comparación constante","Otro"
];

const needs = [
  ["CLARIDAD","Necesito entender mejor qué quiero."],
  ["CAMBIO","Sé que algo ya no me funciona."],
  ["CRECIMIENTO","Quiero avanzar, aprender o asumir nuevos desafíos."],
  ["TRABAJO","Necesito encontrar una oportunidad laboral mejor o mi primer trabajo."],
  ["FORMACIÓN","Necesito desarrollar nuevas competencias o especializarme."],
  ["INTERNACIONAL","Quiero explorar estudios, becas u oportunidades fuera."],
  ["BIENESTAR","Necesito que mi vida y mi carrera convivan mejor."],
  ["EXPLORACIÓN","Todavía no sé qué necesito, pero quiero descubrirlo."]
];

const values = [
  "LIBERTAD","ESTABILIDAD","FAMILIA","CRECIMIENTO","DINERO","IMPACTO","APRENDIZAJE","CREATIVIDAD",
  "PROPÓSITO","AVENTURA","SEGURIDAD","LIDERAZGO","AUTONOMÍA","SERVICIO","TIEMPO","COMUNIDAD",
  "EXCELENCIA","BIENESTAR","FE","RECONOCIMIENTO"
];

const actions = [
  "Tener una conversación","Investigar una posibilidad","Actualizar mi CV o LinkedIn","Buscar oportunidades",
  "Investigar una formación/beca","Postular a algo","Pedir feedback","Probar algo nuevo","Otro"
];

let currentStep = Number(localStorage.getItem("qvb_current_step") || 1);
let state = JSON.parse(localStorage.getItem("qvb_guide_state") || "{}");

function persist(){
  localStorage.setItem("qvb_guide_state", JSON.stringify(state));
  localStorage.setItem("qvb_current_step", String(currentStep));
}

function buildNav(){
  const nav = document.getElementById("stepNav");
  nav.innerHTML = steps.map(s => `
    <button class="nav-step ${s.id===currentStep?'active':''}" data-step="${s.id}">
      <span class="nav-num">${String(s.id).padStart(2,'0')}</span>
      <span><small>${String(s.id).padStart(2,'0')}</small>${s.label}</span>
    </button>`).join("");
  nav.querySelectorAll("[data-step]").forEach(b=>b.addEventListener("click",()=>{saveVisible();currentStep=Number(b.dataset.step);persist();render()}));
}

function navButtons(){
  return `<div class="footer-nav">
    <button class="ghost-btn" id="prevBtn" ${currentStep===1?'disabled':''}>← Volver</button>
    <button class="primary-btn" id="nextBtn">${currentStep===5?'Finalizar':'Siguiente →'}</button>
  </div>`;
}

function render(){
  buildNav();
  document.getElementById("progressLabel").textContent = `${currentStep*20}%`;
  document.getElementById("progressBar").style.width = `${currentStep*20}%`;
  const tpl = document.getElementById(`step${currentStep}`);
  const container = document.getElementById("stepContainer");
  container.innerHTML = "";
  container.appendChild(tpl.content.cloneNode(true));
  document.querySelector(".main-panel").insertAdjacentHTML("beforeend",navButtons());

  if(currentStep===1) renderRatings();
  if(currentStep===2){renderChecks("moreOptions",moreItems,"more");renderChecks("lessOptions",lessItems,"less");}
  if(currentStep===3) renderNeeds();
  if(currentStep===4) renderValues();
  if(currentStep===5){renderChecks("actionOptions",actions,"actions");updateSummary();}

  hydrateInputs();
  bindSaveInputs();

  document.getElementById("prevBtn")?.addEventListener("click",()=>{saveVisible();currentStep=Math.max(1,currentStep-1);persist();render();});
  document.getElementById("nextBtn")?.addEventListener("click",()=>{saveVisible();if(currentStep<5){currentStep++;persist();render();}else{updateSummary();}});
  document.getElementById("copySummaryBtn")?.addEventListener("click",copySummary);
}

function renderRatings(){
  const el=document.getElementById("ratingTable");
  el.innerHTML = `<div class="rating-head"><div></div>${[1,2,3,4,5].map(n=>`<div>${n}</div>`).join("")}</div>` +
  ratingItems.map((item,i)=>`<div class="rating-row"><div>${item}</div>${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating_${i}" value="${n}" ${state[`rating_${i}`]==n?'checked':''}></label>`).join("")}</div>`).join("");
  ratingItems.forEach((_,i)=>document.querySelectorAll(`input[name="rating_${i}"]`).forEach(r=>r.addEventListener("change",e=>{state[`rating_${i}`]=Number(e.target.value);persist();})));
}

function renderChecks(id,items,key){
  const selected = new Set(state[key]||[]);
  document.getElementById(id).innerHTML = items.map(item=>`<label class="check-row"><input type="checkbox" data-check-group="${key}" value="${item}" ${selected.has(item)?'checked':''}><span>${item}</span></label>`).join("");
  document.querySelectorAll(`[data-check-group="${key}"]`).forEach(cb=>cb.addEventListener("change",()=>{
    state[key]=[...document.querySelectorAll(`[data-check-group="${key}"]:checked`)].map(x=>x.value);persist();
  }));
}

function renderNeeds(){
  const selected=new Set(state.needs||[]);
  const el=document.getElementById("needOptions");
  el.innerHTML = needs.map(([name,desc])=>`<label class="need-option"><input type="checkbox" data-need value="${name}" ${selected.has(name)?'checked':''}><strong>${name}</strong><span>${desc}</span></label>`).join("");
  el.querySelectorAll("[data-need]").forEach(cb=>cb.addEventListener("change",e=>{
    let checked=[...el.querySelectorAll("[data-need]:checked")];
    if(checked.length>2){e.target.checked=false; checked=[...el.querySelectorAll("[data-need]:checked")]; alert("Elige máximo 2 áreas.");}
    state.needs=checked.map(x=>x.value);persist();
  }));
}

function renderValues(){
  const selected=new Set(state.values||[]);
  const el=document.getElementById("valuesOptions");
  el.innerHTML=values.map(v=>`<button type="button" class="pill ${selected.has(v)?'selected':''}" data-value="${v}">${v}</button>`).join("");
  function refresh(){document.getElementById("valuesCounter").textContent=`${(state.values||[]).length} de 5 seleccionadas`;}
  refresh();
  el.querySelectorAll("[data-value]").forEach(btn=>btn.addEventListener("click",()=>{
    let arr=state.values||[];
    const v=btn.dataset.value;
    if(arr.includes(v)) arr=arr.filter(x=>x!==v);
    else if(arr.length<5) arr=[...arr,v];
    else {alert("Elige máximo 5 valores.");return;}
    state.values=arr;persist();renderValues();
  }));
}

function bindSaveInputs(){
  document.querySelectorAll("[data-save]").forEach(el=>{
    el.addEventListener("input",()=>{state[el.dataset.save]=el.value;persist();});
    el.addEventListener("change",()=>{state[el.dataset.save]=el.value;persist();});
  });
}

function hydrateInputs(){
  document.querySelectorAll("[data-save]").forEach(el=>{
    const v=state[el.dataset.save];
    if(v!==undefined) el.value=v;
  });
}

function saveVisible(){bindSaveInputs();persist();}

function updateSummary(){
  const el=document.getElementById("summaryText");
  if(!el) return;
  const need=(state.needs||[]).join(" + ") || "todavía por definir";
  const vals=(state.values||[]).join(", ") || "todavía por elegir";
  const next=state.step5_next || "todavía por escribir";
  el.innerHTML = `<strong>Tu foco:</strong> ${need}<br><strong>Lo que quieres priorizar:</strong> ${vals}<br><strong>Tu próximo paso:</strong> ${next}`;
}

async function copySummary(){
  const txt = `QVB — Mi resumen\nFoco: ${(state.needs||[]).join(" + ")||"por definir"}\nValores: ${(state.values||[]).join(", ")||"por elegir"}\nPróximo paso: ${state.step5_next||"por escribir"}`;
  try{await navigator.clipboard.writeText(txt);alert("Resumen copiado.");}catch{alert(txt);}
}

document.getElementById("saveBtn").addEventListener("click",()=>{persist();alert("Listo. Tu progreso quedó guardado en este dispositivo.");});
render();
