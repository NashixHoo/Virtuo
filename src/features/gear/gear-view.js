// =============================================================
// VIRTUO — MEU EQUIPAMENTO (GEAR VIEW)
// src/features/gear/gear-view.js
// Interface de gestão e manutenção de equipamentos do músico
// Design System Canônico VIRTUO: #07101F, #0E1B35, #7EE7FF, #F5C542
// =============================================================

import { VirtuoGearService } from "./gear-service.js";
import { GEAR_CATEGORIES, COMMON_STRING_GAUGES, STANDARD_TUNINGS } from "./gear-schema.js";

export class GearView {
  constructor(containerId = "gear-view-container", options = {}) {
    this.containerId = containerId;
    this.userId = options.userId || "guest";
    this.currentCategoryFilter = "all";
    this.items = [];
    this.editingItem = null;
    this.isModalOpen = false;

    VirtuoGearService.subscribe((uid, updatedItems) => {
      if (uid === this.userId) {
        this.items = updatedItems;
        this.render();
      }
    });
  }

  async init() {
    this.items = await VirtuoGearService.getGearList(this.userId);
    this.render();
  }

  setCategoryFilter(category) {
    this.currentCategoryFilter = category;
    this.render();
  }

  openAddModal(itemToEdit = null) {
    this.editingItem = itemToEdit;
    this.isModalOpen = true;
    this.render();
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingItem = null;
    this.render();
  }

  async handleSaveForm(formData) {
    await VirtuoGearService.saveGearItem(this.userId, {
      id: this.editingItem?.id,
      ...formData
    });
    this.closeModal();
  }

  async handleDelete(itemId) {
    if (confirm("Deseja remover este equipamento do seu kit?")) {
      await VirtuoGearService.deleteGearItem(this.userId, itemId);
    }
  }

