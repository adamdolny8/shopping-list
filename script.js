const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let userName = localStorage.getItem("shopping_user") || prompt("Tvoje meno:") || "Hosť";
localStorage.setItem("shopping_user", userName);

const params = new URLSearchParams(window.location.search);
let LIST_ID = params.get("list") || "domov";

window.onload = () => {
    loadItems();
    renderQuickTags();
};

function renderQuickTags() {
    const tags = ["🥛 Mlieko", "🍞 Chlieb", "🥚 Vajcia", "🍎 Ovocie", "🧻 Toaleťák"];
    const container = document.getElementById("quickTags");
    container.innerHTML = tags.map(t => `<span class="tag" onclick="addQuick('${t}')">${t}</span>`).join("");
}

async function addQuick(text) {
    document.getElementById("itemInput").value = text;
    addItem();
}

async function loadItems() {
    const listEl = document.getElementById("list");
    const compListEl = document.getElementById("completedList");
    listEl.innerHTML = ""; compListEl.innerHTML = "";
    
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let total = 0;

    if (data && data.items) {
        data.items.sort((a,b) => a.category.localeCompare(b.category)).forEach(item => {
            const li = document.createElement("li");
            if (item.done) li.classList.add("done");

            li.innerHTML = `
                <div class="item-info">
                    <span>${item.text} ${item.price ? `(<b>${item.price}€</b>)` : ''}</span>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <span class="category-label">${item.category}</span>
                        <span class="user-badge">${item.user || 'unknwn'}</span>
                    </div>
                </div>
                <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${item.text}')">
                <button class="delete-btn" onclick="deleteItem('${item.text}')">🗑️</button>
            `;
            
            if (item.done) compListEl.appendChild(li);
            else {
                listEl.appendChild(li);
                if (item.price) total += parseFloat(item.price);
            }
        });
    }
    document.getElementById("totalPrice").textContent = total.toFixed(2) + " €";
    document.getElementById("divider").style.display = compListEl.children.length > 0 ? "block" : "none";
}

async function addItem() {
    const input = document.getElementById("itemInput");
    const priceInput = document.getElementById("priceInput");
    if (!input.value.trim()) return;

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const items = (data && data.items) ? data.items : [];
    
    items.push({
        text: input.value,
        price: priceInput.value || 0,
        category: document.getElementById("categorySelect").value,
        done: false,
        user: userName
    });

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    input.value = ""; priceInput.value = "";
    loadItems();
}

async function toggleItem(text) {
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const items = data.items.map(i => i.text === text ? {...i, done: !i.done} : i);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

async function deleteItem(text) {
    if (!confirm("Zmazať?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const items = data.items.filter(i => i.text !== text);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

async function clearDone() {
    if (!confirm("Vymazať všetky kúpené položky?")) return;
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    const items = data.items.filter(i => !i.done);
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    loadItems();
}

function switchList(id) {
    window.location.href = window.location.origin + window.location.pathname + "?list=" + id;
}

_supabase.channel("any").on("postgres_changes", {event:"*", schema:"public", table:"lists"}, () => loadItems()).subscribe();