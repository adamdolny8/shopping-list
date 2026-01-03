const SUPABASE_URL = "https://tkgxqdrzqpawbyfjlfnm.supabase.co";
const SUPABASE_KEY = "sb_publishable_OKve-4fG_2d0yXhWa0UgGA_Lhq_OzOz";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const list = document.getElementById("list");
const completedList = document.getElementById("completedList");
const divider = document.getElementById("divider");
const input = document.getElementById("itemInput");
const categorySelect = document.getElementById("categorySelect");

const params = new URLSearchParams(window.location.search);
const LIST_ID = params.get("list") || "default";

window.onload = loadItems;

input.addEventListener("keypress", (e) => { if (e.key === "Enter") addItem(); });

async function loadItems() {
    list.innerHTML = "";
    completedList.innerHTML = "";
    const { data } = await _supabase.from('lists').select('items').eq('id', LIST_ID).single();
    if (data && data.items) {
        data.items.forEach(item => addItemToList(item));
        updateDivider();
    }
}

async function addItem() {
    if (input.value.trim() === "") return;
    const newItem = { 
        text: input.value, 
        done: false, 
        category: categorySelect.value 
    };
    addItemToList(newItem);
    input.value = "";
    await saveCurrentList();
}

function addItemToList(item) {
    const li = document.createElement("li");
    if (item.done) li.classList.add("done");

    const info = document.createElement("div");
    info.className = "item-info";
    const span = document.createElement("span");
    span.textContent = item.text;
    const cat = document.createElement("div");
    cat.className = "category-label";
    cat.textContent = item.category;
    info.appendChild(span);
    info.appendChild(cat);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.alignItems = "center";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.onchange = async () => {
        item.done = checkbox.checked;
        await saveCurrentList();
        loadItems();
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = async () => {
        if (confirm(`Zmazať "${item.text}"?`)) {
            li.remove();
            await saveCurrentList();
            updateDivider();
        }
    };

    actions.appendChild(checkbox);
    actions.appendChild(deleteBtn);
    li.appendChild(info);
    li.appendChild(actions);

    if (item.done) completedList.appendChild(li);
    else list.appendChild(li);
    updateDivider();
}

function updateDivider() {
    divider.style.display = completedList.children.length > 0 ? "block" : "none";
}

async function saveCurrentList() {
    const items = [];
    document.querySelectorAll("li").forEach(li => {
        items.push({
            text: li.querySelector("span").textContent,
            category: li.querySelector(".category-label").textContent,
            done: li.querySelector("input[type='checkbox']").checked
        });
    });
    await _supabase.from("lists").upsert({ id: LIST_ID, items });
}

function shareList() {
    const url = window.location.origin + window.location.pathname + "?list=" + LIST_ID;
    navigator.clipboard.writeText(url).then(() => alert("Odkaz skopírovaný!"));
}

_supabase.channel("lists-realtime").on("postgres_changes", 
    { event: "*", schema: "public", table: "lists", filter: `id=eq.${LIST_ID}` },
    () => loadItems()
).subscribe();
// Registrácia Service Workera pre PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("Service Worker registrovaný!"))
      .catch(err => console.log("SW registrácia zlyhala:", err));
  });
}