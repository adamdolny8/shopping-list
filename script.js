const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Získanie mena používateľa
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
    if (container) {
        container.innerHTML = tags.map(t => `<span class="tag" onclick="addQuick('${t}')">${t}</span>`).join("");
    }
}

async function addQuick(text) {
    document.getElementById("itemInput").value = text;
    addItem();
}

// OPRAVENÉ: Odstránené zdvojené "async"
async function loadItems() {
    const listEl = document.getElementById("list");
    const compListEl = document.getElementById("completedList");
    if (!listEl || !compListEl) return;

    listEl.innerHTML = ""; 
    compListEl.innerHTML = "";
    
    // Zvýraznenie aktívneho tlačidla zoznamu
    document.querySelectorAll('.list-selector button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${LIST_ID}`);
    if(activeBtn) {
        activeBtn.classList.add('active');
    }

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let total = 0;

    if (data && data.items) {
        // Zoradenie podľa kategórie
        data.items.sort((a,b) => a.category.localeCompare(b.category)).forEach(item => {
            const li = document.createElement("li");
            if (item.done) li.classList.add("done");

            li.innerHTML = `
                <div class="item-info">
                    <span>${item.text} ${item.price > 0 ? `(<b>${item.price}€</b>)` : ''}</span>
                    <div style="display:flex; gap:5px; align-items:center;">
                        <span class="category-label">${item.category}</span>
                        <span class="user-badge">${item.user || 'Hosť'}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleItem('${item.text.replace(/'/g, "\\'")}')">
                    <button class="delete-btn" onclick="deleteItem('${item.text.replace(/'/g, "\\'")}')">🗑️</button>
                </div>
            `;
            
            if (item.done) {
                compListEl.appendChild(li);
            } else {
                listEl.appendChild(li);
                if (item.price) total += parseFloat(item.price);
            }
        });
    }
    const totalDisplay = document.getElementById("totalPrice");
    if (totalDisplay) totalDisplay.textContent = total.toFixed(2) + " €";
    
    const divider = document.getElementById("divider");
    if (divider) divider.style.display = compListEl.children.length > 0 ? "block" : "none";
}

async function addItem() {
    const input = document.getElementById("itemInput");
    const priceInput = document.getElementById("priceInput");
    const categorySelect = document.getElementById("categorySelect");
    if (!input.value.trim()) return;

    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    let items = (data && data.items) ? data.items : [];
    
    items.push({
        text: input.value,
        price: priceInput.value ? parseFloat(priceInput.value.replace(',', '.')) : 0,
        category: categorySelect.value,
        done: false,
        user: userName
    });

    await _supabase.from("lists").upsert({ id: LIST_ID, items });
    input.value = ""; 
    priceInput.value = "";
    loadItems();
}

// Funkcia na prepínanie zoznamov
function switchList(id) {
    const url = new URL(window.location.href);
    url.searchParams.set('list', id);
    window.location.href = url.pathname + url.search;
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

_supabase.channel("any").on("postgres_changes", {event:"*", schema:"public", table:"lists"}, () => loadItems()).subscribe();