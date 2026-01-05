const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = localStorage.getItem("appLang") || "sk";
let currentUserName = localStorage.getItem("userName") || "Adam";
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "domov";
// Začíname len s domovom, ak nie je uložené inak
let myLists = JSON.parse(localStorage.getItem("myLists")) || ["domov"];

const translations = {
    sk: {
        welcome: "Ahoj", title: "Nákupný zoznam", items: "Položky", total: "Celková suma",
        frequent: "Často kupované", addBtn: "Pridať", toBuy: "Treba kúpiť", bought: "Kúpené",
        clearBtn: "Vymazať históriu nákupu", promptList: "Názov novej sekcie:", placeholder: "Názov položky...",
        categories: ["🥦 Potraviny", "🧴 Drogéria", "🏠 Domácnosť", "📦 Iné"]
    },
    en: {
        welcome: "Hello", title: "Shopping List", items: "Items", total: "Total Amount",
        frequent: "Frequently Bought", addBtn: "Add", toBuy: "To Buy", bought: "Bought",
        clearBtn: "Clear Purchase History", promptList: "New section name:", placeholder: "Item name...",
        categories: ["🥦 Groceries", "🧴 Drugstore", "🏠 Household", "📦 Other"]
    },
    es: {
        welcome: "Hola", title: "Lista de compras", items: "Artículos", total: "Suma total",
        frequent: "Comprado a menudo", addBtn: "Añadir", toBuy: "Por comprar", bought: "Comprado",
        clearBtn: "Borrar historial", promptList: "Nombre de la sección:", placeholder: "Nombre del artículo...",
        categories: ["🥦 Comida", "🧴 Farmacia", "🏠 Hogar", "📦 Otros"]
    },
    de: {
        welcome: "Hallo", title: "Einkaufsliste", items: "Artikel", total: "Gesamtbetrag",
        frequent: "Oft gekauft", addBtn: "Hinzufügen", toBuy: "Zu kaufen", bought: "Gekauft",
        clearBtn: "Verlauf löschen", promptList: "Bereichsname:", placeholder: "Artikelname...",
        categories: ["🥦 Lebensmittel", "🧴 Drogerie", "🏠 Haushalt", "📦 Sonstiges"]
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
    // Preklad hlavičky a štatistík
    document.getElementById("welcomeText").innerText = `${t.welcome}, ${currentUserName} 👋`;
    document.getElementById("txt-title").innerText = t.title;
    document.getElementById("txt-items").innerText = t.items;
    document.getElementById("txt-total").innerText = t.total;
    document.getElementById("txt-frequent").innerText = t.frequent;
    
    // Preklad formulára
    document.getElementById("itemInput").placeholder = t.placeholder;
    document.getElementById("txt-addBtn").innerText = t.addBtn;
    
    // Preklad sekcií zoznamu
    document.getElementById("txt-toBuy").innerText = t.toBuy;
    document.getElementById("txt-bought").innerText = t.bought;
    document.getElementById("txt-clearBtn").innerText = t.clearBtn;

    // Preklad kategórií v selecte
    const catSelect = document.getElementById("categorySelect");
    const currentVal = catSelect.value;
    catSelect.innerHTML = t.categories.map(c => `<option value="${c}">${c}</option>`).join("");
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("appLang", lang);
    applyLanguage();
    loadItems(); // Refresh položiek, aby sa prejavili zmeny (ak sú naviazané)
}

function renderTabs() {
    const container = document.getElementById("listTabs");
    container.innerHTML = "";
    
    myLists.forEach(t => {
        const btn = document.createElement("button");
        btn.className = LIST_ID === t ? "active" : "";
        btn.innerText = t.charAt(0).toUpperCase() + t.slice(1);
        btn.onclick = () => switchList(t);
        container.appendChild(btn);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "add-tab";
    addBtn.innerText = "+";
    addBtn.onclick = addNewList;
    container.appendChild(addBtn);
}

function switchList(id) {
    window.location.href = `?list=${encodeURIComponent(id)}`;
}

function addNewList() {
    let n = prompt(translations[currentLang].promptList);
    if (n && n.trim() !== "") {
        let slug = n.toLowerCase().trim();
        if (!myLists.includes(slug)) {
            myLists.push(slug);
            localStorage.setItem("myLists", JSON.stringify(myLists));
        }
        switchList(slug);
    }
}

// Ostatné funkcie pre prácu so Supabase (addItem, loadItems, atď.) sú v tomto kóde integrované
async function loadItems() {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const activeUl = document.getElementById("activeList");
    const doneUl = document.getElementById("completedList");
    activeUl.innerHTML = ""; doneUl.innerHTML = "";
    
    let total = 0;
    let items = data?.items || [];

    items.forEach(item => {
        const li = document.createElement("li");
        if (item.done) li.classList.add("done");
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
    const input = document.getElementById("itemInput");
    const priceInput = document.getElementById("priceInput");
    const text = input.value.trim();
    if (!text) return;

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data?.items || [];
    
    items.push({ 
        id: Date.now() + Math.random(), 
        text, 
        price: priceInput.value || 0, 
        category: document.getElementById("categorySelect").value, 
        done: false, 
        user: currentUserName 
    });

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    input.value = ""; priceInput.value = "";
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

async function clearDone() {
    if(!confirm(translations[currentLang].clearBtn + "?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.filter(i => !i.done);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}