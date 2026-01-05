const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserName = localStorage.getItem("userName") || "Používateľ";
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "domov";
let history = JSON.parse(localStorage.getItem("itemHistory") || "{}");

// Pri načítaní
window.onload = () => {
    updateUI();
    loadItems();
    renderTabs();
};

function updateUI() {
    document.getElementById("welcomeText").innerText = `Ahoj, ${currentUserName} 👋`;
    renderSuggestions();
}

function changeName() {
    let n = prompt("Zadaj svoje meno:", currentUserName);
    if (n) { currentUserName = n; localStorage.setItem("userName", n); updateUI(); }
}

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