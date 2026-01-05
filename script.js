const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentLang = localStorage.getItem("appLang") || "sk";
let currentUserName = localStorage.getItem("userName"); 
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "domov";
let myLists = JSON.parse(localStorage.getItem("myLists")) || ["domov"];
let itemHistory = JSON.parse(localStorage.getItem("itemHistory") || "{}");

const translations = {
    sk: {
        welcome: "Ahoj", title: "Nákupný zoznam", items: "Položky", total: "Celková suma",
        frequent: "Často kupované", addBtn: "Pridať", toBuy: "Treba kúpiť", bought: "Kúpené",
        clearBtn: "Vymazať históriu nákupu", promptList: "Názov novej sekcie:", placeholder: "Názov položky...",
        searchPlaceholder: "🔍 Vyhľadať...", promptName: "Ako sa voláš?",
        categories: ["🥦 Potraviny", "🧴 Drogéria", "🏠 Domácnosť", "📦 Iné"]
    },
    en: {
        welcome: "Hello", title: "Shopping List", items: "Items", total: "Total Amount",
        frequent: "Frequently Bought", addBtn: "Add", toBuy: "To Buy", bought: "Bought",
        clearBtn: "Clear Purchase History", promptList: "New section name:", placeholder: "Item name...",
        searchPlaceholder: "🔍 Search...", promptName: "What is your name?",
        categories: ["🥦 Groceries", "🧴 Drugstore", "🏠 Household", "📦 Other"]
    },
    es: {
        welcome: "Hola", title: "Lista de compras", items: "Artículos", total: "Suma total",
        frequent: "Frecuentes", addBtn: "Añadir", toBuy: "Por comprar", bought: "Comprado",
        clearBtn: "Borrar historial", promptList: "Nueva sección:", placeholder: "Nombre...",
        searchPlaceholder: "🔍 Buscar...", promptName: "Tu nombre:",
        categories: ["🥦 Comida", "🧴 Farmacia", "🏠 Hogar", "📦 Otros"]
    },
    de: {
        welcome: "Hallo", title: "Einkaufsliste", items: "Artikel", total: "Gesamtbetrag",
        frequent: "Oft gekauft", addBtn: "Hinzufügen", toBuy: "Zu kaufen", bought: "Gekauft",
        clearBtn: "Verlauf löschen", promptList: "Neuer Bereich:", placeholder: "Artikel...",
        searchPlaceholder: "🔍 Suchen...", promptName: "Dein Name:",
        categories: ["🥦 Lebensmittel", "🧴 Drogerie", "🏠 Haushalt", "📦 Sonstiges"]
    }
};

window.onload = () => {
    if (!currentUserName) {
        changeName();
    }
    document.getElementById("langSelect").value = currentLang;
    applyLanguage();
    renderTabs();
    loadItems();
    renderSuggestions();
};

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("appLang", lang);
    applyLanguage();
    renderTabs();
    renderSuggestions();
    loadItems();
}

function applyLanguage() {
    const t = translations[currentLang] || translations.sk;
    
    if(document.getElementById("welcomeText")) 
        document.getElementById("welcomeText").innerText = `${t.welcome}, ${currentUserName || '...'} 👋`;
    
    if(document.getElementById("txt-title")) document.getElementById("txt-title").innerText = t.title;
    if(document.getElementById("txt-items")) document.getElementById("txt-items").innerText = t.items;
    if(document.getElementById("txt-total")) document.getElementById("txt-total").innerText = t.total;
    if(document.getElementById("txt-frequent")) document.getElementById("txt-frequent").innerText = t.frequent;
    
    if(document.getElementById("itemInput")) document.getElementById("itemInput").placeholder = t.placeholder;
    if(document.getElementById("searchInput")) document.getElementById("searchInput").placeholder = t.searchPlaceholder;
    if(document.getElementById("txt-addBtn")) document.getElementById("txt-addBtn").innerText = t.addBtn;
    
    if(document.getElementById("txt-toBuy")) document.getElementById("txt-toBuy").innerText = t.toBuy;
    if(document.getElementById("txt-bought")) document.getElementById("txt-bought").innerText = t.bought;
    if(document.getElementById("txt-clearBtn")) document.getElementById("txt-clearBtn").innerText = t.clearBtn;

    const catSelect = document.getElementById("categorySelect");
    if(catSelect) {
        catSelect.innerHTML = t.categories.map(c => `<option value="${c}">${c}</option>`).join("");
    }
}