  render() {
    const container = typeof document !== "undefined" ? document.getElementById(this.containerId) : null;
    if (!container) return;

    const filteredItems = this.currentCategoryFilter === "all"
      ? this.items
      : this.items.filter(i => i.category === this.currentCategoryFilter);

    container.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-6 text-slate-100 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span class="text-amber-400">🎸</span> Meu Equipamento & Kit de Palco
            </h1>
            <p class="text-xs text-slate-400 mt-1">
              Organização de instrumentos, encordoamentos, afinações e periféricos para o ensaio e culto.
            </p>
          </div>
          <button id="btn-add-gear" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-lg shadow-sm transition-all">
            + Adicionar Equipamento
          </button>
        </div>

        <!-- Filtros por Categoria -->
        <div class="flex flex-wrap gap-2 pt-1">
          <button data-cat="all" class="gear-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all ${this.currentCategoryFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}">
            Todos (${this.items.length})
          </button>
          ${Object.values(GEAR_CATEGORIES).map(cat => {
            const count = this.items.filter(i => i.category === cat.id).length;
            const active = this.currentCategoryFilter === cat.id;
            return `
              <button data-cat="${cat.id}" class="gear-filter-btn px-3 py-1.5 text-xs font-medium rounded-md transition-all ${active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}">
                ${cat.icon} ${cat.label} (${count})
              </button>
            `;
          }).join('')}
        </div>

        <!-- Lista de Equipamentos -->
        ${filteredItems.length === 0 ? `
          <div class="text-center py-16 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div class="text-4xl mb-3">🎒</div>
            <h3 class="text-base font-semibold text-slate-300">Nenhum equipamento cadastrado</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Cadastre seu instrumento principal, cordas e pedaleira para manter o setup sempre calibrado.
            </p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${filteredItems.map(item => {
              const catMeta = Object.values(GEAR_CATEGORIES).find(c => c.id === item.category) || GEAR_CATEGORIES.INSTRUMENT;
              return `
                <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                        ${catMeta.icon} ${catMeta.label}
                      </span>
                      ${item.isActiveForMissions ? `
                        <span class="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                          Kit Ativo
                        </span>
                      ` : ''}
                    </div>

                    <h3 class="text-base font-semibold text-white mt-1">${item.name}</h3>
                    <p class="text-xs text-slate-400">
                      ${[item.brand, item.model].filter(Boolean).join(" • ") || "Sem marca/modelo especificado"}
                    </p>

                    ${item.stringsGauge ? `
                      <div class="text-xs text-slate-300 flex items-center gap-1.5 mt-2">
                        <span class="text-amber-400">🧵</span> Cordas: <span class="font-medium">${item.stringsGauge}</span>
                      </div>
                    ` : ''}

                    ${item.tuning ? `
                      <div class="text-xs text-slate-300 flex items-center gap-1.5">
                        <span class="text-cyan-400">🎵</span> Afinação: <span class="font-medium">${item.tuning}</span>
                      </div>
                    ` : ''}

                    ${item.notes ? `
                      <p class="text-xs text-slate-500 italic mt-2 line-clamp-2">${item.notes}</p>
                    ` : ''}
                  </div>

                  <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-800/60 mt-4">
                    <button data-edit-id="${item.id}" class="btn-edit-gear text-xs text-slate-400 hover:text-cyan-300 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700">
                      Editar
                    </button>
                    <button data-delete-id="${item.id}" class="btn-delete-gear text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60">
                      Excluir
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        <!-- Modal de Cadastro / Edição -->
        ${this.isModalOpen ? `
          <div id="gear-modal-overlay" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 class="text-base font-bold text-white">
                  ${this.editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}
                </h3>
                <button id="btn-close-modal" class="text-slate-400 hover:text-white text-lg">&times;</button>
              </div>

              <form id="gear-item-form" class="space-y-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Nome / Identificação *</label>
                  <input required name="name" value="${this.editingItem?.name || ''}" placeholder="Ex: Strato Sunburst Principal" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                    <select name="category" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                      ${Object.values(GEAR_CATEGORIES).map(c => `
                        <option value="${c.id}" ${this.editingItem?.category === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Marca</label>
                    <input name="brand" value="${this.editingItem?.brand || ''}" placeholder="Fender, Tagima, Boss..." class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Modelo</label>
                    <input name="model" value="${this.editingItem?.model || ''}" placeholder="Player Series, ME-80..." class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Calibre de Cordas</label>
                    <input name="stringsGauge" list="gauge-options" value="${this.editingItem?.stringsGauge || ''}" placeholder="0.010 - 0.046" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                    <datalist id="gauge-options">
                      ${COMMON_STRING_GAUGES.map(g => `<option value="${g}">`).join('')}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Afinação Habitual</label>
                  <select name="tuning" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                    ${STANDARD_TUNINGS.map(t => `
                      <option value="${t}" ${this.editingItem?.tuning === t ? 'selected' : ''}>${t}</option>
                    `).join('')}
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Observações Técnicas</label>
                  <textarea name="notes" rows="2" placeholder="Ex: Regulada em 08/2026. Bateria 9V trocada." class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none">${this.editingItem?.notes || ''}</textarea>
                </div>

                <div class="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="chk-active-mission" name="isActiveForMissions" ${this.editingItem?.isActiveForMissions !== false ? 'checked' : ''} class="rounded border-slate-700 text-cyan-500 focus:ring-0" />
                  <label for="chk-active-mission" class="text-xs text-slate-300">Equipamento ativo para ministração/missões pastorais</label>
                </div>

                <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                  <button type="button" id="btn-cancel-modal" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg">
                    Cancelar
                  </button>
                  <button type="submit" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold rounded-lg shadow-sm">
                    Salvar Equipamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this._bindEvents(container);
  }

  _bindEvents(container) {
    // Botão Adicionar
    const addBtn = container.querySelector("#btn-add-gear");
    if (addBtn) addBtn.onclick = () => this.openAddModal();

    // Filtros
    container.querySelectorAll(".gear-filter-btn").forEach(btn => {
      btn.onclick = () => {
        const cat = btn.getAttribute("data-cat");
        if (cat) this.setCategoryFilter(cat);
      };
    });

    // Edição
    container.querySelectorAll(".btn-edit-gear").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-edit-id");
        const item = this.items.find(i => i.id === id);
        if (item) this.openAddModal(item);
      };
    });

    // Exclusão
    container.querySelectorAll(".btn-delete-gear").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-delete-id");
        if (id) this.handleDelete(id);
      };
    });

    // Modal fechar
    const closeBtn = container.querySelector("#btn-close-modal");
    if (closeBtn) closeBtn.onclick = () => this.closeModal();

    const cancelBtn = container.querySelector("#btn-cancel-modal");
    if (cancelBtn) cancelBtn.onclick = () => this.closeModal();

    // Submit do formulário
    const form = container.querySelector("#gear-item-form");
    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: form.name.value,
          category: form.category.value,
          brand: form.brand.value,
          model: form.model.value,
          stringsGauge: form.stringsGauge.value,
          tuning: form.tuning.value,
          notes: form.notes.value,
          isActiveForMissions: form.isActiveForMissions.checked
        };
        this.handleSaveForm(data);
      };
    }
  }
}
