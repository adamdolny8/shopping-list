const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = localStorage.getItem("appLang") || "sk";
let currentUserName = localStorage.getItem("userName") || "Adam";
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "domov";
let myLists = JSON.parse(localStorage.getItem("myLists")) || ["domov"];
let itemHistory = JSON.parse(localStorage.getItem("itemHistory") || "{}");

const translations = {
    sk: {
        welcome: "Ahoj", title: "Shopping List", items: "Položky", total: "Celková suma",
        frequent: "Často kupované", addBtn: "Pridať", toBuy: "Treba kúpiť", bought: "Kúpené",
        clearBtn: "Vymazať históriu nákupu", promptList: "Názov novej sekcie:", placeholder: "Názov položky...",
        searchPlaceholder: "🔍 Vyhľadať v zozname...", promptName: "Zadaj svoje meno:",
        categories: ["🥦 Potraviny", "🧴 Drogéria", "🏠 Domácnosť", "📦 Iné"]
    },
    en: {
        welcome: "Hello", title: "Shopping List", items: "Items", total: "Total Amount",
        frequent: "Frequently Bought", addBtn: "Add", toBuy: "To Buy", bought: "Bought",
        clearBtn: "Clear Purchase History", promptList: "New section name:", placeholder: "Item name...",
        searchPlaceholder: "🔍 Search in list...", promptName: "Enter your name:",
        categories: ["🥦 Groceries", "🧴 Drugstore", "🏠 Household", "📦 Other"]
    },
    es: {
        welcome: "Hola", title: "Shopping List", items: "Artículos", total: "Suma total",
        frequent: "Frecuentes", addBtn: "Añadir", toBuy: "Por comprar", bought: "Comprado",
        clearBtn: "Borrar historial", promptList: "Nueva sección:", placeholder: "Nombre...",
        searchPlaceholder: "🔍 Buscar...", promptName: "Tu nombre:",
        categories: ["🥦 Comida", "🧴 Farmacia", "🏠 Hogar", "📦 Otros"]
    },
    de: {
        welcome: "Hallo", title: "Shopping List", items: "Artikel", total: "Gesamtbetrag",
        frequent: "Oft gekauft", addBtn: "Hinzufügen", toBuy: "Zu kaufen", bought: "Gekauft",
        clearBtn: "Verlauf löschen", promptList: "Neuer Bereich:", placeholder: "Artikel...",
        searchPlaceholder: "🔍 Suchen...", promptName: "Dein Name:",
        categories: ["🥦 Lebensmittel", "🧴 Drogerie", "🏠 Haushalt", "📦 Sonstiges"]
    }
};

window.onload = () => {
    document.getElementById("langSelect").value = currentLang;
    applyLanguage();
    renderTabs();
    loadItems();
    renderSuggestions();
};

function applyLanguage() {
    const t = translations[currentLang];
    document.getElementById("welcomeText").innerText = `${t.welcome}, ${currentUserName} 👋`;
    document.getElementById("txt-items").innerText = t.items;
    document.getElementById("txt-total").innerText = t.total;
    document.getElementById("txt-frequent").innerText = t.frequent;
    document.getElementById("itemInput").placeholder = t.placeholder;
    document.getElementById("searchInput").placeholder = t.searchPlaceholder;
    document.getElementById("txt-addBtn").innerText = t.addBtn;
    document.getElementById("txt-toBuy").innerText = t.toBuy;
    document.getElementById("txt-bought").innerText = t.bought;
    document.getElementById("txt-clearBtn").innerText = t.clearBtn;

    const catSelect = document.getElementById("categorySelect");
    catSelect.innerHTML = t.categories.map(c => `<option value="${c}">${c}</option>`).join("");
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("appLang", lang);
    applyLanguage();
}

function changeName() {
    let n = prompt(translations[currentLang].promptName, currentUserName);
    if (n) { currentUserName = n; localStorage.setItem("userName", n); applyLanguage(); }
}

