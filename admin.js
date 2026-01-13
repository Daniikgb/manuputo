/**
 * Aranduka Admin Panel Logic - Premium Edition
 * Handles Dashboard, Inventory, and User Management with Full Features
 */

// Load books from LS or initialize empty (relies on main.js having seeded LS previously)
let books = JSON.parse(localStorage.getItem('aranduka_books')) || [];

// Category Map for Dropdown
const CATEGORIES = {
    "inicial": "Educación Inicial",
    "matematica": "Matemática",
    "comunicacion": "Comunicación (1-3)",
    "lengua-castellana": "Lengua Castellana (7-9, NM)",
    "guarani": "Guaraní (1-6)",
    "lengua-guarani": "Lengua Guaraní (7-9, NM)",
    "vida-social": "Vida Social / Mis Lecciones",
    "ciencias-naturales": "Ciencias Naturales",
    "ciencias-sociales": "Ciencias Sociales",
    "ciencias-de-la-naturaleza-y-salud": "Ciencias de la Naturaleza (7-9)",
    "historia": "Historia y Geografía",
    "etica": "Formación Ética y Ciudadana",
    "trabajo-tecnologia": "Trabajo y Tecnología",
    "fisica": "Física",
    "quimica": "Química",
    "filosofia": "Filosofía",
    "sociologia": "Sociología",
    "politica": "Política",
    "caligrafia": "Caligrafía",
    "formacion-docente": "Formación Docente"
};

