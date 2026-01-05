const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUserName = localStorage.getItem("userName") || "User";
let LIST_ID = new URLSearchParams(window.location.search).get("list") || "home";
let history = JSON.parse(localStorage.getItem("itemHistory") || "{}");

window.onload = () => {
    updateUI();
    loadItems();
    renderTabs();
};

function updateUI() {
    document.getElementById("welcomeText").innerText = `Hello, ${currentUserName} 👋`;
    renderSuggestions();
}

function changeName() {
    let newName = prompt("Zadaj svoje meno:", currentUserName);
    if (newName) {
        currentUserName = newName;
        localStorage.setItem("userName", newName);
        updateUI();
    }
}

async function renderTabs() {
    const tabs = ["home", "car", "work"]; // Základné listy
    const container = document.getElementById("listTabs");
    container.innerHTML = tabs.map(t => `
        <button class="${LIST_ID === t ? 'active' : ''}" onclick="switchList('${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
    `).join("") + '<button onclick="addNewList()" class="add-tab">+</button>';
}

function renderSuggestions() {
    const sorted = Object.entries(history).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById("smartSuggestions");
    container.innerHTML = sorted.map(([name]) => `<span class="tag" onclick="quickAdd('${name}')">${name}</span>`).join("");
}

async function loadItems() {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const activeUl = document.getElementById("activeList");
    const doneUl = document.getElementById("completedList");
    activeUl.innerHTML = ""; doneUl.innerHTML = "";
    
    let total = 0;
    let items = data?.items || [];

    items.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `
            <div>
                <strong>${item.text}</strong><br>
                <span class="item-meta">${item.category} • ${item.user}</span>
            </div>
            <div>
                ${item.price > 0 ? `<span>${item.price}€</span>` : ''}
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${item.text}')">
            </div>
        `;
        
        if (item.done) {
            li.classList.add("done");
            doneUl.appendChild(li);
        } else {
            activeUl.appendChild(li);
            total += parseFloat(item.price || 0);
        }
    });

    document.getElementById("itemCount").innerText = items.filter(i => !i.done).length;
    document.getElementById("totalPrice").innerText = total.toFixed(2) + " €";
    document.getElementById("completedSection").style.display = doneUl.children.length > 0 ? "block" : "none";
}

async function addItem() {
    const text = document.getElementById("itemInput").value;
    const price = document.getElementById("priceInput").value || 0;
    if (!text) return;

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data?.items || [];
    
    items.push({ text, price, category: document.getElementById("categorySelect").value, done: false, user: currentUserName });
    
    // Uloženie do histórie pre Smart Quick Add
    history[text] = (history[text] || 0) + 1;
    localStorage.setItem("itemHistory", JSON.stringify(history));

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    document.getElementById("itemInput").value = "";
    loadItems();
}

function quickAdd(name) {
    document.getElementById("itemInput").value = name;
    addItem();
}

async function toggleItem(text) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.map(i => i.text === text ? {...i, done: !i.done} : i);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

function switchList(id) {
    window.location.href = `?list=${id}`;
}

async function clearDone() {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = data.items.filter(i => !i.done);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

function addNewList() {
    let name = prompt("Názov nového zoznamu:");
    if (name) switchList(name.toLowerCase());
}