function renderTabs() {
    const container = document.getElementById("listTabs");
    container.innerHTML = myLists.map(t => `
        <button class="${LIST_ID === t ? 'active' : ''}" onclick="switchList('${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
            ${t !== 'domov' ? `<span class="delete-tab-icon" onclick="removeList('${t}', event)">×</span>` : ''}
        </button>
    `).join("") + `<button onclick="addNewList()" class="add-tab">+</button>`;
}

function switchList(id) { window.location.href = `?list=${encodeURIComponent(id)}`; }

function addNewList() {
    let n = prompt(translations[currentLang].promptList);
    if (n && n.trim() !== "") {
        let slug = n.toLowerCase().trim();
        if (!myLists.includes(slug)) { myLists.push(slug); localStorage.setItem("myLists", JSON.stringify(myLists)); }
        switchList(slug);
    }
}

function removeList(id, event) {
    event.stopPropagation();
    if (confirm(translations[currentLang].clearBtn + "?")) {
        myLists = myLists.filter(t => t !== id);
        localStorage.setItem("myLists", JSON.stringify(myLists));
        LIST_ID === id ? switchList("domov") : renderTabs();
    }
}

async function loadItems() {
    const btn = document.getElementById("refreshBtn");
    btn.style.transform = "rotate(360deg)";
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const activeUl = document.getElementById("activeList");
    const doneUl = document.getElementById("completedList");
    activeUl.innerHTML = ""; doneUl.innerHTML = "";
    let total = 0;
    let items = data?.items || [];
    items.forEach(item => {
        const li = document.createElement("li");
        if (item.done) li.classList.add("done");
        li.innerHTML = `
            <div><strong>${item.text}</strong><br><span class="item-meta">${item.category} • ${item.user}</span></div>
            <div style="display:flex; align-items:center; gap:10px;">
                ${item.price > 0 ? `<span>${item.price}€</span>` : ''}
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${item.id}')">
                <button class="icon-btn" onclick="deleteItem('${item.id}')">🗑️</button>
            </div>`;
        item.done ? doneUl.appendChild(li) : (activeUl.appendChild(li), total += parseFloat(item.price || 0));
    });
    document.getElementById("itemCount").innerText = items.filter(i => !i.done).length;
    document.getElementById("totalPrice").innerText = total.toFixed(2) + " €";
    document.getElementById("completedSection").style.display = doneUl.children.length > 0 ? "block" : "none";
    setTimeout(() => btn.style.transform = "rotate(0deg)", 500);
}

async function addItem() {
    const input = document.getElementById("itemInput");
    const price = document.getElementById("priceInput");
    if (!input.value.trim()) return;
    itemHistory[input.value.trim()] = (itemHistory[input.value.trim()] || 0) + 1;
    localStorage.setItem("itemHistory", JSON.stringify(itemHistory));
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data?.items || [];
    items.push({ id: Date.now() + Math.random(), text: input.value.trim(), price: price.value || 0, category: document.getElementById("categorySelect").value, done: false, user: currentUserName });
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    input.value = ""; price.value = "";
    loadItems(); renderSuggestions();
}

function renderSuggestions() {
    const sorted = Object.entries(itemHistory).sort((a,b) => b[1]-a[1]).slice(0, 8);
    document.getElementById("smartSuggestions").innerHTML = sorted.map(([n]) => `<span class="tag" onclick="quickAdd('${n}')">${n}</span>`).join("");
}
function quickAdd(n) { document.getElementById("itemInput").value = n; addItem(); }

function filterItems() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll("li").forEach(li => li.style.display = li.querySelector("strong").innerText.toLowerCase().includes(q) ? "flex" : "none");
}

async function toggleItem(id) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.map(i => String(i.id) === String(id) ? {...i, done: !i.done} : i);
    await _supabase.from("lists").upsert({ id: LIST_ID, items }); loadItems();
}

async function deleteItem(id) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.filter(i => String(i.id) !== String(id));
    await _supabase.from("lists").upsert({ id: LIST_ID, items }); loadItems();
}

async function clearDone() {
    if(!confirm("OK?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    await _supabase.from("lists").upsert({ id: LIST_ID, items: data.items.filter(i => !i.done) }); loadItems();
}