const AdminPageController = {
    init: function () {
        if (!document.getElementById('sidebar')) return;

        // Auth Check
        if (!sessionStorage.getItem('aranduka_admin_user')) {
            window.location.href = 'index.html';
            return;
        }

        this.renderDashboard();
        this.bindPageEvents();
        this.animateEntry();
    },

    bindPageEvents: function () {
        // Logout
        document.getElementById('adminLogoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar Sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#0e7490',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, salir'
            }).then((result) => {
                if (result.isConfirmed) {
                    sessionStorage.removeItem('aranduka_admin_user');
                    window.location.href = 'index.html';
                }
            });
        });

        // Search
        document.getElementById('adminSearchInput')?.addEventListener('input', (e) => {
            this.renderInventory(e.target.value);
        });

        // Navigation
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = ['dashboard-view', 'inventory', 'users', 'orders', 'downloads', 'essays'];

        const showSection = (targetId) => {
            sections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            const target = document.getElementById(targetId);
            if (target) {
                target.style.display = 'block';
                if (targetId === 'dashboard-view') this.animateEntry();
            }
        };

        showSection('dashboard-view');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    const targetId = href.substring(1);
                    const finalId = targetId === 'dashboard' ? 'dashboard-view' : targetId;
                    showSection(finalId);
                }
            });
        });
    },

    animateEntry: function () {
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 * index);
        });
    },

    // =========================================
    // DASHBOARD & STATS
    // =========================================
    renderDashboard: function () {
        const totalBooks = books.length;
        const users = JSON.parse(localStorage.getItem('aranduka_users')) || [];
        const orders = JSON.parse(localStorage.getItem('aranduka_order_history') || '[]');

        if (document.getElementById('total-books')) this.animateValue("total-books", 0, totalBooks, 1000);
        if (document.getElementById('total-users')) this.animateValue("total-users", 0, users.length, 1200);
        if (document.getElementById('pending-requests')) this.animateValue("pending-requests", 0, orders.length, 800);

        this.renderInventory();
        this.renderUsers();
        this.renderOrders();
        this.renderDownloads();
        this.renderEssays();
    },

    animateValue: function (id, start, end, duration) {
        if (start === end) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = end;
            return;
        }
        var range = end - start;
        var current = start;
        var increment = end > start ? 1 : -1;
        var stepTime = Math.abs(Math.floor(duration / range));
        var obj = document.getElementById(id);
        if (!obj) return;

        var timer = setInterval(function () {
            current += increment;
            obj.innerHTML = current;
            if (current == end) {
                clearInterval(timer);
            }
        }, stepTime);
    },

    // =========================================
    // INVENTORY MANAGEMENT (THE CORE UPGRADE)
    // =========================================
    renderInventory: function (filter = '') {
        const tbody = document.getElementById('admin-books-table-body');
        if (!tbody) return;

        const normalize = (str) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const term = normalize(filter);

        // Sort by ID desc (newest first)
        const sortedBooks = [...books].sort((a, b) => b.id - a.id);

        const filteredBooks = sortedBooks.filter(b =>
            !term ||
            normalize(b.title).includes(term) ||
            normalize(b.author).includes(term) ||
            normalize(JSON.stringify(b.category)).includes(term)
        );

        if (filteredBooks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">No se encontraron resultados</td></tr>';
            return;
        }

        tbody.innerHTML = filteredBooks.map(book => {
            // Indicators for extra data
            const hasPlans = book.planAnual || book.planDiario;
            const hasProjects = book.projects && book.projects.length > 0;
            const catLabel = Array.isArray(book.category) ?
                book.category.map(c => CATEGORIES[c] || c).join(', ') :
                (CATEGORIES[book.category] || book.category);

            // UPDATED BUTTONS AS REQUESTED - GIANT MODE via CSS Classes
            return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${book.image || book.cover || 'img/portadas/default_cover.png'}" 
                             class="me-3 shadow-sm rounded" 
                             alt="${book.title}"
                             style="object-fit:cover; width:60px; height:85px; margin-right: 15px;">
                        <div>
                            <h6 class="mb-0 text-dark fw-bold" style="font-size: 0.9rem;">${book.title}</h6>
                            <span class="text-muted small">${book.author || 'Autor Desconocido'}</span>
                            <div class="mt-1 d-flex gap-1">
                                ${hasPlans ? '<span class="badge badge-success" title="Tiene Planes" style="font-size:0.65rem; padding:2px 6px;">PLANES</span>' : ''}
                                ${hasProjects ? '<span class="badge badge-info" title="Tiene Proyectos" style="font-size:0.65rem; padding:2px 6px;">PROY</span>' : ''}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                     <span class="badge badge-custom badge-slate text-wrap" style="max-width: 150px; text-align:left;">${catLabel}</span>
                </td>
                <td class="text-center">
                    <span class="font-weight-bold text-xs text-muted">${book.level || 'N/A'}</span>
                </td>
                <td class="text-center">
                    <!-- BOTÓN EDITAR (AZUL) GRANDE CUADRADO -->
                    <button class="btn-giant-blue" title="Editar Completo" onclick="AdminPageController.editBook(${book.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <!-- BOTÓN ELIMINAR (ROJO) GRANDE CUADRADO -->
                    <button class="btn-giant-red" title="Eliminar" onclick="AdminPageController.deleteBook(${book.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
    },

    // HELPER: Generate Rich HTML Form for SweetAlert (REDESIGNED)
    getBookFormHtml: function (book = {}) {
        const isEdit = !!book.id;
        const title = book.title || '';
        const author = book.author || 'Equipo Aranduka';
        const level = book.level || '';
        const image = book.image || book.cover || '';
        const subtitle = book.subtitle || '';
        const description = book.description || '';
        const planAnual = book.planAnual || '';
        const planDiario = book.planDiario || '';

        // Category Select Options
        let catOptions = `<option value="" disabled ${!book.category ? 'selected' : ''}>Selecciona Categoría</option>`;
        for (const [key, label] of Object.entries(CATEGORIES)) {
            const isSelected = book.category === key || (Array.isArray(book.category) && book.category.includes(key));
            catOptions += `<option value="${key}" ${isSelected ? 'selected' : ''}>${label}</option>`;
        }

        // Projects Table Rows
        let projectsHtml = '';
        if (book.projects && book.projects.length > 0) {
            book.projects.forEach((p, idx) => {
                projectsHtml += `
                    <div class="project-row d-flex gap-2 mb-2 align-items-center" id="proj-row-${idx}">
                        <div class="flex-grow-1" style="flex:1;">
                             <input type="text" class="form-control-custom proj-name" placeholder="Nombre Proyecto" value="${p.name}" style="padding:0.4rem;">
                        </div>
                        <div class="flex-grow-1" style="flex:1;">
                             <input type="text" class="form-control-custom proj-file" placeholder="Link/Archivo" value="${p.file}" style="padding:0.4rem;">
                        </div>
                        <button type="button" class="btn btn-action text-danger p-1" onclick="this.parentElement.remove()" title="Eliminar Proyecto"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            });
        }

        return `
            <style>
                .admin-form-container {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    background: #f8fafc;
                    padding: 0.5rem;
                    text-align: left;
                }
                .form-section-title {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--primary);
                    font-weight: 700;
                    margin-bottom: 1rem;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 0.5rem;
                    margin-top: 0.5rem;
                }
                .form-label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    margin-bottom: 0.3rem;
                    display: block;
                }
                .form-control-custom {
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 0.6rem 0.8rem;
                    width: 100%;
                    font-size: 0.9rem;
                    transition: 0.2s;
                    background: white;
                    color: #334155;
                }
                .form-control-custom:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.1);
                    outline: none;
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                /* Grid Helpers within SweetAlert */
                .form-row { display: flex; gap: 1rem; }
                .form-col { flex: 1; }
            </style>

            <div class="admin-form-container">
                <div class="form-row">
                    <!-- Left Column: Key Info -->
                    <div class="form-col" style="border-right: 1px solid #e2e8f0; padding-right: 1rem;">
                        <div class="form-section-title"><i class="fas fa-book mr-2"></i> Información Básica</div>
                        
                        <div class="form-group">
                            <label class="form-label">Título del Libro *</label>
                            <input id="inp-title" class="form-control-custom" placeholder="Ej: Matemática 1° Grado" value="${title}">
                        </div>

                        <div class="form-row">
                            <div class="form-col">
                                <div class="form-group">
                                    <label class="form-label">Autor</label>
                                    <input id="inp-author" class="form-control-custom" value="${author}">
                                </div>
                            </div>
                            <div class="form-col">
                                <div class="form-group">
                                    <label class="form-label">Nivel (ID)</label>
                                    <input id="inp-level" class="form-control-custom" placeholder="Ej: 1-grado" value="${level}">
                                </div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Categoría *</label>
                            <select id="inp-category" class="form-control-custom">
                                ${catOptions}
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Portada (URL o Path)</label>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <input id="inp-image" class="form-control-custom" placeholder="img/portadas/..." value="${image}">
                                ${image ? `<img src="${image}" style="width:35px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" onerror="this.style.display='none'">` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Details -->
                    <div class="form-col" style="padding-left: 0.5rem;">
                         <div class="form-section-title"><i class="fas fa-align-left mr-2"></i> Detalles</div>
                        
                        <div class="form-group">
                            <label class="form-label">Subtítulo (Opcional)</label>
                            <input id="inp-subtitle" class="form-control-custom" value="${subtitle}">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Descripción</label>
                            <textarea id="inp-description" class="form-control-custom" rows="8" placeholder="Resumen del libro...">${description}</textarea>
                        </div>
                    </div>
                </div>

                <!-- Resources Section -->
                <div class="mt-3 pt-2" style="border-top: 1px solid #e2e8f0;">
                    <div class="form-section-title"><i class="fas fa-layer-group mr-2"></i> Recursos Digitales</div>
                    
                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group">
                                <label class="form-label" style="color:var(--success)"><i class="fas fa-file-alt mr-1"></i> Plan Anual (Link)</label>
                                <input id="inp-planAnual" class="form-control-custom" value="${planAnual}" placeholder="archivo.docx">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group">
                                <label class="form-label" style="color:#0ea5e9"><i class="fas fa-calendar-day mr-1"></i> Plan Diario (Link)</label>
                                <input id="inp-planDiario" class="form-control-custom" value="${planDiario}" placeholder="archivo.docx">
                            </div>
                        </div>
                    </div>

                    <!-- Projects -->
                    <div class="form-group">
                         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                            <label class="form-label mb-0"><i class="fas fa-project-diagram mr-1"></i> Proyectos (Inicial)</label>
                            <button type="button" class="btn btn-sm btn-primary py-1 px-2" style="font-size:0.75rem;" onclick="AdminPageController.addProjectRow()">
                                <i class="fas fa-plus"></i> Añadir
                            </button>
                        </div>
                        <div id="projects-container" style="background:white; padding:1rem; border-radius:8px; border:1px solid #e2e8f0; min-height:40px;">
                            ${projectsHtml || '<p class="text-muted text-center small m-0" id="no-proj-msg">Sin proyectos asignados</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Helper to add row dynamically
    addProjectRow: function () {
        const container = document.getElementById('projects-container');
        if (!container) return;

        // Remove empty message if exists
        const emptyMsg = document.getElementById('no-proj-msg');
        if (emptyMsg) emptyMsg.remove();

        const div = document.createElement('div');
        div.className = 'project-row d-flex gap-2 mb-2 align-items-center';
        div.innerHTML = `
            <div class="flex-grow-1" style="flex:1;">
                 <input type="text" class="form-control-custom proj-name" placeholder="Nombre Proyecto" style="padding:0.4rem;">
            </div>
            <div class="flex-grow-1" style="flex:1;">
                 <input type="text" class="form-control-custom proj-file" placeholder="Link/Archivo" style="padding:0.4rem;">
            </div>
            <button type="button" class="btn btn-action text-danger p-1" onclick="this.parentElement.remove()" title="Eliminar Proyecto"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    },

    addBook: function () {
        Swal.fire({
            title: '<span style="color:#0f172a; font-weight:700;">Nuevo Libro</span>',
            html: this.getBookFormHtml({}),
            width: 850,
            showCancelButton: true,
            confirmButtonText: 'Guardar Libro',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0e7490',
            cancelButtonColor: '#64748b',
            focusConfirm: false,
            preConfirm: () => {
                return this.extractFormData();
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const data = result.value;

                // Generate ID
                const maxId = books.length > 0 ? Math.max(...books.map(b => parseInt(b.id) || 0)) : 0;
                data.id = maxId + 1;
                data.year = new Date().getFullYear();

                books.push(data);
                this.saveAndRender();
                Swal.fire('Guardado', 'Libro añadido correctamente', 'success');
            }
        });
    },

    editBook: function (id) {
        const book = books.find(b => b.id === id);
        if (!book) return;

        Swal.fire({
            title: `<span style="color:#0f172a; font-weight:700;">Editar: ${book.title}</span>`,
            html: this.getBookFormHtml(book),
            width: 850,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#0e7490',
            cancelButtonColor: '#64748b',
            focusConfirm: false,
            preConfirm: () => {
                return this.extractFormData();
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const data = result.value;
                // Merge data back to book object
                Object.assign(book, data);

                this.saveAndRender();
                Swal.fire('Actualizado', 'Los cambios han sido guardados', 'success');
            }
        });
    },

    extractFormData: function () {
        const title = document.getElementById('inp-title').value;
        const author = document.getElementById('inp-author').value;
        const category = document.getElementById('inp-category').value;
        const level = document.getElementById('inp-level').value;
        const image = document.getElementById('inp-image').value;
        const subtitle = document.getElementById('inp-subtitle').value;
        const description = document.getElementById('inp-description').value;

        const planAnual = document.getElementById('inp-planAnual').value;
        const planDiario = document.getElementById('inp-planDiario').value;

        // Extract Projects
        const projects = [];
        document.querySelectorAll('#projects-container .project-row').forEach(row => {
            const name = row.querySelector('.proj-name').value;
            const file = row.querySelector('.proj-file').value;
            if (name && file) {
                projects.push({ name, file });
            }
        });

        if (!title || !category) {
            Swal.showValidationMessage('El título y la categoría son obligatorios');
            return false;
        }

        // Return object structure
        const result = {
            title, author, category, level, image, subtitle, description
        };

        // Only add if not empty
        if (planAnual) result.planAnual = planAnual;
        if (planDiario) result.planDiario = planDiario;
        if (projects.length > 0) result.projects = projects;
        else result.projects = undefined; // Clear if empty

        // Normalized cover/image key
        result.cover = image;

        return result;
    },

    deleteBook: function (id) {
        Swal.fire({
            title: '¿Eliminar libro?',
            text: "No podrás revertir esto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                const idx = books.findIndex(b => b.id === id);
                if (idx > -1) {
                    books.splice(idx, 1);
                    this.saveAndRender();
                    Swal.fire('¡Eliminado!', 'El libro ha sido eliminado.', 'success');
                }
            }
        });
    },

    saveAndRender: function () {
        localStorage.setItem('aranduka_books', JSON.stringify(books));
        this.renderInventory();
        if (document.getElementById('total-books')) {
            document.getElementById('total-books').textContent = books.length;
        }
    },

    // =========================================
    // USERS & ORDERS
    // =========================================
    renderUsers: function () {
        const tbody = document.getElementById('admin-users-table-body');
        if (!tbody) return;
        const users = JSON.parse(localStorage.getItem('aranduka_users')) || [];

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No hay usuarios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width:36px; height:36px; color: var(--primary); font-weight: bold; margin-right: 15px;">
                            ${user.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <h6 class="mb-0 text-dark fw-bold" style="font-size: 0.9rem;">${user.name}</h6>
                            <span class="text-muted small">${user.email}</span>
                        </div>
                    </div>
                </td>
                <td><span class="text-dark fw-medium small">${user.school || 'No especificado'}</span></td>
                <td><span class="text-muted small fw-medium">${user.phone || '--'}</span></td>
                <td class="text-center">
                    <span class="badge ${user.role === 'Docente' ? 'badge-green' : 'badge-slate'}">
                        ${user.role || 'Estudiante'}
                    </span>
                </td>
                <td class="text-end">
                    <button class="btn btn-action text-danger" onclick="AdminPageController.deleteUser('${user.email}')" title="Eliminar Usuario">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    deleteUser: function (email) {
        Swal.fire({
            title: '¿Eliminar usuario?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                let users = JSON.parse(localStorage.getItem('aranduka_users')) || [];
                users = users.filter(u => u.email !== email);
                localStorage.setItem('aranduka_users', JSON.stringify(users));
                this.renderUsers();
                if (document.getElementById('total-users')) document.getElementById('total-users').innerHTML = users.length;
                Swal.fire('Eliminado', 'El usuario ha sido eliminado', 'success');
            }
        });
    },

    renderOrders: function () {
        const tbody = document.getElementById('admin-orders-table-body');
        if (!tbody) return;
        const orders = JSON.parse(localStorage.getItem('aranduka_order_history') || '[]');

        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No hay pedidos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>
                    <div class="d-flex flex-column">
                        <span class="text-dark fw-bold text-sm">#${order.id.toString().slice(-6)}</span>
                        <span class="text-muted text-xs">${order.date}</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" style="width:30px;height:30px; margin-right:10px;">
                            <i class="fas fa-user text-muted"></i>
                        </div>
                        <div>
                            <h6 class="mb-0 text-dark text-sm">Cliente Web</h6>
                            <span class="text-xs text-muted">Vía WhatsApp</span>
                        </div>
                    </div>
                </td>
                <td class="text-center"><span class="text-dark text-sm fw-bold">${order.total} Libros</span></td>
                <td class="text-center"><span class="badge badge-success">Enviado</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-action text-primary" onclick="AdminPageController.viewOrderDetails(${order.id})">
                        Ver Detalles
                    </button>
                </td>
            </tr>
        `).join('');
    },

    viewOrderDetails: function (id) {
        const orders = JSON.parse(localStorage.getItem('aranduka_order_history') || '[]');
        const order = orders.find(o => o.id === id);
        if (!order) return;

        const itemsHtml = order.items.map(item => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>${item.title}</span>
                <span class="badge badge-primary badge-pill">${item.level || 'General'}</span>
            </li>
        `).join('');

        Swal.fire({
            title: 'Detalles del Pedido',
            html: `
                <div class="text-left mb-3">
                    <strong>Fecha:</strong> ${order.date}<br>
                    <strong>ID:</strong> ${order.id}
                </div>
                <ul class="list-group text-left" style="max-height: 200px; overflow-y: auto;">
                    ${itemsHtml}
                </ul>
            `,
            confirmButtonText: 'Cerrar'
        });
    },

    // =========================================
    // DOWNLOADS (NEW)
    // =========================================
    renderDownloads: function () {
        const tbody = document.getElementById('admin-downloads-table-body');
        if (!tbody) return;
        const downloads = JSON.parse(localStorage.getItem('aranduka_downloads') || '[]');

        if (downloads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5">No hay descargas registradas</td></tr>';
            return;
        }

        // Sort descending by ID (timestamp)
        const sorted = downloads.sort((a, b) => b.id - a.id);

        tbody.innerHTML = sorted.map(d => {
            const user = d.user || {};
            // Sanitize function to prevent HTML injection if needed, but basic text is safe here
            return `
            <tr>
                <td>
                    <span class="text-dark fw-bold text-sm">${d.date}</span>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <span class="text-dark fw-bold text-sm">${user.name || 'Invitado'}</span>
                         <span class="text-xs text-muted">${user.email || 'Sin Correo'}</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex flex-column">
                         <span class="text-dark text-sm">${user.school || '--'}</span>
                         <span class="text-xs text-muted">${user.role || 'Invitado'}</span>
                    </div>
                </td>
                <td><span class="text-dark text-sm fw-bold table-action cursor-pointer" onclick="window.open('https://wa.me/595${user.phone}?text=Hola ${user.name}', '_blank')">${user.phone || '--'}</span></td>
                <td>
                    <span class="text-dark text-sm font-weight-bold">${d.bookTitle || 'Desconocido'}</span>
                </td>
                <td>
                    <span class="badge badge-info">${d.material || 'Planes'}</span>
                </td>
            </tr>
        `}).join('');
    },

    exportDownloadsCSV: function () {
        const downloads = JSON.parse(localStorage.getItem('aranduka_downloads') || '[]');
        if (downloads.length === 0) {
            Swal.fire('Atención', 'No hay datos para exportar', 'info');
            return;
        }

        let csv = 'Fecha,Hora,Nombre,Email,Rol,Institucion,Telefono,Libro,Material\n';
        downloads.forEach(d => {
            const user = d.user || {};
            const dateParts = d.date.split(' ');
            const date = dateParts[0] || '';
            const time = dateParts[1] || '';

            // Sanitize
            const clean = (text) => (text || '').replace(/,/g, ' ');

            csv += `${date},${time},${clean(user.name)},${clean(user.email)},${clean(user.role)},${clean(user.school)},${clean(user.phone)},${clean(d.bookTitle)},${clean(d.material)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "descargas_planes_aranduka.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    // =========================================
    // ESSAYS MANAGEMENT (NEW)
    // =========================================
    renderEssays: function () {
        const tbody = document.getElementById('admin-essays-table-body');
        if (!tbody) return;
        const essays = JSON.parse(localStorage.getItem('aranduka_essays') || '[]');

        if (essays.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">No hay aportes para revisar</td></tr>';
            return;
        }

        // Sort by date (newest first)
        const sorted = essays.sort((a, b) => b.id - a.id);

        tbody.innerHTML = sorted.map(essay => {
            let statusBadge = '';
            switch (essay.status) {
                case 'approved': statusBadge = '<span class="badge badge-success">Aprobado</span>'; break;
                case 'rejected': statusBadge = '<span class="badge badge-danger">Rechazado</span>'; break;
                default: statusBadge = '<span class="badge badge-info">Pendiente</span>';
            }

            return `
            <tr>
                <td>
                    <div class="d-flex flex-column">
                        <span class="text-dark fw-bold text-sm">${essay.name}</span>
                        <span class="text-xs text-muted">${essay.date}</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex flex-column">
                        <span class="text-dark text-sm fw-bold">${essay.subject}</span>
                        <span class="text-xs text-muted">${essay.level || '--'}</span>
                    </div>
                </td>
                <td>
                    <a href="javascript:void(0)" class="text-primary text-sm fw-bold" onclick="AdminPageController.downloadEssay('${essay.fileName}')">
                        <i class="fas fa-file-download mr-1"></i> ${essay.fileName}
                    </a>
                </td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-end">
                    <button class="btn btn-action text-success" onclick="AdminPageController.updateEssayStatus(${essay.id}, 'approved')" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-action text-danger" onclick="AdminPageController.updateEssayStatus(${essay.id}, 'rejected')" title="Rechazar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn btn-action text-muted" onclick="AdminPageController.deleteEssay(${essay.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    },

    updateEssayStatus: function (id, newStatus) {
        const essays = JSON.parse(localStorage.getItem('aranduka_essays') || '[]');
        const essay = essays.find(e => e.id === id);
        if (essay) {
            essay.status = newStatus;
            localStorage.setItem('aranduka_essays', JSON.stringify(essays));
            this.renderEssays();
            Swal.fire('Actualizado', `Estado cambiado a ${newStatus === 'approved' ? 'Aprobado' : 'Rechazado'}`, 'success');
        }
    },

    deleteEssay: function (id) {
        Swal.fire({
            title: '¿Eliminar aporte?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sí, eliminar'
        }).then((result) => {
            if (result.isConfirmed) {
                let essays = JSON.parse(localStorage.getItem('aranduka_essays') || '[]');
                essays = essays.filter(e => e.id !== id);
                localStorage.setItem('aranduka_essays', JSON.stringify(essays));
                this.renderEssays();
            }
        });
    },

    downloadEssay: function (fileName) {
        Swal.fire('Descarga Simulada', `Se iniciaría la descarga de: ${fileName}`, 'info');
    }
};

document.addEventListener('DOMContentLoaded', function () {
    AdminPageController.init();
    window.AdminPageController = AdminPageController;
});
