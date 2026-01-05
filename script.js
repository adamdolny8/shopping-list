const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = localStorage.getItem("appLang") || "sk";
let currentUserName = localStorage.getItem("userName") || "User";
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "domov";
let myLists = JSON.parse(localStorage.getItem("myLists")) || ["domov", "auto", "práca"];

const translations = {
    sk: {
        welcome: "Ahoj", title: "Nákupný zoznam", items: "Položky", total: "Celková suma",
        frequent: "Často kupované", addBtn: "Pridať", toBuy: "Treba kúpiť", bought: "Kúpené",
        clearBtn: "Vymazať históriu", promptName: "Zadaj meno:", promptList: "Názov novej sekcie:",
        categories: ["🥦 Potraviny", "🧴 Drogéria", "🏠 Domácnosť", "📦 Iné"]
    },
    en: {
        welcome: "Hello", title: "Shopping List", items: "Items", total: "Total Price",
        frequent: "Frequently Bought", addBtn: "Add", toBuy: "To Buy", bought: "Bought",
        clearBtn: "Clear History", promptName: "Enter name:", promptList: "New section name:",
        categories: ["🥦 Groceries", "🧴 Drugstore", "🏠 Household", "📦 Other"]
    },
    es: {
        welcome: "Hola", title: "Lista de compras", items: "Artículos", total: "Precio total",
        frequent: "Comprado con frecuencia", addBtn: "Añadir", toBuy: "Para comprar", bought: "Comprado",
        clearBtn: "Borrar historial", promptName: "Nombre:", promptList: "Nueva sección:",
        categories: ["🥦 Comida", "🧴 Farmacia", "🏠 Hogar", "📦 Otros"]
    },
    de: {
        welcome: "Hallo", title: "Einkaufsliste", items: "Artikel", total: "Gesamtpreis",
        frequent: "Oft gekauft", addBtn: "Hinzufügen", toBuy: "Zu kaufen", bought: "Gekauft",
        clearBtn: "Verlauf löschen", promptName: "Name eingeben:", promptList: "Neuer Bereich:",
        categories: ["🥦 Lebensmittel", "🧴 Drogerie", "🏠 Haushalt", "📦 Anderes"]
    }
};

window.onload = () => {
    document.getElementById("langSelect").value = currentLang;
    applyLanguage();
    renderTabs();
    loadItems();
};

function applyLanguage() {
    const t = translations[currentLang];
    document.getElementById("welcomeText").innerText = `${t.welcome}, ${currentUserName} 👋`;
    document.getElementById("txt-title").innerText = t.title;
    document.getElementById("txt-items").innerText = t.items;
    document.getElementById("txt-total").innerText = t.total;
    document.getElementById("txt-frequent").innerText = t.frequent;
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

function renderTabs() {
    const container = document.getElementById("listTabs");
    container.innerHTML = myLists.map(t => `
        <button class="${LIST_ID === t ? 'active' : ''}" onclick="switchList('${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
    `).join("") + `<button onclick="addNewList()" class="add-tab">+</button>`;
}

function switchList(id) {
    window.location.href = `?list=${encodeURIComponent(id)}`;
}

function addNewList() {
    let n = prompt(translations[currentLang].promptList);
    if (n) {
        let slug = n.toLowerCase().trim();
        if (!myLists.includes(slug)) {
            myLists.push(slug);
            localStorage.setItem("myLists", JSON.stringify(myLists));
        }
        switchList(slug);
    }
}

// Ostatné funkcie (loadItems, addItem, toggleItem, deleteItem) ostávajú rovnaké ako v predošlej verzii
// ... (pri addItem a loadItems sa uisti, že používaš premennú LIST_ID)

// SMART REFRESH
async function loadItems() {
    const btn = document.querySelector('.header-main .icon-btn');
    btn.style.transform = "rotate(360deg)";
    setTimeout(() => btn.style.transform = "rotate(0deg)", 500);

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const activeUl = document.getElementById("activeList");
    const doneUl = document.getElementById("completedList");
    activeUl.innerHTML = ""; doneUl.innerHTML = "";
    
    let total = 0;
    let items = data?.items || [];

    items.forEach(item => {
        const li = document.createElement("li");
        if (item.done) li.classList.add("done");
        
        // Používame unikátne ID (timestamp) pre manipuláciu
        const itemId = item.id || Date.now() + Math.random();

        li.innerHTML = `
            <div>
                <strong>${item.text}</strong><br>
                <span class="item-meta">${item.category} • ${item.user}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                ${item.price > 0 ? `<span>${item.price}€</span>` : ''}
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${itemId}')">
                <button class="icon-btn" onclick="deleteItem('${itemId}')">🗑️</button>
            </div>
        `;
        
        if (item.done) doneUl.appendChild(li);
        else {
            activeUl.appendChild(li);
            total += parseFloat(item.price || 0);
        }
    });

    document.getElementById("itemCount").innerText = items.filter(i => !i.done).length;
    document.getElementById("totalPrice").innerText = total.toFixed(2) + " €";
    document.getElementById("completedSection").style.display = doneUl.children.length > 0 ? "block" : "none";
}

async function addItem() {
    const text = document.getElementById("itemInput").value.trim();
    const price = document.getElementById("priceInput").value || 0;
    if (!text) return;

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data?.items || [];
    
    // Každá položka dostane unikátne ID
    items.push({ 
        id: Date.now() + Math.random(), 
        text, 
        price, 
        category: document.getElementById("categorySelect").value, 
        done: false, 
        user: currentUserName 
    });
    
    // Aktualizácia histórie pre Smart Quick Add
    history[text.toLowerCase()] = (history[text.toLowerCase()] || 0) + 1;
    localStorage.setItem("itemHistory", JSON.stringify(history));

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    document.getElementById("itemInput").value = "";
    document.getElementById("priceInput").value = "";
    loadItems();
}

async function toggleItem(id) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.map(i => String(i.id) === String(id) ? {...i, done: !i.done} : i);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

async function deleteItem(id) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.filter(i => String(i.id) !== String(id));
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

function renderSuggestions() {
    const sorted = Object.entries(history).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById("smartSuggestions");
    container.innerHTML = sorted.map(([name]) => `<span class="tag" onclick="quickAdd('${name}')">${name}</span>`).join("");
}

function quickAdd(name) {
    document.getElementById("itemInput").value = name;
    addItem();
}

function renderTabs() {
    const tabs = ["domov", "auto", "práca"]; 
    const container = document.getElementById("listTabs");
    container.innerHTML = tabs.map(t => `
        <button class="${LIST_ID === t ? 'active' : ''}" onclick="switchList('${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
    `).join("") + '<button onclick="addNewList()" class="add-tab">+</button>';
}

function switchList(id) { window.location.href = `?list=${id}`; }

function addNewList() {
    let n = prompt("Názov nového zoznamu:");
    if (n) switchList(n.toLowerCase().trim());
}

async function clearDone() {
    if(!confirm("Vymazať všetky kúpené položky?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.filter(i => !i.done);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}