function changeName() {
    const t = translations[currentLang] || translations.sk;
    let n = prompt(t.promptName, currentUserName || "");
    if (n && n.trim() !== "") {
        currentUserName = n.trim();
        localStorage.setItem("userName", currentUserName);
        applyLanguage();
    }
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
    const t = translations[currentLang] || translations.sk;
    let n = prompt(t.promptList);
    if (n && n.trim() !== "") {
        let slug = n.toLowerCase().trim();
        if (!myLists.includes(slug)) {
            myLists.push(slug);
            localStorage.setItem("myLists", JSON.stringify(myLists));
        }
        switchList(slug);
    }
}

function removeList(id, event) {
    event.stopPropagation();
    if (confirm("Odstrániť sekciu?")) {
        myLists = myLists.filter(t => t !== id);
        localStorage.setItem("myLists", JSON.stringify(myLists));
        LIST_ID === id ? switchList("domov") : renderTabs();
    }
}

async function loadItems() {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const activeUl = document.getElementById("activeList");
    const doneUl = document.getElementById("completedList");
    activeUl.innerHTML = ""; doneUl.innerHTML = "";
    
    let total = 0;
    let items = data?.items || [];

    items.forEach((item, index) => {
        const li = document.createElement("li");
        if (item.done) li.classList.add("done");
        
        li.innerHTML = `
            <div class="item-main">
                <div class="move-controls">
                    <button class="move-btn" onclick="moveItem(${index}, -1)">▲</button>
                    <button class="move-btn" onclick="moveItem(${index}, 1)">▼</button>
                </div>
                <div>
                    <strong>${item.text}</strong><br>
                    <span class="item-meta">${item.category} • ${item.user}</span>
                </div>
            </div>
            <div class="item-actions">
                ${item.price > 0 ? `<span class="price-tag">${item.price}€</span>` : ''}
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${item.id}')">
                <button class="icon-btn" onclick="deleteItem('${item.id}')">🗑️</button>
            </div>
        `;
        item.done ? doneUl.appendChild(li) : (activeUl.appendChild(li), total += parseFloat(item.price || 0));
    });

    document.getElementById("itemCount").innerText = items.filter(i => !i.done).length;
    document.getElementById("totalPrice").innerText = total.toFixed(2) + " €";
    document.getElementById("completedSection").style.display = doneUl.children.length > 0 ? "block" : "none";
}

async function moveItem(index, direction) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items;
    let newIndex = index + direction;
    
    if (newIndex >= 0 && newIndex < items.length) {
        const temp = items[index];
        items[index] = items[newIndex];
        items[newIndex] = temp;
        await _supabase.from("lists").upsert({ id: LIST_ID, items });
        loadItems();
    }
}

function filterItems() {
    const q = document.getElementById("searchInput").value.toLowerCase();
    document.querySelectorAll("li").forEach(li => {
        const text = li.querySelector("strong").innerText.toLowerCase();
        li.style.display = text.includes(q) ? "flex" : "none";
    });
}

async function addItem() {
    const input = document.getElementById("itemInput");
    const price = document.getElementById("priceInput");
    if (!input.value.trim()) return;

    itemHistory[input.value.trim()] = (itemHistory[input.value.trim()] || 0) + 1;
    localStorage.setItem("itemHistory", JSON.stringify(itemHistory));

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data?.items || [];
    
    items.push({ 
        id: Date.now() + Math.random(), 
        text: input.value.trim(), 
        price: price.value || 0, 
        category: document.getElementById("categorySelect").value, 
        done: false, 
        user: currentUserName 
    });

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    input.value = ""; price.value = "";
    loadItems(); renderSuggestions();
}

function renderSuggestions() {
    const sorted = Object.entries(itemHistory).sort((a,b) => b[1]-a[1]).slice(0, 8);
    document.getElementById("smartSuggestions").innerHTML = sorted.map(([n]) => 
        `<span class="tag" onclick="quickAdd('${n}')">${n}</span>`
    ).join("");
}

function quickAdd(n) { document.getElementById("itemInput").value = n; addItem(); }

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
    if(!confirm("Vymazať kúpené?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    await _supabase.from("lists").upsert({ id: LIST_ID, items: data.items.filter(i => !i.done) }); loadItems();
}