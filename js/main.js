document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // 0. UTILITIES & CONFIG
    // ==========================================

    // Evitar scroll automático al recargar
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    // CONSTANTES
    const DB_VERSION = "5.08"; // Increment to force clear LSsión para forzar limpieza de datos antiguos

    // Global Reset
    window.hardReset = function () {
        localStorage.clear();
        sessionStorage.clear();
        // Redirigir a inicio con cache bust
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
    };

    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag]));
    };

    // Fix: App Normalize for Search (Robust Version)
    const appNormalize = (s) => {
        if (!s) return "";
        return s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/°/g, '')               // Quitar símbolo de grado
            .toLowerCase()
            .trim()
            .trim()
            .replace(/\s+/g, '-');          // Espacios por guiones
    };

    // Helper: Get Rank for Sorting (Pre-Jardin -> 3 Curso)
    const getLevelRank = (level) => {
        if (!level) return 99;
        const nLevel = appNormalize(level);

        if (nLevel.includes('pre-jardin')) return 1;
        if (nLevel.includes('jardin')) return 2;
        if (nLevel.includes('pre-escolar')) return 3;

        // Grados 1-9
        if (nLevel.includes('grado')) {
            const num = parseInt(nLevel.replace(/\D/g, ''));
            return 3 + num; // 1-grado -> 4, 9-grado -> 12
        }

        // Cursos 1-3
        if (nLevel.includes('curso')) {
            const num = parseInt(nLevel.replace(/\D/g, ''));
            return 12 + num; // 1-curso -> 13, 3-curso -> 15
        }

        if (nLevel.includes('formacion-docente')) return 20;

        return 99; // Otros
    };

    // Fix: Validar scroll para el botón BackToTop con transición
    const backToTopBtn = document.getElementById("backToTopBtn");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 300) {
            if (backToTopBtn) backToTopBtn.classList.add('show');
        } else {
            if (backToTopBtn) backToTopBtn.classList.remove('show');
        }
    });

    // ==========================================
    // ==========================================
    // 0.5. EDUVERSE THEME CONTROLLER
    // ==========================================
    const EduVerseThemeController = {
        currentTheme: null,

        // Map levels to themes and prompts
        themes: {
            // INICIAL - 3RD GRADE: GAMIFIED
            'pre-jardin': { class: 'theme-primary', vibe: 'cartoon educational illustration, bubbles, primary colors, bright', overlay: 'rgba(255, 107, 107, 0.2)' },
            'jardin': { class: 'theme-primary', vibe: 'cartoon nature garden, cute animals, soft lighting', overlay: 'rgba(78, 205, 196, 0.2)' },
            'pre-escolar': { class: 'theme-primary', vibe: 'alphabet blocks, bright playful colors, kids learning', overlay: 'rgba(255, 217, 61, 0.2)' },
            '1-grado': { class: 'theme-primary', vibe: 'colorful basic shapes, friendly classroom, joyful', overlay: 'rgba(255, 107, 107, 0.2)' },
            '2-grado': { class: 'theme-primary', vibe: 'interactive learning, colorful books, playful patterns', overlay: 'rgba(78, 205, 196, 0.2)' },
            '3-grado': { class: 'theme-primary', vibe: 'adventure map, treasure hunt style, bright animated', overlay: 'rgba(255, 217, 61, 0.2)' },

            // 4TH GRADE - 9TH GRADE + MEDIA: MODERN
            '4-grado': { class: 'theme-secondary', vibe: 'science lab futuristic, glowing text, neon accents', overlay: 'rgba(99, 102, 241, 0.3)' },

            '5-grado': { class: 'theme-secondary', vibe: 'technology data stream, holographic interface, cyber', overlay: 'rgba(99, 102, 241, 0.3)' },
            '6-grado': { class: 'theme-secondary', vibe: 'space exploration, stars galaxies, geometric tech', overlay: 'rgba(217, 70, 239, 0.3)' },

            // Default Fallbacks
            'default-primary': { class: 'theme-primary', vibe: 'playful education', overlay: 'rgba(255, 107, 107, 0.2)' },
            'default-secondary': { class: 'theme-secondary', vibe: 'modern abstract tech', overlay: 'rgba(99, 102, 241, 0.3)' },
            'default-academic': { class: 'theme-academic', vibe: 'minimalist architecture, white marble, library', overlay: 'rgba(30, 41, 59, 0.1)' }
        },

        getThemeConfig(book) {
            // Determine level group
            const level = appNormalize(book.level);

            // Special case for 'Formación Docente' or higher ed if added later
            if (book.category === 'formacion-docente') return this.themes['default-academic'];

            // Direct mapping
            if (this.themes[level]) return this.themes[level];

            // Fallback logic
            if (level.includes('grado')) {
                const gradeNum = parseInt(level);
                return (gradeNum <= 3) ? this.themes['default-primary'] : this.themes['default-secondary'];
            }

            // Media / Technical
            return this.themes['default-secondary'];
        },

        applyTheme(book) {
            const config = this.getThemeConfig(book);
            // Fix: Target the correct ID "quickViewModal" for the overlay
            const overlay = document.getElementById('quickViewModal');
            // Fix: Target the existing modal content container
            const container = overlay ? overlay.querySelector('.modal-content-custom') : null;

            if (!overlay || !container) return; // Guard clause

            // 1. Reset Classes
            container.className = 'modal-content-custom'; // Reset to base class

            // 2. Add new theme class + glass utility
            // container.classList.add(config.class);
            // container.classList.add('ev-glass-style');

            // 3. Dynamic Visuals & Cursors
            const subjectData = {
                // Ciencias Sociales / Historia / Humanidades
                "historia": { prompt: "history collage, pyramids, roman colosseum, ancient world map, historical figures, sepia tone, educational montage", cursor: "cursor-theme-academic" },
                "ciencias sociales": { prompt: "social studies collage, globe, diverse cultures, ancient ruins, flags, community, educational illustration", cursor: "cursor-theme-academic" },
                "sociales": { prompt: "social studies collage, globe, diverse cultures, ancient ruins, flags, community, educational illustration", cursor: "cursor-theme-academic" },
                "vida social": { prompt: "society and community, happy people collage, family and school, village life, watercolor illustration", cursor: "cursor-theme-academic" },
                "formacion ethics": { prompt: "ethics and justice, scales of balance, gavel, greek columns, philosophy symbol, law and order", cursor: "cursor-theme-academic" },
                "etica": { prompt: "ethics and justice, scales of balance, gavel, greek columns, philosophy symbol, law and order", cursor: "cursor-theme-academic" },
                "filosofia": { prompt: "The Thinker statue, greek ruins, wisdom, owl, galaxy nebula, abstract thought, deep cinematic lighting", cursor: "cursor-theme-academic" },
                "sociologia": { prompt: "crowd of people silhouettes, connection lines, global network, diverse faces, urban city time lapse overlay", cursor: "cursor-theme-academic" },
                "politica": { prompt: "government building columns, constitution document, gavel, flag waving wind, voting ballot box, serious atmosphere", cursor: "cursor-theme-academic" },

                // Ciencias Naturales / Salud / Química / Física
                "ciencias des la naturaleza": { prompt: "nature collage, biology, green leaves, animals, plants, water cycle, microscope, realistic style", cursor: "cursor-theme-nature" },
                "ciencias naturales": { prompt: "nature collage, biology, green leaves, animals, plants, water cycle, microscope, realistic style", cursor: "cursor-theme-nature" },
                "medio natural": { prompt: "nature landscape, forest, river, butterflies, flowers, sunny day, environmental science", cursor: "cursor-theme-nature" },
                "salud": { prompt: "health and medicine, dna strand, healthy food, heart beat line, doctor tools, clean blue medical background", cursor: "cursor-theme-nature" },
                "quimica": { prompt: "chemistry laboratory, glass beakers, colorful liquids, periodic table elements, molecules, science experiment", cursor: "cursor-theme-tech" },
                "fisica": { prompt: "physics equations, atoms, electricity, magnetism, universe, prism light, scientific laws", cursor: "cursor-theme-tech" },

                // Exactas / Tech
                "matematica": { prompt: "mathematics background, blackboard with equations, geometry tools, ruler, compass, numbers, calculator, algebra", cursor: "cursor-theme-tech" },
                "geometria": { prompt: "geometry shapes, 3d cubes, pyramids, spheres, architectural blueprint, mathematical precision", cursor: "cursor-theme-tech" },
                "estadistica": { prompt: "statistics graphs, bar charts, pie charts, data analysis, upward trends, business analytics", cursor: "cursor-theme-tech" },
                "trabajo": { prompt: "technology and work, computer circuit, robotic hand, tools, futuristic workshop, innovation", cursor: "cursor-theme-tech" },
                "tecnologia": { prompt: "technology and work, computer circuit, robotic hand, tools, futuristic workshop, innovation", cursor: "cursor-theme-tech" },

                // Artes / C.F.
                "artes": { prompt: "art supplies, paint palette, brushes, colorful canvas, creative splash, drawing pencils, artistic workspace", cursor: "cursor-theme-art" },
                "caligrafia": { prompt: "fountain pen, elegant handwriting, script typography background, antique parchment, ink bottle, macro photography", cursor: "cursor-theme-art" },
                "educacion fisica": { prompt: "sports collage, running track, basketball, soccer ball, active lifestyle, energy, gym equipment", cursor: "cursor-theme-default" },

                // Lenguas
                "lengua": { prompt: "language and literature, pile of books, open book, flying letters, quill pen, library background", cursor: "cursor-theme-academic" },
                "literatura": { prompt: "classic literature, old library shelves, leather books, reading glasses, ink pot, storytelling", cursor: "cursor-theme-academic" },
                "comunicacion": { prompt: "communication collage, speech bubbles, radio microphone, dialogue, connection, media symbols", cursor: "cursor-theme-academic" },
                "guarani": { prompt: "paraguay culture, ñanduti lace, terere textured background, red soil path, paraguayan flag colors, traditional art", cursor: "cursor-theme-nature" },

                // Inicial
                "inicial": { prompt: "cartoon playground, bright primary colors, balloons, teddy bear, alphabet blocks, 3d render cute", cursor: "cursor-theme-default" },

                // Default
                "default": { prompt: "school supplies, books, pencil, apple, blackboard, educational background", cursor: "cursor-theme-default" }
            };

            // Normalize subject for matching
            const subjectKey = (Array.isArray(book.category) ? book.category[0] : book.category || "").toLowerCase();

            // Find best match in map
            let matchedData = subjectData["default"];
            // Sort keys by length (descending) to match specific phrases first (e.g. "ciencias naturales" before "ciencias")
            const sortedKeys = Object.keys(subjectData).sort((a, b) => b.length - a.length);

            for (const key of sortedKeys) {
                if (key !== "default" && subjectKey.includes(key)) {
                    matchedData = subjectData[key];
                    break;
                }
            }

            // Apply Cursor
            container.classList.add(matchedData.cursor);

            // REVERTED: Remove dynamic background generation (User Request)
            // Restore default background
            if (overlay) {
                overlay.style.backgroundImage = '';
            }

            // 4. Play Audio Cue
            this.playAudioCue(config.class);
        },

        // Singleton Audio Context (Lazy Init)
        _audioCtx: null,
        getAudioContext() {
            if (!this._audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this._audioCtx = new AudioContext();
                }
            }
            return this._audioCtx;
        },

        playAudioCue(themeClass) {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            // Resume if suspended (browser policy requires user gesture, we are usually in a click handler here)
            if (ctx.state === 'suspended') {
                ctx.resume().catch(e => console.warn("Audio resume failed", e));
            }

            const playTone = (freq, type, duration, startTime = 0) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

                gain.gain.setValueAtTime(0.05, ctx.currentTime + startTime); // Volume low
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + startTime);
                osc.stop(ctx.currentTime + startTime + duration);
            };

            try {
                if (themeClass === 'theme-primary') {
                    // Gamified: Happy major chord arpeggio
                    playTone(440, 'sine', 0.5, 0);   // A4
                    playTone(554, 'sine', 0.5, 0.1); // C#5
                    playTone(659, 'sine', 0.6, 0.2); // E5
                } else if (themeClass === 'theme-secondary') {
                    // Modern: Futuristic sweep
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.3);
                } else {
                    // Academic: Soft "swish" / page turn feel
                    playTone(220, 'triangle', 0.5, 0); // A3
                    playTone(330, 'sine', 0.5, 0.05);  // E4
                }
            } catch (e) {
                console.warn("Audio play failed:", e);
            }
        }
    };

    // 1. WINDOW MANAGER (OS-LIKE UI) - TOUCH FIX
    // ==========================================
    const WindowManager = {
        windows: [],
        baseZIndex: 90000, // Fix: Z-Index reducido para estar debajo del Login (100000)

        create: function (id, title, contentHtml) {
            if (document.getElementById(id)) return; // Prevent duplicates

            const win = document.createElement('div');
            win.id = id;
            win.className = 'os-window';
            win.style.zIndex = ++WindowManager.baseZIndex;

            win.innerHTML = `
                <div class="os-titlebar" id="${id}-header">
                    <div class="os-title"><i class="fas fa-layer-group"></i> ${title}</div>
                    <div class="os-controls">
                        <button class="os-btn os-btn-close" onclick="WindowManager.close('${id}')" title="Cerrar"></button>
                    </div>
                </div>
                <div class="os-content" id="${id}-content">
                    ${contentHtml}
                </div>
            `;

            document.body.appendChild(win);
            WindowManager.makeDraggable(win, document.getElementById(`${id}-header`));
            win.onmousedown = () => WindowManager.bringToFront(id);
        },

        close: (id) => {
            const win = document.getElementById(id);
            if (win) {
                win.style.opacity = '0';
                win.style.transform = 'translate(-50%, -40%) scale(0.95)';
                setTimeout(() => win.remove(), 200);
            }
        },

        bringToFront: (id) => {
            const win = document.getElementById(id);
            if (win) win.style.zIndex = ++WindowManager.baseZIndex;
        },

        makeDraggable: (element, handle) => {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

            // Mouse events
            handle.onmousedown = dragStart;
            // Touch events (Mobile fix)
            handle.ontouchstart = dragStart;

            function dragStart(e) {
                e = e || window.event;
                // Detectar si es touch o mouse
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                if (!e.touches) e.preventDefault(); // Solo prevenir default en mouse para no romper scroll táctil inicial

                pos3 = clientX;
                pos4 = clientY;

                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;

                // Listeners globales para touch
                document.ontouchend = closeDragElement;
                document.ontouchmove = elementDrag;

                WindowManager.bringToFront(element.id);
            }

            function elementDrag(e) {
                e = e || window.event;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;

                // Prevenir scroll de pantalla mientras arrastras la ventana
                if (e.touches) e.preventDefault();

                pos1 = pos3 - clientX;
                pos2 = pos4 - clientY;
                pos3 = clientX;
                pos4 = clientY;

                element.style.top = (element.offsetTop - pos2) + "px";
                element.style.left = (element.offsetLeft - pos1) + "px";
                element.style.transform = "none";
            }

            function closeDragElement() {
                document.onmouseup = null;
                document.onmousemove = null;
                document.ontouchend = null;
                document.ontouchmove = null;
            }
        }
    };
    window.WindowManager = WindowManager;

    // ==========================================
    // 2. DATA (CATÁLOGO DE LIBROS)
    // ==========================================
    const defaultBooks = [
        // EDUCACIÓN INICIAL
        {
            id: 101,
            title: "Texto \"Mis Huellas\" Pre-Jardín",
            category: "inicial",
            level: "pre-jardin",
            image: "img/portadas/pre-jardin.png",
            file: "documentos/libro-ejemplo.pdf",
            author: "Equipo Aranduka",
            description: "Fomenta el desarrollo psicomotriz y cognitivo integral mediante actividades lúdicas, ilustraciones vibrantes y dinámicas diseñadas específicamente para la primera infancia educativa.",
            projects: [
                { name: "Pre-Jardín - Proyecto 1: Mi Cuerpo", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN1 PROYECTO  MI CUERPO ya.docx" },
                { name: "Pre-Jardín - Proyecto 2: Familia y Familia Escolar", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN2 PROYECTO   FAMILIA Y FAMILIA ESCOLAR ya.docx" },
                { name: "Pre-Jardín - Proyecto 3: Mi País", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN3 PROYECTO  MI PAÍS ya.docx" },
                { name: "Pre-Jardín - Proyecto 4: Medios de Transporte y Comunicación", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN4 PROYECTO MEDIO DE TRANSPORTE Y COMUNICACIÓN ya.docx" },
                { name: "Pre-Jardín - Proyecto 5: Explorando el Mundo Animal", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN5 PROYECTO  EXPLORANDO EL MUNDO ANIMAL ya.docx" },
                { name: "Pre-Jardín - Proyecto 6: Las Plantas", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN6 PROYECTO LAS PLANTAS ya.docx" },
                { name: "Pre-Jardín - Proyecto 7: El Universo", file: "documentos/educ. Inicial/pre-jardin/PRE JARDÍN7 PROYECTO EL UNIVERSO ya.docx" }
            ]
        },
        {
            id: 102,
            title: "Texto \"Mis Huellas\" Jardín",
            category: "inicial",
            level: "jardin",
            image: "img/portadas/jardin.png",
            file: "documentos/libro-ejemplo.pdf",
            author: "Equipo Aranduka",
            description: "Fomenta el desarrollo psicomotriz y cognitivo integral mediante actividades lúdicas, ilustraciones vibrantes y dinámicas diseñadas específicamente para la primera infancia educativa.",
            projects: [
                { name: "Jardín - Proyecto 1: Mi Cuerpo", file: "documentos/educ. Inicial/jardin/JARDÍN1 PROYECTO MI CUERPO.docx" },
                { name: "Jardín - Proyecto 2: Familia y Familia Escolar", file: "documentos/educ. Inicial/jardin/JARDÍN2 PROYECTO FAMILIA Y FAMILIA ESCOLAR ya.docx" },
                { name: "Jardín - Proyecto 3: Mi País y Comunidad", file: "documentos/educ. Inicial/jardin/JARDÍN3 PROYECTO MI PAIS - COMUNIDAD ya.docx" },
                { name: "Jardín - Proyecto 4: Medios de Transporte y Comunicación", file: "documentos/educ. Inicial/jardin/JARDÍN4 PROYECTO MEDIOS DE TRANSPORTE Y COMUNICACIÓN ya.docx" },
                { name: "Jardín - Proyecto 5: Explorando el Mundo Animal", file: "documentos/educ. Inicial/jardin/JARDÍN5 PROYECTO EXPLORANDO EL MUNDO ANIMAL ya.docx" },
                { name: "Jardín - Proyecto 6: Las Plantas", file: "documentos/educ. Inicial/jardin/JARDÍN6 PROYECTO LAS PLANTAS ya.docx" },
                { name: "Jardín - Proyecto 7: El Universo", file: "documentos/educ. Inicial/jardin/JARDÍN7 PROYECTO EL UNIVERSO ya.docx" }
            ]
        },
        {
            id: 103,
            title: "Texto \"Mis Huellas\" Pre-Escolar",
            category: "inicial",
            level: "pre-escolar",
            image: "img/portadas/MISHUELLASPREESCOLAR.png",
            file: "documentos/libro-ejemplo.pdf",
            author: "Equipo Aranduka",
            description: "Fomenta el desarrollo psicomotriz y cognitivo integral mediante actividades lúdicas, ilustraciones vibrantes y dinámicas diseñadas específicamente para la primera infancia educativa.",
            projects: [
                { name: "Pre-Escolar - Proyecto 1: Mi Cuerpo", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR11 PROYECTO  MI CUERPO ya.docx" },
                { name: "Pre-Escolar - Proyecto 2: Familia y Familia Escolar", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR22 PROYECTO  FAMILIA Y FAMILIA ESCOLAR ya.docx" },
                { name: "Pre-Escolar - Proyecto 3: Mi País", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR33 PROYECTO MI PAÍS ya.docx" },
                { name: "Pre-Escolar - Proyecto 4: Medios de Transporte y Comunicación", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR44 PROYECTO MEDIOS DE TRANSPORTE Y COMUNICACIÓN ya.docx" },
                { name: "Pre-Escolar - Proyecto 5: Explorando el Mundo Animal", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR55 PROYECTO EXPLORANDO EL MUNDO ANIMAL ya.docx" },
                { name: "Pre-Escolar - Proyecto 6: Las Plantas", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR66 PROYECTO  LAS PLANTAS ya.docx" },
                { name: "Pre-Escolar - Proyecto 7: El Universo", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR77 PROYECTO EL UNIVERSO ya.docx" },
                { name: "Pre-Escolar - Proyecto 8: Explorando Letras y Números", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR88 PROYECTO EXPLORANDO LETRAS Y NUMEROS ya.docx" }
            ]
        },
        {
            id: 104,
            title: "Texto \"Mis Lecciones\" Pre-Escolar",
            category: "inicial",
            level: "pre-escolar",
            image: "img/portadas/MISLECCIONESPREESCOLAR.png",
            file: "documentos/libro-ejemplo.pdf",
            author: "Equipo Aranduka",
            description: "Fomenta el desarrollo psicomotriz y cognitivo integral mediante actividades lúdicas, ilustraciones vibrantes y dinámicas diseñadas específicamente para la primera infancia educativa.",
            projects: [
                { name: "Pre-Escolar - Proyecto 1: Mi Cuerpo", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR11 PROYECTO  MI CUERPO ya.docx" },
                { name: "Pre-Escolar - Proyecto 2: Familia y Familia Escolar", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR22 PROYECTO  FAMILIA Y FAMILIA ESCOLAR ya.docx" },
                { name: "Pre-Escolar - Proyecto 3: Mi País", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR33 PROYECTO MI PAÍS ya.docx" },
                { name: "Pre-Escolar - Proyecto 4: Medios de Transporte y Comunicación", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR44 PROYECTO MEDIOS DE TRANSPORTE Y COMUNICACIÓN ya.docx" },
                { name: "Pre-Escolar - Proyecto 5: Explorando el Mundo Animal", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR55 PROYECTO EXPLORANDO EL MUNDO ANIMAL ya.docx" },
                { name: "Pre-Escolar - Proyecto 6: Las Plantas", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR66 PROYECTO  LAS PLANTAS ya.docx" },
                { name: "Pre-Escolar - Proyecto 7: El Universo", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR77 PROYECTO EL UNIVERSO ya.docx" },
                { name: "Pre-Escolar - Proyecto 8: Explorando Letras y Números", file: "documentos/educ. Inicial/pre-escolar/PRE ESCOLAR88 PROYECTO EXPLORANDO LETRAS Y NUMEROS ya.docx" }
            ]
        },

        // PRIMER CICLO (1°, 2°, 3°)
        { id: 201, title: "Matemática 1° Grado", category: "matematica", level: "1-grado", image: "img/portadas/mat1.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico-matemático con ejercicios prácticos, resolución de problemas y aplicaciones reales alineadas fielmente al currículum oficial paraguayo vigente.", planAnual: "documentos/primer ciclo/1°grado/matematica 1°GRADO/MATEMÁTICA 1º GRADO2.02___.docx", planDiario: "documentos/primer ciclo/1°grado/matematica 1°GRADO/PLAN  DIARIO MATEMÁTICA  1° grado.docx" },
        { id: 212, title: "Matemática 2° Grado", category: "matematica", level: "2-grado", image: "img/portadas/mat2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico-matemático con ejercicios prácticos, resolución de problemas y aplicaciones reales alineadas fielmente al currículum oficial paraguayo vigente.", planAnual: "documentos/primer ciclo/2°grado/matematica 2° grado/MATEMÁTICA 2º GRADO2.02__.docx", planDiario: "documentos/primer ciclo/2°grado/matematica 2° grado/PLAN DE CLASE DIARIO 2° grado.docx" },
        { id: 213, title: "Matemática 3° Grado", category: "matematica", level: "3-grado", image: "img/portadas/mat3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico-matemático con ejercicios prácticos, resolución de problemas y aplicaciones reales alineadas fielmente al currículum oficial paraguayo vigente.", planAnual: "documentos/primer ciclo/3°grado/matematica 3° grado/MATEMÁTICA 3º GRADO2.025.docx", planDiario: "documentos/primer ciclo/3°grado/matematica 3° grado/PLAN DE CLASE DIARIO 3° grado.docx" },
        { id: 221, title: "Comunicación 1° Grado", category: "comunicacion", level: "1-grado", image: "img/portadas/lit1.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/primer ciclo/1°grado/comunicacion1°grado/1º COMUNICACIÓN ANUAL.docx", planDiario: "documentos/primer ciclo/1°grado/comunicacion1°grado/COMUNICACIÓN 1º PLAN DIARIO.docx" },
        { id: 222, title: "Comunicación 2° Grado", category: "comunicacion", level: "2-grado", image: "img/portadas/lit2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/primer ciclo/2°grado/comunicacion2° grado/2º COMUNICACIÓN ANUAL.docx", planDiario: "documentos/primer ciclo/2°grado/comunicacion2° grado/COMUNICACIÓN 2ºPLAN DIARIO.docx" },
        { id: 223, title: "Comunicación 3° Grado", category: "comunicacion", level: "3-grado", image: "img/portadas/lit3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/primer ciclo/3°grado/comunicacion 3° grado/3° COMUNICACIÓN ANUAL.docx", planDiario: "documentos/primer ciclo/3°grado/comunicacion 3° grado/COMUNICACIÓN 3º PLAN DIARIO.docx" },
        { id: 211, title: "Guaraní 1° Grado", category: "guarani", level: "1-grado", image: "img/portadas/gua1.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo.", planAnual: "documentos/primer ciclo/1°grado/guarani1°grado/GUARANÍ PRIMERO.docx", planDiario: "documentos/primer ciclo/1°grado/guarani1°grado/GUARANI 1º PLAN DIARIO.docx" },
        { id: 225, title: "Guaraní 2° Grado", category: "guarani", level: "2-grado", image: "img/portadas/gua2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo.", planAnual: "documentos/primer ciclo/2°grado/guarani 2° grado/GUARANÍ SEGUNDO.docx", planDiario: "documentos/primer ciclo/2°grado/guarani 2° grado/GUARANI 2º PLAN DIARIO.docx" },
        { id: 226, title: "Guaraní 3° Grado", category: "guarani", level: "3-grado", image: "img/portadas/gua3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo.", planAnual: "documentos/primer ciclo/3°grado/guarani3° grado/GUARANÍ TERCERO.docx", planDiario: "documentos/primer ciclo/3°grado/guarani3° grado/GUARANI 3º PLAN DIARIO.docx" },
        { id: 231, title: "Mis Lecciones 1° Grado", category: ["vida-social", "ciencias-naturales"], level: "1-grado", image: "img/portadas/mislecciones1dogrado.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Explora la identidad nacional, historia y geografía con enfoque ciudadano, promoviendo valores éticos y el conocimiento de nuestra realidad social paraguaya.", subtitle: "Medio Natural y Salud y Vida Social y Trabajo", planAnual: "documentos/primer ciclo/1°grado/mis lecciones 1° grado/Medio Natural y Salud - PLAN 1° Grado.docx", planDiario: "documentos/primer ciclo/1°grado/mis lecciones 1° grado/Diario 1º Grado LECCIONES.docx" },
        { id: 232, title: "Mis Lecciones 2° Grado", category: ["vida-social", "ciencias-naturales"], level: "2-grado", image: "img/portadas/mislecciones2dogrado.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Explora la identidad nacional, historia y geografía con enfoque ciudadano, promoviendo valores éticos y el conocimiento de nuestra realidad social paraguaya.", subtitle: "Medio Natural y Salud y Vida Social y Trabajo", planAnual: "documentos/primer ciclo/2°grado/mis lecciones 2° grado/Medio Natural y Salud- PLAN 2° grado.docx", planDiario: "documentos/primer ciclo/2°grado/mis lecciones 2° grado/Diario 2º Grado LECCIONES.docx" },
        { id: 233, title: "Mis Lecciones 3° Grado", category: ["vida-social", "ciencias-naturales"], level: "3-grado", image: "img/portadas/mislecciones3dogrado.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Explora la identidad nacional, historia y geografía con enfoque ciudadano, promoviendo valores éticos y el conocimiento de nuestra realidad social paraguaya.", subtitle: "Medio Natural y Salud y Vida Social y Trabajo", planAnual: "documentos/primer ciclo/3°grado/mislecciones 3° grado/Medio Natural y Salud- PLAN 3° grado.docx", planDiario: "documentos/primer ciclo/3°grado/mislecciones 3° grado/Diario 3º Grado LECCIONES.docx" },
        { id: 251, title: "Caligrafía 1° Grado", category: "caligrafia", level: "1-grado", image: "img/portadas/2gradocaligrafo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía elemental." },
        { id: 252, title: "Caligrafía 2° Grado", category: "caligrafia", level: "2-grado", image: "img/portadas/1gradocaligrafo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía elemental." },
        { id: 253, title: "Caligrafía 3° Grado", category: "caligrafia", level: "3-grado", image: "img/portadas/3gradocaligrafo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía elemental." },

        // SEGUNDO CICLO (4°, 5°, 6°)
        { id: 247, title: "Ciencias Naturales 4° Grado", category: "ciencias-naturales", level: "4-grado", image: "img/portadas/c4.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Comprende el mundo natural a través de la observación y experimentación, integrando conceptos de salud y medio ambiente.", planAnual: "documentos/segundo ciclo/4° grado/ciencias naturales 4° grado/5PLAN ANUAL CIENCIAS Y SALUD 4°.docx", planDiario: "documentos/segundo ciclo/4° grado/ciencias naturales 4° grado/5PLAN DE CLASE DIARIO Ciencias 4°.docx", planDiarioLabel: "Plan Diario (Ciencias)", planDiario2: "documentos/segundo ciclo/4° grado/ciencias naturales 4° grado/5PLAN DE CLASE DIARIO Salud 4°.docx", planDiario2Label: "Plan Diario (Salud)" },
        { id: 248, title: "Ciencias Sociales 4° Grado", category: "vida-social", level: "4-grado", image: "img/portadas/cs4.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estudia la realidad social, histórica y geográfica del Paraguay y la región, fomentando la identidad nacional y el pensamiento crítico.", planAnual: "documentos/segundo ciclo/4° grado/ciencias sociales 4°/4PLAN ANUAL SOCIALES CUARTO.docx", planDiario: "documentos/segundo ciclo/4° grado/ciencias sociales 4°/4PLAN DIARIO DE SOCIALES CUARTO.docx" },
        { id: 241, title: "Castellano 4° Grado", category: "comunicacion", level: "4-grado", image: "img/portadas/lit4.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/segundo ciclo/4° grado/castellano 4° grado/2CASTELLANO 4° PLAN ANUAL 2.02___.docx", planDiario: "documentos/segundo ciclo/4° grado/castellano 4° grado/2CASTELLANO 4º PLAN DIARIO 2.02__.docx" },
        { id: 227, title: "Guaraní 4° Grado", category: "guarani", level: "4-grado", image: "img/portadas/gua4.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Fortalece la competencia comunicativa en lengua guaraní a través de textos literarios y no literarios, valorando nuestra cultura bilingüe.", planAnual: "documentos/segundo ciclo/4° grado/guarani4° grado/1PLAN ANUAL GUARANÍ 4°.docx", planDiario: "documentos/segundo ciclo/4° grado/guarani4° grado/1PLAN DIARIO GUARANÍ 4°.docx" },
        { id: 204, title: "Matemática 4° Grado", category: "matematica", level: "4-grado", image: "img/portadas/mat4.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico y la resolución de problemas mediante situaciones desafiantes adaptadas al nivel escolar.", planAnual: "documentos/segundo ciclo/4° grado/matematica 4° grado/3MATEMATICA 4° PLAN ANUAL 2.02__.docx", planDiario: "documentos/segundo ciclo/4° grado/matematica 4° grado/3PLAN DIARIO DE MATEMATICA 4°.docx" },

        { id: 242, title: "Castellano 5° Grado", category: "comunicacion", level: "5-grado", image: "img/portadas/lit5.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/segundo ciclo/5° grado/castellano 5°/2PLAN ANUAL CASTELLANO 5°.docx", planDiario: "documentos/segundo ciclo/5° grado/castellano 5°/2PLAN DIARIO CASTELLANO 5°.docx" },
        { id: 205, title: "Matemática 5° Grado", category: "matematica", level: "5-grado", image: "img/portadas/mat5.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico-matemático con ejercicios prácticos, resolución de problemas y aplicaciones reales alineadas fielmente al currículum oficial paraguayo vigente.", planAnual: "documentos/segundo ciclo/5° grado/matematica 5°/3PLAN ANUAL MATEMÁTICA 5°.docx", planDiario: "documentos/segundo ciclo/5° grado/matematica 5°/3PLAN DIARIO MATEMÁTICA 5°.docx" },
        { id: 206, title: "Matemática 6° Grado", category: "matematica", level: "6-grado", image: "img/portadas/mat6.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Desarrolla el pensamiento lógico-matemático con ejercicios prácticos, resolución de problemas y aplicaciones reales alineadas fielmente al currículum oficial paraguayo vigente.", planAnual: "documentos/segundo ciclo/6° grado/matematica 6°/3PLAN ANUAL 6° MATEMÁTICA.docx", planDiario: "documentos/segundo ciclo/6° grado/matematica 6°/3PLAN DIARIO 6° MATEMATICA.docx" },

        { id: 243, title: "Castellano 6° Grado", category: "comunicacion", level: "6-grado", image: "img/portadas/lit6.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/segundo ciclo/6° grado/castellano6°/2PLAN ANUAL 6° CASTELLANO.docx", planDiario: "documentos/segundo ciclo/6° grado/castellano6°/2PLAN DIARIO 6° CASTELLANO.docx" },

        { id: 245, title: "Ciencias Naturales 5° Grado", category: "ciencias-naturales", level: "5-grado", image: "img/portadas/c5.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Descubre los secretos de la naturaleza y promueve la salud integral con contenido científico pedagógico adaptado a la curiosidad infantil.", planAnual: "documentos/segundo ciclo/5° grado/ciencias naturales 5° grado/5PLAN ANUAL CIENCIAS Y SALUD 5°.docx", planDiario: "documentos/segundo ciclo/5° grado/ciencias naturales 5° grado/5PLAN DE CLASE DIARIO Ciencias 5°.docx", planDiarioLabel: "Plan Diario (Ciencias)", planDiario2: "documentos/segundo ciclo/5° grado/ciencias naturales 5° grado/5PLAN DE CLASE DIARIO Salud 5°.docx", planDiario2Label: "Plan Diario (Salud)" },
        { id: 246, title: "Ciencias Naturales 6° Grado", category: "ciencias-naturales", level: "6-grado", image: "img/portadas/c6.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Descubre los secretos de la naturaleza y promueve la salud integral con contenido científico pedagógico adaptado a la curiosidad infantil.", planAnual: "documentos/segundo ciclo/6° grado/ciencias naturarales 6°/5PLAN ANUAL CIENCIAS Y SALUD 6°.docx", planDiario: "documentos/segundo ciclo/6° grado/ciencias naturarales 6°/5PLAN DE CLASE DIARIO Ciencias 6°.docx", planDiarioLabel: "Plan Diario (Ciencias)", planDiario2: "documentos/segundo ciclo/6° grado/ciencias naturarales 6°/6PLAN DE CLASE DIARIO Salud 6°.docx", planDiario2Label: "Plan Diario (Salud)" },

        { id: 217, title: "Guaraní 5° Grado", category: "guarani", level: "5-grado", image: "img/portadas/gua5.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo.", planAnual: "documentos/segundo ciclo/5° grado/guarani 5°/1PLAN ANUAL GUARANÍ 5°.docx", planDiario: "documentos/segundo ciclo/5° grado/guarani 5°/1PLAN DIARIO GUARANÍ 5°.docx" },
        { id: 218, title: "Guaraní 6° Grado", category: "guarani", level: "6-grado", image: "img/portadas/gua6.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo.", planAnual: "documentos/segundo ciclo/6° grado/guarani 6°/1PLAN ANUAL 6° GUARANÍ.docx", planDiario: "documentos/segundo ciclo/6° grado/guarani 6°/1PLAN DIARIO 6° GUARANÍ.docx" },

        { id: 265, title: "Caligrafía 5° Grado", category: "caligrafia", level: "5-grado", image: "img/portadas/5gradocaligrafo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía elemental." },
        { id: 266, title: "Caligrafía 6° Grado", category: "caligrafia", level: "6-grado", image: "img/portadas/6gradocaligrafo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía elemental." },


        { id: 249, title: "Ciencias Sociales 5° Grado", category: "ciencias-sociales", level: "5-grado", image: "img/portadas/cs5.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Explora la identidad nacional, historia y geografía con enfoque ciudadano, promoviendo valores éticos y el conocimiento de nuestra realidad social paraguaya.", planAnual: "documentos/segundo ciclo/5° grado/sociales 5°/4PLAN ANUAL SOCIALES QUINTO.docx", planDiario: "documentos/segundo ciclo/5° grado/sociales 5°/4PLAN DIARIO DE SOCIALES 5°.docx" },
        { id: 250, title: "Ciencias Sociales 6° Grado", category: "ciencias-sociales", level: "6-grado", image: "img/portadas/cs6.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Explora la identidad nacional, historia y geografía con enfoque ciudadano, promoviendo valores éticos y el conocimiento de nuestra realidad social paraguaya." },
        { id: 234, title: "Ciencias Sociales 6° Grado", category: "vida-social", level: "6-grado", image: "img/portadas/cs6.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estudia la realidad social, histórica y geográfica del Paraguay y la región, fomentando la identidad nacional y el pensamiento crítico.", planAnual: "documentos/segundo ciclo/6° grado/sociales 6°/4PLAN ANUAL 6° SOCIALES Y TRABAJO.docx", planDiario: "documentos/segundo ciclo/6° grado/sociales 6°/4PLAN DIARIO DE SOCIALES SEXTO.docx" },


        // TERCER CICLO (7°, 8°, 9°)
        { id: 457, title: "Matemática 7° Grado", category: "matematica", level: "7-grado", image: "img/portadas/mat7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Profundiza en el pensamiento lógico-matemático con temas de álgebra, geometría y estadística, preparándote para desafíos académicos superiores.", planAnual: "documentos/matematicatercerciclo/MATEM.7° - PLAN ANUAL.docx", planDiario: "documentos/matematicatercerciclo/MATEM.7° - PLAN DIARIO.docx" },
        { id: 458, title: "Matemática 8° Grado", category: "matematica", level: "8-grado", image: "img/portadas/mat8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Profundiza en el pensamiento lógico-matemático con temas de álgebra, geometría y estadística, preparándote para desafíos académicos superiores.", planAnual: "documentos/matematicatercerciclo/MATEM.8° - PLAN ANUAL.docx", planDiario: "documentos/matematicatercerciclo/MATEM.8° - PLAN DIARIO.docx" },
        { id: 459, title: "Matemática 9° Grado", category: "matematica", level: "9-grado", image: "img/portadas/mat9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Profundiza en el pensamiento lógico-matemático con temas de álgebra, geometría y estadística, preparándote para desafíos académicos superiores.", planAnual: "documentos/matematicatercerciclo/MATEM.9° - PLAN ANUAL.docx", planDiario: "documentos/matematicatercerciclo/MATEM.9° - PLAN DIARIO.docx" },
        { id: 317, title: "Lengua y Literatura Castellana 7° Grado", category: "lengua-castellana", level: "7-grado", image: "img/portadas/lit7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/literatura tercer ciclo/CASTELLANO 7° - PLAN ANUAL.docx", planDiario: "documentos/literatura tercer ciclo/CASTELLANO 7° - PLAN DIARIO.docx" },
        { id: 318, title: "Lengua y Literatura Castellana 8° Grado", category: "lengua-castellana", level: "8-grado", image: "img/portadas/lit8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/literatura tercer ciclo/CASTELLANO 8° - PLAN ANUAL.docx", planDiario: "documentos/literatura tercer ciclo/CASTELLANO 8° - PLAN DIARIO.docx" },
        { id: 319, title: "Lengua y Literatura Castellana 9° Grado", category: "lengua-castellana", level: "9-grado", image: "img/portadas/lit9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos variados que estimulan el análisis crítico y el hábito lector.", planAnual: "documentos/literatura tercer ciclo/CASTELLANO 9° - PLAN ANUAL.docx", planDiario: "documentos/literatura tercer ciclo/CASTELLANO 9° - PLAN DIARIO.docx" },
        { id: 327, title: "Lengua y Literatura Guaraní 7° Grado", category: "lengua-guarani", level: "7-grado", image: "img/portadas/g7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 328, title: "Lengua y Literatura Guaraní 8° Grado", category: "lengua-guarani", level: "8-grado", image: "img/portadas/g8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 329, title: "Lengua y Literatura Guaraní 9° Grado", category: "lengua-guarani", level: "9-grado", image: "img/portadas/g9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 450, title: "Historia y Geografía 7° Grado", category: "historia", level: "7-grado", image: "img/portadas/hyg7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Analiza los procesos históricos y geográficos del Paraguay, América y el mundo, desarrollando una conciencia crítica sobre nuestro pasado y presente.", planAnual: "documentos/historia 3er ciclo/HISTORIA 7° - PLAN ANUAL.docx", planDiario: "documentos/historia 3er ciclo/HISTORIA Y G. 7° - PLAN DIARIO.docx" },
        { id: 451, title: "Historia y Geografía 8° Grado", category: "historia", level: "8-grado", image: "img/portadas/hyg8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Analiza los procesos históricos y geográficos del Paraguay, América y el mundo, desarrollando una conciencia crítica sobre nuestro pasado y presente.", planAnual: "documentos/historia 3er ciclo/HISTORIA 8° - PLAN ANUAL.docx", planDiario: "documentos/historia 3er ciclo/HISTORIA Y G. 8° - PLAN DIARIO.docx" },
        { id: 452, title: "Historia y Geografía 9° Grado", category: "historia", level: "9-grado", image: "img/portadas/hyg9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Analiza los procesos históricos y geográficos del Paraguay, América y el mundo, desarrollando una conciencia crítica sobre nuestro pasado y presente.", planAnual: "documentos/historia 3er ciclo/HISTORIA 9° - PLAN ANUAL.docx", planDiario: "documentos/historia 3er ciclo/HISTORIA Y G. 9° - PLAN DIARIO.docx" },
        { id: 347, title: "Ciencias de la Naturaleza y Salud 7° Grado", category: "ciencias-de-la-naturaleza-y-salud", level: "7-grado", image: "img/portadas/ciencias7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Descubre los secretos de la naturaleza y promueve la salud integral con contenido científico pedagógico adaptado a la curiosidad infantil." },
        { id: 348, title: "Ciencias de la Naturaleza y Salud 8° Grado", category: "ciencias-de-la-naturaleza-y-salud", level: "8-grado", image: "img/portadas/ciencias8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Descubre los secretos de la naturaleza y promueve la salud integral con contenido científico pedagógico adaptado a la curiosidad infantil." },
        { id: 349, title: "Ciencias de la Naturaleza y Salud 9° Grado", category: "ciencias-de-la-naturaleza-y-salud", level: "9-grado", image: "img/portadas/ciencia9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Descubre los secretos de la naturaleza y promueve la salud integral con contenido científico pedagógico adaptado a la curiosidad infantil." },
        { id: 351, title: "Formación Ética y Ciudadana 7°", category: "etica", level: "7-grado", image: "img/portadas/etica7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estimula la reflexión profunda sobre la existencia, sociedad y moralidad, dotando al estudiante de herramientas críticas para la vida ciudadana altamente responsable.", planAnual: "documentos/etica/ETICA7°- PLAN ANUAL.docx", planDiario: "documentos/etica/ETICA7° -  PLAN DIARIO.docx" },
        { id: 352, title: "Formación Ética y Ciudadana 8°", category: "etica", level: "8-grado", image: "img/portadas/etica8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estimula la reflexión profunda sobre la existencia, sociedad y moralidad, dotando al estudiante de herramientas críticas para la vida ciudadana altamente responsable.", planAnual: "documentos/etica/ETICA8°- PLAN ANUAL.docx", planDiario: "documentos/etica/ETICA8° -  PLAN DIARIO.docx" },
        { id: 353, title: "Formación Ética y Ciudadana 9°", category: "etica", level: "9-grado", image: "img/portadas/etica9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estimula la reflexión profunda sobre la existencia, sociedad y moralidad, dotando al estudiante de herramientas críticas para la vida ciudadana altamente responsable.", planAnual: "documentos/etica/ETICA9°- PLAN ANUAL.docx", planDiario: "documentos/etica/ETICA9° -  PLAN DIARIO.docx" },
        { id: 367, title: "Trabajo y Tecnología 7°", category: "trabajo-tecnologia", level: "7-grado", image: "img/portadas/tyt7.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Brinda herramientas prácticas y conocimientos técnicos básicos para el desarrollo de proyectos emprendedores y el uso responsable de las tecnologías modernas." },
        { id: 368, title: "Trabajo y Tecnología 8°", category: "trabajo-tecnologia", level: "8-grado", image: "img/portadas/tyt8.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Brinda herramientas prácticas y conocimientos técnicos básicos para el desarrollo de proyectos emprendedores y el uso responsable de las tecnologías modernas." },
        { id: 369, title: "Trabajo y Tecnología 9°", category: "trabajo-tecnologia", level: "9-grado", image: "img/portadas/tyt9.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Brinda herramientas prácticas y conocimientos técnicos básicos para el desarrollo de proyectos emprendedores y el uso responsable de las tecnologías modernas." },
        { id: 390, title: "Caligrafía 3er Ciclo", category: "caligrafia", level: "7-grado", image: "img/portadas/caligrafo 3er ciclo.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía avanzada." },

        // NIVEL MEDIO (1°, 2°, 3° Curso)
        { id: 463, title: "Matemática 1° Curso", category: "matematica", level: "1-curso", image: "img/portadas/matematico1curso.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Aborda conceptos avanzados de cálculo, álgebra y trigonometría, fortaleciendo el razonamiento abstracto necesario para la educación superior.", planAnual: "documentos/matematica nivel medio/MATEM.1° - PLAN ANUAL.docx", planDiario: "documentos/matematica nivel medio/MATEM.1° - PLAN DIARIO.docx" },
        { id: 464, title: "Matemática 2° Curso", category: "matematica", level: "2-curso", image: "img/portadas/matematico2curso.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Aborda conceptos avanzados de cálculo, álgebra y trigonometría, fortaleciendo el razonamiento abstracto necesario para la educación superior.", planAnual: "documentos/matematica nivel medio/MATEM.2° - PLAN ANUAL.docx", planDiario: "documentos/matematica nivel medio/MATEM.2° - PLAN DIARIO.docx" },
        { id: 490, title: "Matemática 3° Curso", category: "matematica", level: "3-curso", image: "img/portadas/matematico3curso.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Aborda conceptos avanzados de cálculo, álgebra y trigonometría, fortaleciendo el razonamiento abstracto necesario para la educación superior.", planAnual: "documentos/matematica nivel medio/MATEM.3° - PLAN ANUAL.docx", planDiario: "documentos/matematica nivel medio/MATEM.3° - PLAN DIARIO.docx" },
        { id: 401, title: "Literatura 1° Curso", category: "lengua-castellana", level: "1-curso", image: "img/portadas/litcurso1.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos literarios complejos que estimulan el análisis crítico profundo.", planAnual: "documentos/literatura nivel medio/LITERATURA 1° - PLAN ANUAL.docx", planDiario: "documentos/literatura nivel medio/LITERATURA 1° - DIARIO.docx" },
        { id: 402, title: "Literatura 2° Curso", category: "lengua-castellana", level: "2-curso", image: "img/portadas/litcurso2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos literarios complejos que estimulan el análisis crítico profundo.", planAnual: "documentos/literatura nivel medio/LITERATURA 2° - PLAN ANUAL.docx", planDiario: "documentos/literatura nivel medio/LITERATURA 2° - DIARIO.docx" },
        { id: 403, title: "Literatura 3° Curso", category: "lengua-castellana", level: "3-curso", image: "img/portadas/litcurso3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Potencia capacidades de comprensión lectora, expresión escrita y oralidad utilizando textos literarios complejos que estimulan el análisis crítico profundo.", planAnual: "documentos/literatura nivel medio/LITERATURA 3° - PLAN ANUAL.docx", planDiario: "documentos/literatura nivel medio/LITERATURA 3° - DIARIO.docx" },
        { id: 411, title: "Guaraní Ñe'ẽ 1° Curso", category: "lengua-guarani", level: "1-curso", image: "img/portadas/guarani primercurso.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 412, title: "Guaraní Ñe'ẽ 2° Curso", category: "lengua-guarani", level: "2-curso", image: "img/portadas/guarani2.jpeg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 413, title: "Guaraní Ñe'ẽ 3° Curso", category: "lengua-guarani", level: "3-curso", image: "img/portadas/guarani tercercurso.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Integra el aprendizaje de la lengua guaraní con cultura paraguaya, facilitando la comunicación bilingüe mediante gramática básica y vocabulario cotidiano paraguayo." },
        { id: 460, title: "Historia y Geografía 1° Curso", category: "historia", level: "1-curso", image: "img/portadas/hyg1.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Examina en profundidad la historia política, social y económica del Paraguay y contexto global, fomentando la investigación y el debate fundamentado.", planAnual: "documentos/HISTORIA nivel medio/HISTORIA 1° PLAN ANUAL.docx", planDiario: "documentos/HISTORIA nivel medio/HISTORIA1° - PLAN DIARIO.docx" },
        { id: 461, title: "Historia y Geografía 2° Curso", category: "historia", level: "2-curso", image: "img/portadas/hyg2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Examina en profundidad la historia política, social y económica del Paraguay y contexto global, fomentando la investigación y el debate fundamentado.", planAnual: "documentos/HISTORIA nivel medio/HISTORIA 2° PLAN ANUAL.docx", planDiario: "documentos/HISTORIA nivel medio/HISTORIA2° - PLAN DIARIO.docx" },
        { id: 491, title: "Historia y Geografía 3° Curso", category: "historia", level: "3-curso", image: "img/portadas/hyg3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Examina en profundidad la historia política, social y económica del Paraguay y contexto global, fomentando la investigación y el debate fundamentado.", planAnual: "documentos/HISTORIA nivel medio/HISTORIA 3° PLAN ANUAL.docx", planDiario: "documentos/HISTORIA nivel medio/HISTORIA3° - PLAN DIARIO.docx" },
        { id: 442, title: "Física 2° Curso", category: "fisica", level: "2-curso", image: "img/portadas/fisica2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Introduce conceptos científicos fundamentales mediante leyes experimentales, fórmulas aplicadas y situaciones cotidianas que explican el funcionamiento del universo físico circundante.", planAnual: "documentos/fisica/FÍSICA 2° - PLAN ANUAL.docx", planDiario: "documentos/fisica/FÍSICA 2° - PLAN DE CLASE.docx" },
        { id: 443, title: "Física 3° Curso", category: "fisica", level: "3-curso", image: "img/portadas/fisica3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Introduce conceptos científicos fundamentales mediante leyes experimentales, fórmulas aplicadas y situaciones cotidianas que explican el funcionamiento del universo físico circundante.", planAnual: "documentos/fisica/FÍSICA 3° - PLAN ANUAL.docx", planDiario: "documentos/fisica/FÍSICA 3° - PLAN DE CLASE.docx" },
        { id: 452, title: "Química 2° Curso", category: "quimica", level: "2-curso", image: "img/portadas/quimica2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Introduce conceptos científicos fundamentales mediante leyes experimentales, fórmulas aplicadas y situaciones cotidianas que explican el funcionamiento del universo químico circundante." },
        { id: 453, title: "Química 3° Curso", category: "quimica", level: "3-curso", image: "img/portadas/quimmica3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Introduce conceptos científicos fundamentales mediante leyes experimentales, fórmulas aplicadas y situaciones cotidianas que explican el funcionamiento del universo químico circundante." },
        { id: 462, title: "Filosofía 2° Curso", category: "filosofia", level: "2-curso", image: "img/portadas/filosofia2.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estimula la reflexión profunda sobre la existencia, sociedad y moralidad, dotando al estudiante de herramientas críticas para la vida ciudadana altamente responsable.", planAnual: "documentos/filosofia/FILOSOFÍA 2° - PLAN ANUAL.docx", planDiario: "documentos/filosofia/plan-diario.docx" },
        { id: 473, title: "Sociología 3° Curso", category: "sociologia", level: "3-curso", image: "img/portadas/sociologia3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Estudia el comportamiento humano en sociedad, analizando estructuras sociales, instituciones y cambios culturales desde una perspectiva crítica y académica rigurosa.", planAnual: "documentos/sociologia/SOCIOLOGÍA 3° - PLAN ANUAL.docx", planDiario: "documentos/sociologia/SOCIOLOGÍA 3° - PLAN DIARIO.docx" },

        { id: 484, title: "Política 3° Curso", category: "politica", level: "3-curso", image: "img/portadas/politica_3.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Analiza la organización del Estado, la participación ciudadana y los fundamentos de la política paraguaya con un enfoque crítico y democrático.", planAnual: "documentos/politica/POLÍTICA 3° - PLAN ANUAL.docx", planDiario: "documentos/politica/POLÍTICA 3° - PLAN ANUA.xlsx" },
        { id: 490, title: "Caligrafía Nivel Medio", category: "caligrafia", level: "1-curso", image: "img/portadas/caligrafo nivel medio.png", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Mejora la motricidad fina y legibilidad de la escritura mediante trazos progresivos, ejercicios de coordinación y práctica constante de caligrafía profesional." },

        // FORMACIÓN DOCENTE
        { id: 502, title: "Matemática Para Admisión", category: "formacion-docente", level: "formacion-docente", image: "img/portadas/didactica.jpg", file: "documentos/libro-ejemplo.pdf", author: "Equipo Aranduka", description: "Sistema numérico, sistema métrico, sistema algebraico, sistema geométrico, sistema trigonométrico, sistema estadístico y probabilístico." }
    ];

    let books = [];
    try {
        const storedVersion = localStorage.getItem('aranduka_db_version');
        const stored = localStorage.getItem('aranduka_books'); // Correct key per previous context usage

        // Fix: Validación de versión de DB para limpiar datos obsoletos
        if (storedVersion !== DB_VERSION) {
            console.log("Detectada versión antigua de DB. Reseteando...");
            localStorage.clear(); // Limpia todo para evitar conflictos
            localStorage.setItem('aranduka_db_version', DB_VERSION);
            books = JSON.parse(JSON.stringify(defaultBooks));
            localStorage.setItem('aranduka_books', JSON.stringify(books));
        } else {
            const parsed = stored ? JSON.parse(stored) : null;
            // Fix: Validación robusta de array
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                books = parsed;
            } else {
                throw new Error("Datos corruptos o array vacío en LS");
            }
        }
    } catch (e) {
        console.warn("Recuperando estado base por error:", e);
        books = JSON.parse(JSON.stringify(defaultBooks));
        localStorage.setItem('aranduka_db_version', DB_VERSION);
        localStorage.setItem('aranduka_books', JSON.stringify(books));
    }

    // Sort books globally by Rank (Level) then ID to ensure strict sequential order
    books.sort((a, b) => {
        const rankA = getLevelRank(a.level);
        const rankB = getLevelRank(b.level);
        if (rankA !== rankB) return rankA - rankB;
        return a.id - b.id; // Stability fallback
    });

    window.books = books; // Expose globally for onclick handlers

    const educationLevels = {
        "educacion inicial": ["Pre-Jardín", "Jardín", "Pre-Escolar"],
        "primer ciclo": ["1° Grado", "2° Grado", "3° Grado"],
        "segundo ciclo": ["4° Grado", "5° Grado", "6° Grado"],
        "tercer ciclo": ["7° Grado", "8° Grado", "9° Grado"],
        "nivel medio": ["1° Curso", "2° Curso", "3° Curso"]
    };

    // Helper de Normalización MOVIDO ARRIBA (Global Scope)

    // ==========================================
    // 3. CORE FUNCTIONS (RENDER, SEARCH, ETC)
    // ==========================================

    // Elementos DOM Globales
    const elements = {
        booksContainer: document.getElementById('books-container'),
        introTitle: document.getElementById('viewTitle'),
        searchInput: document.getElementById('searchInput'),
        voiceBtn: document.getElementById('voiceSearchBtn'),
        heroCarouselInner: document.getElementById('heroCarouselInner')
    };

    // Inicializar Carrusel Hero
    window.initHeroCarousel = function () {
        if (!elements.heroCarouselInner) return;

        // Ahora mostramos TODOS los libros en el carrusel para máxima visibilidad
        const featuredBooks = books;

        if (featuredBooks.length === 0) return;

        let html = '';
        featuredBooks.forEach((book, index) => {
            html += `
                <div class="carousel-item ${index === 0 ? 'active' : ''} cursor-pointer" onclick="openBookModal(${book.id})">
                    <img src="${book.image}" class="img-fluid rounded shadow-lg" alt="${book.title}" 
                         style="max-height: 350px; margin: 0 auto; display: block;"
                         onerror="this.src='img/portadas/default_cover.png'">
                </div>
            `;
        });

        elements.heroCarouselInner.innerHTML = html;

        // Inicializar con Bootstrap (jQuery ya está cargado)
        $('#heroCarousel').carousel({
            interval: 3000,
            pause: 'hover'
        });
    };

    // Generar Tarjeta HTML
    function generateCard(book, favorites, filterContext = '') {
        const isFav = favorites.includes(book.id);

        // Cart Icon Logic: Green Cart if added, primary Cart Plus if not
        const heartClass = isFav ? 'fas fa-shopping-cart text-success' : 'fas fa-cart-plus text-primary';

        // Fix: Detectar si es libro horizontal (Inicial o Caligrafía)
        const isHorizontal = (book.category === 'inicial' || book.category === 'caligrafia');
        const cardClass = isHorizontal ? 'book-card quick-view-trigger horizontal-mode' : 'book-card quick-view-trigger';

        // Lógica de Subtítulo Dinámico para "Mis Lecciones" (1-3 Grado)
        let displaySubtitle = book.subtitle ? escapeHTML(book.subtitle) : book.category.replace(/-/g, ' ').toUpperCase();

        // IDs: 231, 232, 233, 234 (Mis Lecciones 1-3)
        // Check fuzzy title match just in case IDs shift, but IDs are safer: 231-233 defined in recent edits
        if ([231, 232, 233].includes(book.id)) {
            // Normalizar contexto para comparación
            const ctx = appNormalize(filterContext);
            if (ctx.includes('ciencias') || ctx.includes('naturaleza') || ctx.includes('salud')) {
                displaySubtitle = "Medio Natural y Salud";
            } else if (ctx.includes('social') || ctx.includes('trabajo')) {
                displaySubtitle = "Vida Social y Trabajo";
            }
        }

        return `
            <div class="${cardClass}" data-id="${book.id}">
                <button class="btn btn-sm fav-btn" data-id="${book.id}" 
                    style="position: absolute; top: 8px; left: 8px; z-index: 25; background: rgba(255,255,255,0.95); border-radius: 50%; width: 48px; height: 48px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 1.3rem; display: flex; align-items: center; justify-content: center;">
                    <i class="${heartClass}"></i>
                </button>
                <div class="book-cover">
                    <img src="${book.image}" alt="${book.title}" loading="lazy" 
                         onerror="this.onerror=null; this.src='img/portadas/default_cover.png';">
                </div>
                <div class="book-info">
                    <h4>${escapeHTML(book.title)}</h4>
                    <p style="font-size: 0.75rem; line-height: 1.2; margin-bottom: 1rem;">${displaySubtitle}</p>
                    <button type="button" class="btn btn-outline-primary btn-sm px-4">Ver Detalles</button>
                </div>
            </div>`;
    }


    // Renderizado de Grilla de Grados (Filtro Dinámico) - User Request
    window.renderGradesFilter = function (filterLevel = 'all') {
        const navContainer = document.getElementById('levels-navbar');
        // We no longer use gridContainer, we use books-container via renderBooks

        if (!navContainer) return;

        // 2. Render Secondary Filter Bar (Pills Style)
        const levels = Object.keys(educationLevels);
        navContainer.style.display = 'block'; // Ensure visible

        // Diseño Mejorado de Botones - Adaptación Móvil (Horizontal Scroll)
        let navHtml = `
            <div class="container-fluid pt-2 px-0 text-center">
                <style>
                    /* Mobile Horizontal Scroll Styles */
                    .mobile-scroll-nav {
                        display: flex;
                        flex-wrap: nowrap;
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        padding-bottom: 5px; /* Hide scrollbar visual impact */
                        margin-bottom: 10px;
                        gap: 10px;
                        justify-content: flex-start;
                        padding-left: 15px; /* Left padding for first item */
                        padding-right: 15px;
                    }
                    /* Scrollbar hiding */
                    .mobile-scroll-nav::-webkit-scrollbar {
                        display: none;
                    }
                    /* Desktop Override */
                    @media (min-width: 768px) {
                        .mobile-scroll-nav {
                            flex-wrap: wrap;
                            justify-content: center;
                            overflow-x: visible;
                            padding-left: 0;
                            padding-right: 0;
                        }
                    }
                </style>
                <div class="mobile-scroll-nav">
                    <button class="btn ${filterLevel === 'all' ? 'btn-dark shadow' : 'btn-light border'} rounded-pill px-4 py-2 font-weight-bold flex-shrink-0" 
                       onclick="renderGradesFilter('all')" 
                       style="transition: all 0.2s; ${filterLevel !== 'all' ? 'color: #555;' : ''}; white-space: nowrap;">
                       Todos
                    </button>
                    ${levels.map(lvl => `
                        <button class="btn ${filterLevel === lvl ? 'btn-dark shadow' : 'btn-light border'} rounded-pill px-4 py-2 font-weight-bold flex-shrink-0" 
                           onclick="renderGradesFilter('${lvl}')"
                           style="transition: all 0.2s; ${filterLevel !== lvl ? 'color: #555;' : ''}; white-space: nowrap;">
                           ${lvl.replace(/-/g, ' ').toUpperCase()}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        navContainer.innerHTML = navHtml;

        // 3. Render Books Directly (User Request: "Solo los libros")
        if (filterLevel === 'all') {
            renderBooks('all');
        } else {
            // New: Filter by Cycle Logic in renderBooks
            renderBooks('filter', filterLevel);
        }
    };

    // Renderizado Principal
    window.renderBooks = function (filterType, filterValue, shouldScroll = true) {
        const container = elements.booksContainer;
        if (!container) return; // Prevent errors on pages without this container (e.g. admin.html)

        // Limpiar modo selección si estaba activo
        container.classList.remove('selection-mode');

        // Restaurar título principal
        const mainTitle = document.getElementById('viewTitle');
        if (mainTitle) {
            mainTitle.style.display = 'block';
            mainTitle.style.opacity = '1';
        }

        container.innerHTML = '';
        const favorites = JSON.parse(localStorage.getItem('aranduka_favorites') || '[]');
        let filtered = [];

        if (filterType === 'all') {
            filtered = books;
            if (elements.introTitle) elements.introTitle.innerText = "Todos los Materiales";
        } else if (filterType === 'favorites') {
            // Logic Split: Active Cart vs History
            filtered = books.filter(b => favorites.includes(b.id)); // Items in Active Cart
            if (elements.introTitle) elements.introTitle.innerText = "Mi Pedido";

            // Note: We handle the rendering of History inside the else block below


            // Add Checkout Button if cart has items
            if (filtered.length > 0) {
                const totalItems = filtered.length;
                const checkoutBtn = `
                    <div class="col-12 text-center mb-4 fade-in-up">
                        <div class="card shadow-sm border-success bg-light">
                            <div class="card-body py-3 d-flex flex-column flex-md-row align-items-center justify-content-between">
                                <h5 class="mb-2 mb-md-0 text-success"><i class="fas fa-shopping-bag mr-2"></i> Tienes <strong>${totalItems}</strong> libros en tu pedido</h5>
                                <button class="btn btn-success font-weight-bold px-4 py-2 pulse-animation" onclick="checkoutOrder()">
                                     <i class="fab fa-whatsapp mr-2"></i> Terminar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                // Inject at the beginning of the grid
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = checkoutBtn;
                // We will prepend this to container after loop, or handled differently? 
                // renderBooks logic clears container first. 
                // We need to add it to htmlAccumulator? 
                // Currently htmlAccumulator is just cards. 
                // Let's modify the loop logic below instead.
            }
        } else if (filterType === 'search') {
            const term = appNormalize(filterValue);
            filtered = books.filter(b => {
                const titleMatch = appNormalize(b.title).includes(term);
                const levelMatch = appNormalize(b.level).includes(term);

                // Handle category safely (string or array)
                let catMatch = false;
                if (Array.isArray(b.category)) {
                    catMatch = b.category.some(c => appNormalize(c).includes(term));
                } else {
                    catMatch = appNormalize(b.category).includes(term);
                }

                return titleMatch || levelMatch || catMatch;
            });
            if (elements.introTitle) elements.introTitle.innerText = `Resultados: "${filterValue}"`;
        } else if (filterType === 'filter') {
            const target = appNormalize(filterValue);

            // Check if filterValue is a Cycle Key (Level Group)
            const cycleKey = Object.keys(educationLevels).find(k => k === filterValue || appNormalize(k) === target);
            const cycleGrades = cycleKey ? educationLevels[cycleKey] : null;

            filtered = books.filter(b => {
                const bLevel = appNormalize(b.level);

                // Support both string and array for categories
                const categories = Array.isArray(b.category)
                    ? b.category.map(c => appNormalize(c))
                    : [appNormalize(b.category)];

                // Match Logic updated for Cycle support
                const isDirectMatch = bLevel === target ||
                    categories.includes(target) ||
                    bLevel.includes(target) ||
                    target.includes(bLevel);

                // If it's a Cycle Filter, match if book level is in the cycle's grades
                let isCycleMatch = false;
                if (cycleGrades) {
                    // cycleGrades e.g. ["1° Grado", ...]
                    // book.level e.g. "1-grado"
                    // We normalize check
                    isCycleMatch = cycleGrades.some(g => appNormalize(g) === bLevel);
                }

                return isDirectMatch || isCycleMatch;
            });

            if (elements.introTitle) elements.introTitle.innerText = filterValue.replace(/-/g, ' ').toUpperCase();

            // Si el filtro es un Grado Específico, mostrar la barra de navegación de Ciclo
            // SOLO si NO estamos en el modo "Niveles y Grados" (que ya tiene su propia barra)
            // Check if we are in 'secciones' tab
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.dataset.target !== 'secciones') {
                const cycleKeyForNav = Object.keys(educationLevels).find(k => educationLevels[k].includes(filterValue));
                if (cycleKeyForNav) {
                    renderCycleNav(cycleKeyForNav, filterValue);
                } else {
                    removeCycleNav();
                }
            } else {
                // En modo 'secciones', no queremos la barra secundaria duplicada
                removeCycleNav();
            }
        }
        updateBreadcrumbs(filterType, filterValue);

        if (filtered.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted"><p>No se encontraron libros para esta categoría.</p></div>';
        } else {
            let htmlAccumulator = '';

            // Inject Checkout Button for Favorites/Cart View
            if (filterType === 'favorites') {
                // 1. Active Cart Section
                if (filtered.length > 0) {
                    htmlAccumulator += `
                        <div class="col-12 text-center mb-4">
                            <div class="alert alert-success shadow-sm d-inline-block px-5 py-3 rounded-pill cursor-pointer" onclick="checkoutOrder()">
                                <h5 class="m-0 font-weight-bold"><i class="fab fa-whatsapp mr-2"></i> Terminar Pedido (${filtered.length} libros)</h5>
                            </div>
                        </div>
                     `;
                    filtered.forEach(book => htmlAccumulator += generateCard(book, favorites, filterValue));
                } else {
                    htmlAccumulator += '<div class="col-12 text-center py-3 text-muted">No tienes libros en tu carrito actual.</div>';
                }

                // 2. Order History Section
                const history = JSON.parse(localStorage.getItem('aranduka_order_history') || '[]');
                if (history.length > 0) {
                    htmlAccumulator += `
                        <div class="col-12 mt-5 mb-3 border-top pt-4">
                            <h4 class="text-secondary"><i class="fas fa-history mr-2"></i> Historial de Pedidos</h4>
                        </div>
                    `;

                    history.forEach(order => {
                        htmlAccumulator += `
                            <div class="col-12 mb-3">
                                <div class="card shadow-sm border-left-info">
                                    <div class="card-body">
                                        <div class="d-flex justify-content-between align-items-center mb-2">
                                            <h6 class="font-weight-bold text-info"><i class="fas fa-calendar-check mr-2"></i> Pedido del ${order.date}</h6>
                                            <span class="badge badge-info">${order.total} Libros</span>
                                        </div>
                                        <ul class="list-unstyled mb-0 pl-3 border-left">
                                            ${order.items.map(item => `<li class="small text-muted">${item.title}</li>`).join('')}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            } else {
                // Normal Rendering for other views
                filtered.forEach(book => htmlAccumulator += generateCard(book, favorites));
            }

            container.innerHTML = htmlAccumulator;

            // Animación de entrada
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            document.querySelectorAll('.book-card').forEach(card => observer.observe(card));
        }

        // Scroll suave a los resultados SOLO si es una acción manual (no al cargar página)
        if (shouldScroll) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Grilla de Grados (Diseño Rediseñado - Image 0)
    window.showGradeGrid = function (level) {
        if (window.removeCycleNav) removeCycleNav();
        const container = elements.booksContainer;
        container.classList.add('selection-mode');

        const grades = educationLevels[level] || [];

        container.innerHTML = `
            <div class="container">
                <div class="grade-selection-header">
                    <a href="javascript:void(0)" class="btn-back-home" onclick="hardReset()">
                        <i class="fas fa-chevron-left"></i> Volver al Inicio
                    </a>
                    <h5 class="selection-title-blue">Selecciona un Grado</h5>
                </div>
                
                <div class="row grade-grid-container">
                    ${grades.map(g => `
                        <div class="col-6 col-md-4 mb-4">
                            <div class="grade-card shadow-sm p-3 bg-white rounded text-center h-100 d-flex flex-column align-items-center justify-content-center border" onclick="renderBooks('filter', '${g}')" role="button" tabindex="0" onkeypress="if(event.key==='Enter') renderBooks('filter', '${g}')" style="cursor: pointer; transition: transform 0.2s;">
                                <div class="icon-box mb-2 text-primary" style="font-size: 2rem;">
                                    <i class="fas fa-graduation-cap"></i>
                                </div>
                                <h6 class="font-weight-bold text-dark mb-0" style="word-wrap: break-word;">${g}</h6>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Ocultar título duplicado (pero manejar historial para poder volver)
        const mainTitle = document.getElementById('viewTitle');
        if (mainTitle) mainTitle.style.display = 'none';

        // Push State para navegación
        const currentState = window.history.state;
        if (!currentState || currentState.view !== 'gradeGrid' || currentState.level !== level) {
            window.history.pushState({ view: 'gradeGrid', level: level }, "", "#grade-" + level.replace(/\s+/g, '-'));
        }

        // Scroll suave
        // Scroll suave hacia ABAJO (al contenido)
        // Scroll suave hacia ABAJO (al contenido)
        // Intentamos scrollear al encabezado interno "Selecciona un Grado"
        setTimeout(() => {
            const internalHeader = container.querySelector('.grade-selection-header');
            if (internalHeader) {
                // Scroll al header interno - 100px para dar aire
                const y = internalHeader.getBoundingClientRect().top + window.scrollY - 100;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }, 100);
    };

    // ==========================================
    // 4. AI WIZARD CONTROLLER (SINTAXIS CORREGIDA)
    // ==========================================
    const AiWizardController = {
        // PROMPTS ACTUALIZADOS (MEC PARAGUAY)
        prompts: {
            plan: (data, book) => `
📋 ** ROL:** Actúa como un experto Pedagogo y Especialista Curricular del MEC(Paraguay).
📚 ** CONTEXTO:** Libro "${book.title}", Nivel "${book.level}".
🎯 ** OBJETIVO:** Crear una PLANIFICACIÓN DIARIA DE CLASE.

⚙️ ** DATOS:** Tema: "${data.topic}", Duración: ${data.duration}, Enfoque: ${data.tone}.

📝 ** ESTRUCTURA OBLIGATORIA(MEC):**
        1. ** Identificación:** Grado y tema.
2. ** Capacidades:** Acordes al currículum nacional.
3. ** Indicadores:** 3 - 4 indicadores evaluables.
4. ** Momentos Didácticos:**
   - ** Inicio:** Motivación / Recuperación de saberes.
   - ** Desarrollo:** Actividades con el libro(lectura, ejercicios).
   - ** Cierre:** Fijación y metacognición.
5. ** Estrategias Metodológicas:** Métodos activos.
6. ** Recursos.**

💡 Usa formato Markdown limpio.`,

            exam: (data, book) => `
📝 ** ROL:** Evaluador Educativo Experto.
📚 ** CONTEXTO:** Libro "${book.title}", Nivel "${book.level}".
🎯 ** OBJETIVO:** Diseñar EXAMEN ESCRITO sobre "${data.topic}".
📊 ** DIFICULTAD:** ${data.complexity}.
💯 ** PUNTAJE TOTAL:** ${data.points} puntos.

📄 ** ESTRUCTURA:**
        1. ** Encabezado:** Datos del alumno.
2. ** I.Selección Múltiple(5 ítems).**
        3. ** II.Verdadero o Falso(5 ítems) ** (justificar falsas).
4. ** III.Resolución / Desarrollo(1 ítem).**

✅ ** AL FINAL:** Incluye la HOJA DE RESPUESTAS para el docente.`,

            rubric: (data, book) => `
📊 ** ROL:** Especialista en Evaluación.
🎯 ** OBJETIVO:** RÚBRICA DE EVALUACIÓN para "${data.topic}"(${book.level}).

🛠 ** TABLA MARKDOWN:**
- ** Criterios(Filas):** 4 criterios(ej: Conceptual, Procedimental, Actitudinal).
- ** Escala(Columnas):** Logrado(5), En Proceso(3), No Logrado(1).
💡 Incluye fórmula de calificación.`,

            dynamics: (data, book) => `
🎉 ** ROL:** Animador y Docente.
🎯 ** OBJETIVO:** 3 DINÁMICAS DE CLASE para "${data.topic}".
1. ** Rompehielo(Inicio).**
    2. ** Gamificación(Desarrollo).**
    3. ** Reflexión(Cierre).**
🇵🇾 ** BONUS:** Incluye elementos de cultura paraguaya o guaraní.`,

            slide: (data, book) => `
📽️ ** ROL:** Experto en Diseño de Presentaciones Educativas para Gamma App.
🎯 ** OBJETIVO:** Crear una PRESENTACIÓN IMPACTANTE sobre "${data.topic}".
📚 ** CONTEXTO:** Basado en el libro "${book.title}"(${book.level}).

✨ ** REGLAS DE DISEÑO PARA LA IA(GAMMA):**
    1. ** ESTILO:** Moderno, minimalista y visualmente WOW.Usa temas oscuros o elegantes.
2. ** SLIDES:** Genera un esquema de 8 - 10 diapositivas.
3. ** CONTENIDO:**
    - Títulos grandes y llamativos.
   - Máximo 3 puntos clave por slide(texto breve y potente).
   - Descripciones de imágenes cinemáticas y profesionales(estilo 4k, realista o flat design).
4. ** FLUJO:** Introducción, Desarrollo interactivo del tema "${data.topic}", y Cierre con preguntas de reflexión.

🚀 ** META:** Que el docente simplemente pegue este prompt y obtenga una presentación lista para proyectar(${data.tone}).`
        },

        open: function (book, initialTool = null) {
            // Fix: ID Único más robusto para prevenir colisiones en clics rápidos
            const winId = 'ai-win-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

            // DIRECTO A SLIDES - MODIFICACIÓN SOLICITADA
            // "Solo deja la opcion de hacer el powerpoint y avisar que solo es para hacer"

            const step1Html = `
                <div id="${winId}-data" data-book-title="${escapeHTML(book.title)}" data-book-level="${escapeHTML(book.level)}" data-book-category="${escapeHTML(book.category || '')}"></div>
                <div class="text-center p-3">
                    <div class="alert alert-warning shadow-sm mb-4">
                        <i class="fas fa-exclamation-triangle mr-2"></i> <strong>Atención:</strong> Esta herramienta es exclusivamente para crear presentaciones (PowerPoint).
                    </div>
                    <div id="${winId}-slide-content">
                        <!-- Content will be injected here by goToStep2 -->
                    </div>
                </div>
            `;

            WindowManager.create(winId, `Asistente IA - ${book.title}`, step1Html);

            // Forzar inmediatamente la herramienta 'slide'
            // Pequeño timeout para asegurar que el DOM del modal existe
            setTimeout(() => {
                // Hack: Simulamos que el container es el div interno que acabamos de crear
                // Para no romper la lógica existente de goToStep2 que busca id-content
                // Pero goToStep2 busca id-content... el modal crea id-content.
                // Así que simplemente llamamos a goToStep2.
                // El 'content' del modal es todo el HTML. goToStep2 reemplaza el contenido.
                // Espera, goToStep2 reemplaza todo el innerHTML del container.
                // Entonces si llamo a goToStep2, borrará mi alerta.
                // MALA IDEA. 

                // MEJOR ESTRATEGIA:
                // Llamar a goToStep2, pero modificar goToStep2 para que si es 'slide', agregue la alerta?
                // O mejor, modificar open para que renderice directamente lo que renderiza goToStep2('slide') + la alerta.

                this.goToStep2(winId, 'slide');

                // INYECTAR LA ALERTA DESPUÉS (porque goToStep2 sobrescribe)
                setTimeout(() => {
                    const container = document.getElementById(winId + '-content');
                    if (container) {
                        const alertDiv = document.createElement('div');
                        alertDiv.className = 'alert alert-warning shadow-sm mb-3';
                        alertDiv.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> <strong>Solo PowerPoint:</strong> Esta función está optimizada únicamente para generar diapositivas.';
                        container.insertBefore(alertDiv, container.firstChild);
                    }
                }, 100);

            }, 50);
        },

        goToStep2: function (winId, tool) {
            // console.log("goToStep2 called:", winId, tool);
            const container = document.getElementById(winId + '-content');
            if (!container) return;

            // 1. CAPTURAR DATOS
            const oldDataEl = document.getElementById(winId + '-data');
            const bookTitle = oldDataEl ? oldDataEl.dataset.bookTitle : "";
            const bookLevel = oldDataEl ? oldDataEl.dataset.bookLevel : "";
            const bookCategory = oldDataEl ? oldDataEl.dataset.bookCategory : "";
            const book = { title: bookTitle, level: bookLevel };

            // 2. CASO ESPECIAL: SLIDES (Mantiene guia original)
            if (tool === 'slide') {
                const specializedPrompt = `Actúa como un experto en análisis de contenido. Vas a resumir un PDF de un libro. Realiza un resumen del contenido extrayendo las ideas clave, argumentos principales y conclusiones de forma detallada y precisa, presentándolos de forma concisa y clara. El resumen debe ser completamente objetivo, cubriendo los puntos más relevantes sin añadir opiniones personales. Proporciona una visión general completa que permita entender el libro sin necesidad de leerlo por completo. Mantén un tono formal y académico, e incluye los nombres de los autores principales citados si son relevantes, así como fechas o contextos históricos importantes.`;

                container.innerHTML = `
    <div class="px-2 pb-3">
                        <div class="timeline-container">

                            <!-- STEP 1: PROMPT -->
                            <div class="timeline-item">
                                <div class="timeline-icon-box">
                                    <i class="fas fa-robot"></i>
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-step-title">
                                        <h5>Paso 1: Copia el Prompt Maestro</h5>
                                        <span class="badge badge-light text-muted">IA Analysis</span>
                                    </div>
                                    <p class="text-muted small mb-3">Este comando instruye a la IA para extraer las ideas clave del libro.</p>

                                    <div class="prompt-code-box shadow-inner" id="prompt-text-${winId}">
                                        ${specializedPrompt}
                                    </div>

                                    <div class="d-flex justify-content-end">
                                        <button class="btn btn-action-outline" onclick="copyText('${specializedPrompt}', this)">
                                            <i class="fas fa-copy"></i> Copiar Código
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- STEP 2: CHATGPT -->
                            <div class="timeline-item">
                                <div class="timeline-icon-box">
                                    <i class="fas fa-file-pdf"></i>
                                </div>
                                <div class="timeline-content">
                                    <div class="timeline-step-title">
                                        <h5>Paso 2: Genera el Resumen</h5>
                                        <span class="badge badge-light text-muted">ChatGPT / Claude</span>
                                    </div>
                                    <p class="text-muted small mb-3">Pega el prompt copiado y <strong>adjunta tu archivo PDF</strong> en ChatGPT.</p>
                                    <button class="btn btn-block btn-light border py-3 font-weight-bold" onclick="window.open('https://chatgpt.com', '_blank')">
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" width="20" class="mr-2"> Abrir ChatGPT
                                    </button>
                                </div>
                            </div>

                            <!-- STEP 3: GAMMA -->
                            <div class="timeline-item">
                                <div class="timeline-icon-box" style="background: linear-gradient(135deg, #8146FF 0%, #6D3AFF 100%); color: white; border: none;">
                                    <i class="fas fa-magic"></i>
                                </div>
                                <div class="timeline-content" style="border-left: 4px solid #8146FF;">
                                    <div class="timeline-step-title">
                                        <h5>Paso 3: Crea los Slides</h5>
                                        <span class="badge badge-warning text-white">Magia Pura</span>
                                    </div>
                                    <p class="text-muted small mb-3">En Gamma.app, selecciona <strong>"Paste text"</strong> y pega el resumen que te dio ChatGPT.</p>
                                    <button class="btn btn-action-premium btn-block py-3" onclick="window.open('https://gamma.app/create', '_blank')" style="background: linear-gradient(135deg, #8146FF 0%, #6D3AFF 100%);">
                                        <i class="fas fa-bolt"></i> Ir a Gamma.app
                                    </button>
                                </div>
                            </div>

                        </div>
    </div > `;

                // Helper de copiado local para este view
                window.copyText = (text, btn) => {
                    navigator.clipboard.writeText(text).then(() => {
                        const original = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                        btn.classList.add('btn-success');
                        setTimeout(() => {
                            btn.innerHTML = original;
                            btn.classList.remove('btn-success');
                        }, 2000);
                    });
                };

                const win = document.getElementById(winId);
                if (win) { win.style.maxWidth = "1100px"; win.style.width = "95%"; }
                return;
            }

            // 3. CASO GENERAL: PLAN O EXAMEN
            const isExam = tool === 'exam';

            // Si es Examen, mostramos formulario completo
            // Si es Examen, mostramos formulario completo
            if (isExam) {
                container.innerHTML = `
        <div id="${winId}-data"
    data-book-title="${escapeHTML(bookTitle)}"
    data-book-level="${escapeHTML(bookLevel)}"
    data-book-category="${escapeHTML(bookCategory)}"
    data-tool="exam">
                    </div>

                    <div class="mb-3">
                        <label class="font-weight-bold">Tema del Examen:</label>
                        <input type="text" id="topic-${winId}" class="form-control" placeholder="Ej: La Célula y sus partes">
                    </div>
                    
                    <div class="row">
                        <div class="col-6 mb-3">
                             <label class="font-weight-bold">Dificultad:</label>
                             <select id="comp-${winId}" class="form-control">
                                <option value="Baja">Baja</option>
                                <option value="Media" selected>Media</option>
                                <option value="Alta">Alta</option>
                             </select>
                        </div>
                        <div class="col-6 mb-3">
                             <label class="font-weight-bold">Puntaje Total:</label>
                             <input type="text" id="pts-${winId}" class="form-control" value="10 puntos" placeholder="Ej: 20 pts">
                        </div>
                    </div>

                    <div class="alert alert-info small">
                        <i class="fas fa-info-circle"></i> Se generará un examen con selección múltiple, V/F y desarrollo.
                    </div>

                    <button class="btn btn-success btn-block shadow-sm font-weight-bold p-3" onclick="AiWizardController.generate('${winId}')">
                        <i class="fas fa-bolt mr-2"></i> Generar Examen
                    </button>
                    <button class="btn btn-link btn-block text-muted" onclick="AiWizardController.open(window.books.find(b=>b.title==='${escapeHTML(bookTitle)}'))">Volver atrás</button>
    `;
                return;
            }

            // Si es Plan de Clase (u otro), flujo directo simplificado solo con Tema
            // Valores por defecto para Plan
            const data = {
                topic: "[INSERTAR TEMA ESPECÍFICO AQUÍ]",
                duration: "80 min",
                tone: "Estándar",
                complexity: "Media",
                points: "10 pts"
            };

            // Generar prompt inmediatamente
            const finalPrompt = this.prompts[tool](data, book);
            const platformUrl = 'https://chatgpt.com/';

            // Renderizar Vista de Éxito Directamente
            container.innerHTML = `
        <div class="text-center">
                    <div class="mb-3">
                        <i class="fas fa-magic fa-3x text-primary"></i>
                    </div>
                    <h5 class="mb-2">¡Prompt Listo!</h5>
                    <div class="alert alert-warning text-left small shadow-sm">
                        <i class="fas fa-exclamation-triangle mr-1"></i>
                        El prompt tiene un espacio: <strong>[INSERTAR TEMA]</strong>. <br>Recuerda escribir tu tema al pegarlo en ChatGPT.
                    </div>
                    
                    <button class="btn btn-primary btn-block mb-3 shadow-lg p-3 font-weight-bold" onclick="window.open('${platformUrl}', '_blank')">
                        <i class="fas fa-external-link-alt mr-2"></i> Abrir ChatGPT
                    </button>

                    <div class="p-3 bg-light rounded text-left mb-3" style="max-height: 200px; overflow-y: auto; font-size: 0.85rem; border: 1px solid #eee;">
                        <code id="final-prompt-${winId}">${escapeHTML(finalPrompt)}</code>
                    </div>
                    
                    <button class="btn btn-outline-info btn-block mb-2 btn-sm" onclick="AiWizardController.manualCopy('${winId}')">
                        <i class="fas fa-copy mr-2"></i> Copiar Prompt
                    </button>
                    <button class="btn btn-link text-muted btn-sm" onclick="WindowManager.close('${winId}')">Cerrar</button>
                </div>
        `;

            // Auto-Copy (Mejor UX)
            navigator.clipboard.writeText(finalPrompt).then(() => {
                const toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
                toast.fire({
                    icon: 'success',
                    title: '¡Prompt copiado al portapapeles!'
                });
            });
        },

        generate: function (winId) {
            try {
                console.log("Generando prompt para:", winId);
                const topicInput = document.getElementById(`topic-${winId}`);
                if (!topicInput) throw new Error("No se encontró el campo de tema (Input ID: topic-" + winId + ")");

                const topic = topicInput.value;
                if (!topic) return alert("Por favor escribe un tema específico para generar el contenido.");

                const dataEl = document.getElementById(winId + '-data');
                if (!dataEl) throw new Error("No se encontraron los datos ocultos del modal.");

                const tool = dataEl.dataset.tool;
                const usePlanSwitch = document.getElementById(`usePlan-${winId}`);
                const usePlan = usePlanSwitch ? usePlanSwitch.checked : false;

                // LOGICA ESPECIAL: SI USA PLAN ANUAL, MOSTRAR GUIA EN LUGAR DE GENERAR DIRECTO
                if (usePlan) {
                    const planUrl = dataEl.dataset.planAnual;
                    const contextPrompt = `Soy profesor. He adjuntado el Plan Anual de la materia. Basándote ESTRICTAMENTE en ese documento, genera un Plan de Clase detallado para el tema "${topic}". Asegúrate de alinear los objetivos, indicadores y actividades con lo establecido en el documento para este nivel. El formato debe ser académico y oficial.`;

                    const container = document.getElementById(winId + '-content');
                    container.innerHTML = `
        <div class="slide-guide-container">
                        <div class="row">
                            <div class="col-md-4 guide-step">
                                <div class="step-header"><i class="fas fa-file-download"></i> <span>Paso 1: Descargar</span></div>
                                <p class="small text-muted">Descarga el Plan Anual oficial para tenerlo a mano.</p>
                                <button class="btn btn-outline-info btn-block btn-sm" onclick="window.open('${planUrl}', '_blank')">
                                    <i class="fas fa-download"></i> Descargar PDF
                                </button>
                            </div>
                            <div class="col-md-4 guide-step">
                                <div class="step-header"><i class="fas fa-robot"></i> <span>Paso 2: Prompt Contextual</span></div>
                                <p class="small text-muted">Copia este prompt que instruye a la IA a usar tu archivo.</p>
                                <div class="prompt-box mb-2">
                                    <p id="ctx-prompt-${winId}" class="small mb-1" style="font-size:0.7rem;">${contextPrompt}</p>
                                    <button class="btn btn-prompt-copy btn-sm w-100" onclick="navigator.clipboard.writeText(document.getElementById('ctx-prompt-${winId}').innerText).then(()=>alert('Copiado!'))">
                                        <i class="fas fa-copy"></i> Copiar Prompt
                                    </button>
                                </div>
                            </div>
                            <div class="col-md-4 guide-step">
                                <div class="step-header"><i class="fas fa-external-link-alt"></i> <span>Paso 3: Ejecutar</span></div>
                                <p class="small text-muted">Abre ChatGPT, <strong>adjunta el PDF descargado</strong> y pega el prompt.</p>
                                <button class="btn btn-primary btn-block" onclick="window.open('https://chatgpt.com', '_blank')">
                                    Ir a ChatGPT
                                </button>
                            </div>
                        </div>
                        <button class="btn btn-link btn-block mt-3 text-muted" onclick="AiWizardController.open(window.books.find(b=>b.title==='${escapeHTML(dataEl.dataset.bookTitle)}'))">Volver atrás</button>
                    </div>`;
                    return; // Detener flujo normal
                }

                if (!tool) throw new Error("No se ha seleccionado una herramienta válida.");

                const data = {
                    topic,
                    duration: document.getElementById(`dur-${winId}`) ? document.getElementById(`dur-${winId}`).value : "80 min",
                    tone: document.getElementById(`tone-${winId}`) ? document.getElementById(`tone-${winId}`).value : "Estándar",
                    complexity: document.getElementById(`comp-${winId}`) ? document.getElementById(`comp-${winId}`).value : "Media",
                    points: document.getElementById(`pts-${winId}`) ? document.getElementById(`pts-${winId}`).value : "10 pts"
                };

                const bookTitle = dataEl.dataset.bookTitle || "Libro sin título";
                const bookLevel = dataEl.dataset.bookLevel || "Nivel general";
                const book = { title: bookTitle, level: bookLevel };

                console.log("Datos para prompt:", { data, book, tool });

                if (!this.prompts[tool]) throw new Error("El tipo de prompt '" + tool + "' no existe.");

                const finalPrompt = this.prompts[tool](data, book);

                const platformUrl = (tool === 'slide') ? 'https://gamma.app/' : 'https://chatgpt.com/';

                // ACCIÓN: COPIAR Y LLAMAR A LA ACCIÓN
                navigator.clipboard.writeText(finalPrompt).then(() => {
                    // YA se copió. Ahora pedimos confirmación para irnos (UX más pausada)
                    Swal.fire({
                        title: '¡Prompt Copiado con Éxito!',
                        html: '<p>El contenido ya está en tu portapapeles.</p><p class="small text-muted mb-0">Ahora vamos a la IA para que lo pegues (Ctrl + V).</p>',
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonText: 'Ir a ' + (tool === 'slide' ? 'Gamma' : 'ChatGPT') + ' <i class="fas fa-external-link-alt"></i>',
                        cancelButtonText: 'Quedarme aquí',
                        confirmButtonColor: '#4A7C8C',
                        cancelButtonColor: '#6c757d',
                        reverseButtons: true
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.open(platformUrl, '_blank');
                        }
                    });

                }).catch(err => {
                    console.error("Error al copiar al portapapeles:", err);
                    Swal.fire({
                        title: 'Error de Copiado',
                        text: 'No pudimos copiar el texto automáticamente. Por favor selecciónalo y cópialo manualmente de la ventana.',
                        icon: 'error',
                        confirmButtonText: 'Entendido'
                    });
                });

                const container = document.getElementById(winId + '-content');
                if (container) {
                    container.innerHTML = `
        < div class="text-center" >
                            <div class="mb-3">
                                <i class="fas fa-check-circle fa-3x text-success"></i>
                            </div>
                            <h5 class="mb-2">¡Todo Listo!</h5>
                            <div class="alert alert-info text-left small shadow-sm">
                                <i class="fas fa-info-circle mr-1"></i>
                                Si decidiste abrir la IA, <strong>presiona "Ctrl + V"</strong> en el chat para pegar tu prompt.
                            </div>
                            
                            <button class="btn btn-primary btn-block mb-2 shadow-sm" onclick="window.open('${platformUrl}', '_blank')">
                                <i class="fas fa-external-link-alt mr-2"></i> Abrir ${tool === 'slide' ? 'Gamma' : 'ChatGPT'}
                            </button>

                            <button class="btn btn-outline-info btn-block mb-3 btn-sm" onclick="AiWizardController.manualCopy('${winId}')">
                                <i class="fas fa-copy mr-2"></i> Copiar Prompt de Nuevo
                            </button>

                            <div class="p-3 bg-light rounded text-left mb-3" style="max-height: 150px; overflow-y: auto; font-size: 0.85rem; border: 1px solid #eee;">
                                <code id="final-prompt-${winId}">${escapeHTML(finalPrompt)}</code>
                            </div>
                            <button class="btn btn-outline-secondary btn-sm" onclick="WindowManager.close('${winId}')">Cerrar Asistente</button>
                        </div >
        `;
                }
            } catch (error) {
                console.error("Error AI Wizard:", error);
                alert("Hubo un problema: " + error.message);
            }
        },

        manualCopy: function (winId) {
            const promptText = document.getElementById(`final-prompt-${winId}`).innerText;
            navigator.clipboard.writeText(promptText).then(() => {
                Swal.fire({
                    title: '¡Copiado!',
                    text: 'El prompt se ha copiado al portapapeles.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }).catch(err => {
                alert("No se pudo copiar. Intenta seleccionarlo manualmente.");
            });
        }
    };

    // Explicit global exposure
    window.AiWizardController = AiWizardController;

    // ==========================================
    // 5. MODALS & NAVIGATION
    // ==========================================

    window.openBookModal = function (id) {
        const book = books.find(b => b.id === id);
        if (!book) return;

        // Clear Static Containers FIRST to prevent accumulation/duplicates
        const staticPlans = document.getElementById('staticPlansContainer');
        if (staticPlans) {
            staticPlans.innerHTML = '';
            staticPlans.style.display = 'none';
        }
        const staticOrder = document.getElementById('staticOrderContainer');
        if (staticOrder) {
            staticOrder.innerHTML = '';
        }

        // Check Login Status (User Request: Hide features if not logged in)
        const currentUser = JSON.parse(localStorage.getItem('aranduka_currentUser'));
        const isLoggedIn = currentUser && currentUser.name;

        // Define isInitial helper
        const isInitial = book.level === 'educacion-inicial' || (book.category && book.category.includes('inicial'));

        // Define processDownload at the top level of openBookModal scope so it can be reused
        const processDownload = (url, typeName) => {
            // Encode URL to handle spaces and special characters for the REQUEST
            const encodedUrl = encodeURI(url);
            // Use original (unencoded) string for the FILENAME to save nicely (no %20)
            const originalFilename = url.split('/').pop();

            // 1. LEAD CAPTURE & TRACKING
            const currentUser = JSON.parse(localStorage.getItem('aranduka_current_user')); // Registered
            const guestUser = JSON.parse(localStorage.getItem('aranduka_guest_user'));   // Guest Session

            // Function to Perform Download
            const performDownload = () => {
                const link = document.createElement('a');
                link.href = encodedUrl;
                link.target = '_blank';
                link.download = originalFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Feedback
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                Toast.fire({
                    icon: 'success',
                    title: `Descargando ${typeName}...`
                });
            };

            // Function to Log Download
            const logDownload = (userInfo) => {
                const downloads = JSON.parse(localStorage.getItem('aranduka_downloads') || '[]');
                const entry = {
                    id: Date.now(),
                    bookId: book.id,
                    bookTitle: book.title,
                    material: typeName,
                    user: userInfo,
                    date: new Date().toLocaleDateString('es-PY') + ' ' + new Date().toLocaleTimeString('es-PY')
                };
                downloads.push(entry);
                localStorage.setItem('aranduka_downloads', JSON.stringify(downloads));
            };

            // LOGIC FLOW
            if (currentUser || guestUser) {
                // User already identified
                logDownload(currentUser || guestUser);
                performDownload();
            } else {
                // Prompt for Data
                Swal.fire({
                    title: '<strong>Descarga de Planes</strong>',
                    html: `
                        <p class="text-muted text-sm mb-4">Por favor completa tus datos para descargar.</p>
                        <div class="text-left">
                            <label class="small font-weight-bold ml-1">Nombre y Apellido</label>
                            <input id="lc-name" class="swal2-input mt-1" placeholder="Ej: Juana Gómez">
                            
                            <label class="small font-weight-bold ml-1 mt-3">Institución / Colegio</label>
                            <input id="lc-school" class="swal2-input mt-1" placeholder="Ej: Esc. Básica N° 123">
                            
                            <label class="small font-weight-bold ml-1 mt-3">Teléfono / WhatsApp</label>
                            <input id="lc-phone" class="swal2-input mt-1" placeholder="Ej: 0981123456">
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Descargar',
                    confirmButtonColor: '#0c647c',
                    cancelButtonText: 'Cancelar',
                    focusConfirm: false,
                    preConfirm: () => {
                        const name = document.getElementById('lc-name').value;
                        const school = document.getElementById('lc-school').value;
                        const phone = document.getElementById('lc-phone').value;

                        if (!name || !school || !phone) {
                            Swal.showValidationMessage('Por favor completa todos los campos');
                            return false;
                        }
                        return { name, school, phone, role: "Docente (Invitado)" };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        const userInfo = result.value;
                        localStorage.setItem('aranduka_guest_user', JSON.stringify(userInfo));
                        logDownload(userInfo);
                        performDownload();
                    }
                });
            }
        };

        const m = document.getElementById('quickViewModal');

        // 1. Historial Inteligente
        const isModalOpen = m.classList.contains('active');
        if (!isModalOpen) window.history.pushState({ modalOpen: true }, "");
        else window.history.replaceState({ modalOpen: true }, "");

        // 2. Llenar Datos
        const modalImg = document.getElementById('modalBookImage');
        modalImg.src = book.image;
        modalImg.onerror = function () {
            this.onerror = null;
            this.src = 'img/portadas/default_cover.png';
        };

        document.getElementById('modalBookTitle').innerText = book.title;
        document.getElementById('modalBookDescription').innerText = book.description || 'Sin descripción disponible.';

        // Metadata - Llenar Datos (Pills)
        if (document.getElementById('modalBookAuthor')) document.getElementById('modalBookAuthor').innerText = book.author || 'Editorial Aranduka';
        // Year removed per user request

        if (document.getElementById('modalBookGenre')) {
            const catDisplay = Array.isArray(book.category) ? book.category.join(', ').replace(/-/g, ' ').toUpperCase() : (book.category ? book.category.replace(/-/g, ' ').toUpperCase() : 'EDUCATIVO');
            document.getElementById('modalBookGenre').innerText = catDisplay;
        }
        if (document.getElementById('modalBookLevelBadge')) document.getElementById('modalBookLevelBadge').innerText = book.level ? book.level.replace(/-/g, ' ').toUpperCase() : 'GENERAL';

        // 3. Botones (Ver Resumen y Descargar PDF) - REMOVED PER USER REQUEST
        // "SOLO EL BOTON DE PEDIDO Y DE LOS PLANES"

        // window.orderCurrentBook logic is inline in the HTML onclick or a helper function
        // We can define the helper here or attached to window.
        window.currentBookTitleForOrder = book.title;

        // Removed isInitial check for hiding buttons as they are gone globally now.

        /* 
         * Logic for "Hacer Pedido"
         * We update the onclick of the new #btnOrderBook if it exists, 
         * or relies on the global variable we just set.
         */
        const btnOrder = document.getElementById('btnOrderBook');
        if (btnOrder) {
            btnOrder.onclick = function () {
                const text = encodeURIComponent(`Hola, me interesa pedir el libro: ${book.title}`);
                window.open(`https://wa.me/595994675219?text=${text}`, '_blank');
            };
        }

        // 4. Mostrar
        // 4. Mostrar con Transición EduVerse
        document.body.style.overflow = 'hidden';
        m.style.display = 'flex';
        // Force reflow
        m.offsetHeight;
        m.style.opacity = '1';
        m.classList.add('active');

        // 5. Aplicar Tema EduVerse
        EduVerseThemeController.applyTheme(book);

        // 5. Botones de Planes (Nuevo)
        // 5. Botones de Planes (Nuevo) - SOLO LOGGED IN
        // 5. BOTONES DE PLANES (Dinámicos y PÚBLICOS - User Request)
        // Eliminamos la lógica anterior que buscaba IDs inexistentes y la restricción de login
        const planContainer = document.getElementById('planButtonsContainer');
        if (planContainer) planContainer.remove();




        if ((book.planAnual || book.planDiario) && !isInitial) {
            const planDiv = document.createElement('div');
            planDiv.id = 'planButtonsContainer';
            planDiv.className = 'mt-3';
            planDiv.style.borderTop = '1px solid #eee';
            planDiv.style.paddingTop = '15px';

            let buttonsHtml = `
                <small class="d-block text-muted font-weight-bold mb-2">
                    <i class="fas fa-download mr-1"></i> Planes Disponibles:
                </small>
                <div class="row px-2">
            `;

            if (book.planAnual) {
                buttonsHtml += `
                    <div class="col-12 mb-2">
                        <button id="btnDownloadAnual" class="btn btn-outline-primary btn-block shadow-sm text-left px-3" style="font-size: 0.9rem;">
                            <i class="fas fa-calendar-alt mr-2"></i> Plan Anual
                        </button>
                    </div>`;
            }

            if (book.planDiario) {
                const label = book.planDiarioLabel || "Plan Diario";
                buttonsHtml += `
                    <div class="col-12 mb-2">
                         <button id="btnDownloadDiario" class="btn btn-outline-info btn-block shadow-sm text-left px-3" style="font-size: 0.9rem;">
                            <i class="fas fa-clipboard-list mr-2"></i> ${label}
                        </button>
                    </div>`;
            }

            if (book.planDiario2) {
                const label2 = book.planDiario2Label || "Plan Diario 2";
                buttonsHtml += `
                    <div class="col-12 mb-2">
                         <button id="btnDownloadDiario2" class="btn btn-outline-success btn-block shadow-sm text-left px-3" style="font-size: 0.9rem;">
                            <i class="fas fa-clipboard-check mr-2"></i> ${label2}
                        </button>
                    </div>`;
            }

            buttonsHtml += `</div>`;

            // ROBUST STATIC INSERTION FOR PLANS
            const staticPlans = document.getElementById('staticPlansContainer');
            if (staticPlans) {
                staticPlans.innerHTML = buttonsHtml;
                staticPlans.style.display = 'block'; // Ensure visible
                staticPlans.classList.add('mt-3', 'pt-3', 'border-top'); // Add styling here
            } else {
                // Fallback
                if (orderEl && orderEl.parentNode) {
                    const div = document.createElement('div');
                    div.innerHTML = buttonsHtml;
                    orderEl.parentNode.insertBefore(div, orderEl);
                }
            }

            // Logic to download specific file
            setTimeout(() => {
                const btnAnual = document.getElementById('btnDownloadAnual');
                const btnDiario = document.getElementById('btnDownloadDiario');
                const btnDiario2 = document.getElementById('btnDownloadDiario2');

                if (btnAnual) btnAnual.onclick = () => processDownload(book.planAnual, "Plan Anual");
                if (btnDiario) btnDiario.onclick = () => processDownload(book.planDiario, book.planDiarioLabel || "Plan Diario");
                if (btnDiario2) btnDiario2.onclick = () => processDownload(book.planDiario2, book.planDiario2Label || "Plan Diario 2");
            }, 0);

        }

        // 6. Projectos (Educación Inicial)
        // 6. Projectos (Educación Inicial) - SOLO LOGGED IN
        const projectsContainer = document.getElementById('projectsContainer');
        if (projectsContainer) projectsContainer.remove(); // Limpiar previo si existe

        if (book.projects && book.projects.length > 0) {
            const projectsDiv = document.createElement('div');
            projectsDiv.id = 'projectsContainer';
            projectsDiv.className = 'mt-4 pt-3 border-top';

            let projectsHtml = `
                    <h6 class="font-weight-bold mb-3" style="color: var(--primary-color);">
                        <i class="fas fa-folder-open mr-2"></i> Planes y Proyectos
                    </h6>
                    <div class="row">
                        `;

            book.projects.forEach((proj, idx) => {
                // Use a unique ID for each button to bind the event
                const btnId = `btn-proj-${idx}`;
                projectsHtml += `
                                <div class="col-md-6 mb-2">
                                    <button id="${btnId}" class="btn btn-outline-secondary btn-block text-left shadow-sm projects-btn">
                                        <i class="fas fa-file-word mr-2 text-primary"></i> ${proj.name}
                                    </button>
                                </div>
                            `;
            });

            projectsHtml += '</div>';
            // projectsDiv.innerHTML = projectsHtml; // Removed old dynamic div creation

            // ROBUST STATIC INSERTION FOR PROJECTS (Initial Education)
            const staticPlans = document.getElementById('staticPlansContainer');
            if (staticPlans) {
                // Determine if we append or overwrite. 
                // Usually a book has EITHER plans OR projects. 
                // But just in case, if content exists, we append.
                if (staticPlans.innerHTML.trim() !== '') {
                    const div = document.createElement('div');
                    div.className = 'mt-3 pt-3 border-top';
                    div.innerHTML = projectsHtml;
                    staticPlans.appendChild(div);
                } else {
                    staticPlans.innerHTML = projectsHtml;
                    staticPlans.style.display = 'block';
                    staticPlans.classList.add('mt-3', 'pt-3', 'border-top');
                }
            } else {
                // Fallback
                const orderEl = document.getElementById('orderContainer');
                if (orderEl && orderEl.parentNode) {
                    const div = document.createElement('div');
                    div.innerHTML = projectsHtml;
                    orderEl.parentNode.insertBefore(div, orderEl);
                }
            }

            // Bind events asynchronously
            setTimeout(() => {
                book.projects.forEach((proj, idx) => {
                    const btn = document.getElementById(`btn-proj-${idx}`);
                    if (btn) {
                        btn.onclick = () => processDownload(proj.file, proj.name);
                    }
                });
            }, 0);
        }

        // 7. BOTÓN PEDIDO WHATSAPP (PÚBLICO - User Request)
        const orderContainer = document.getElementById('orderContainer');
        if (orderContainer) orderContainer.remove(); // Limpiar previo

        const orderDiv = document.createElement('div');
        orderDiv.id = 'orderContainer';
        orderDiv.className = 'mt-3 mb-3 p-3 rounded shadow-sm';
        orderDiv.style.background = '#f0fff4'; // Light green bg
        orderDiv.style.border = '1px solid #c3e6cb';

        orderDiv.innerHTML = `
            <h6 class="font-weight-bold mb-2 text-success">
                <i class="fab fa-whatsapp mr-2"></i> Realizar Pedido Físico (Este Libro)
            </h6>
            <div class="d-flex align-items-center gap-2">
                <!-- Improved Quantity Selector -->
                <div class="input-group" style="width: 140px;">
                    <div class="input-group-prepend">
                        <button class="btn btn-outline-secondary" type="button" onclick="document.getElementById('orderQty').stepDown()">-</button>
                    </div>
                    <input type="number" id="orderQty" class="form-control text-center font-weight-bold" value="1" min="1" readonly style="background: white;">
                    <div class="input-group-append">
                        <button class="btn btn-outline-secondary" type="button" onclick="document.getElementById('orderQty').stepUp()">+</button>
                    </div>
                </div>
                
                <button id="btnSendOrder" class="btn btn-success font-weight-bold flex-grow-1 shadow-sm">
                    <i class="fas fa-shopping-cart mr-2"></i> Pedir
                </button>
            </div>
            <small class="text-muted mt-1 d-block">Te enviará a nuestro WhatsApp de Ventas.</small>
        `;

        // Insert logic
        // Insert logic - SIMPLIFIED        // Insert logic - ROBUST STATIC CONTAINER APPROACH
        const staticContainer = document.getElementById('staticOrderContainer');
        if (staticContainer) {
            staticContainer.innerHTML = ''; // Clear previous
            staticContainer.appendChild(orderDiv);
        } else {
            // Absolute fallback if HTML was not updated
            const mb = document.querySelector('.modal-body');
            if (mb) mb.appendChild(orderDiv);
        }

        // Event Listener para el botón de pedido
        setTimeout(() => {
            const btn = document.getElementById('btnSendOrder');
            if (btn) {
                btn.onclick = function () {
                    const qty = document.getElementById('orderQty').value || 1;
                    // Fix: Use Title directly for Order to ensure correct subject name per grade & avoid array crash
                    const materia = book.title;
                    const grado = book.level ? book.level.replace(/-/g, ' ').toUpperCase() : 'General';

                    const msg = `Hola, quiero el libro de *${materia}* del *${grado}*. Cantidad: *${qty}*`;
                    const phone = '595994675219';

                    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                    window.open(url, '_blank');
                };
            }
        }, 100);

        // 6. Relacionados (Simple)
        const relatedDiv = document.getElementById('relatedBooksContainer');
        if (relatedDiv) {
            // Lógica simplificada para mostrar 2 libros random del mismo nivel
            const related = books.filter(b => b.level === book.level && b.id !== book.id).slice(0, 2);
            let html = '<h5 class="text-center mt-4">Relacionados</h5><div class="row justify-content-center">';
            related.forEach(r => {
                html += `<div class="col-5 cursor-pointer text-center" onclick="openBookModal(${r.id})">
        <img src="${r.image}" class="img-fluid rounded mb-2" style="height:100px; object-fit:cover;">
            <p class="small">${r.title}</p>
        </div>`;
            });
            html += '</div>';
            relatedDiv.innerHTML = related.length ? html : '';
        }
    };

    window.closeBookModal = function () {
        const m = document.getElementById('quickViewModal');
        if (m) {
            m.style.opacity = '0';
            setTimeout(() => {
                m.style.display = 'none';
                m.classList.remove('active');
            }, 300);
        }
        document.body.style.overflow = '';

        // Limpiar estado del historial si existe, pero sin causar navegación forzada
        // El evento popstate manejará la lógica si se usa el botón atrás.
    };

    // Manejo Robusto de Historial (Navegación)
    window.addEventListener('popstate', function (event) {
        // 1. Cerrar Modal si estaba abierto
        const m = document.getElementById('quickViewModal');
        if (m && m.classList.contains('active')) {
            m.style.opacity = '0';
            m.style.display = 'none';
            m.classList.remove('active');
            document.body.style.overflow = '';
        }

        // 2. Restaurar Vista (Grid o Inicio)
        const state = event.state;
        if (state && state.view === 'gradeGrid') {
            // Volver a la grilla
            showGradeGrid(state.level);
        } else {
            // Volver a Inicio (limpiar todo o lo que corresponda)
            const bContainer = elements.booksContainer;
            if (bContainer && bContainer.classList.contains('selection-mode')) {
                bContainer.classList.remove('selection-mode');
                bContainer.innerHTML = '';

                const title = document.getElementById('viewTitle');
                if (title) {
                    title.style.display = 'block';
                    title.style.opacity = '1';
                }

                // Si teníamos filtros previos, podríamos restaurarlos aquí, pero por ahora All
                renderBooks('all');
                if (window.removeCycleNav) removeCycleNav();
            }
        }
    });


    // Alias para el botón rojo de emergencia - Unificado
    window.forceCloseBookModal = window.closeBookModal;

    window.showPdfViewer = function (book) {
        if (!book.file) {
            Swal.fire('Error', 'No hay archivo PDF disponible para este libro.', 'error');
            return;
        }

        // Graceful Alert for Placeholder PDFs
        if (book.file.includes('libro-ejemplo.pdf') || book.file.includes('ejemplo')) {
            const toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
            toast.fire({
                icon: 'info',
                title: 'Modo Demo',
                text: 'Este libro es un ejemplo. El archivo real no está conectado en esta demo.'
            });
            return;
        }

        window.open(book.file, '_blank');
    };

    // Navegación Atrás (Popstate)
    window.addEventListener('popstate', (event) => {
        const modal = document.getElementById('quickViewModal');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            // Reset filters if needed
            renderBooks('all');
        }
    });

    // ==========================================
    // 6. GLOBAL EVENTS & INIT
    // ==========================================

    document.addEventListener('click', (e) => {
        // Click en Tarjeta de Libro
        const card = e.target.closest('.quick-view-trigger');
        if (card) {
            if (e.target.closest('.fav-btn')) { // Botón Favorito
                toggleFavorite(parseInt(e.target.closest('.fav-btn').dataset.id));
            } else { // Abrir Libro
                openBookModal(parseInt(card.dataset.id));
            }
            return;
        }

        // Click en Filtros (Niveles y Materias)
        const filterCard = e.target.closest('.filter-card');
        if (filterCard) {
            // Prevenir comportamiento de enlace #
            if (filterCard.tagName === 'A') e.preventDefault();

            // USER REQUEST: Always show Grade Grid for Levels (Cycles)
            if (filterCard.dataset.level) {
                console.log("Navegando a grilla de grados para:", filterCard.dataset.level);
                showGradeGrid(filterCard.dataset.level);
            } else if (filterCard.dataset.category) {
                renderBooks('filter', filterCard.dataset.category);

                // UX: Scroll suave a resultados
                const container = document.getElementById('books-container');
                if (container) {
                    setTimeout(() => {
                        const yOffset = -80;
                        const y = container.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }, 100);
                }
            }
        }
    });

    // Updated: Toggle Cart Item
    function toggleFavorite(id) {
        let favs = JSON.parse(localStorage.getItem('aranduka_favorites') || '[]');
        let action = 'added';

        if (favs.includes(id)) {
            favs = favs.filter(f => f !== id);
            action = 'removed';
        } else {
            favs.push(id);
        }
        localStorage.setItem('aranduka_favorites', JSON.stringify(favs));

        // Toast Feedback
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true
        });

        Toast.fire({
            icon: action === 'added' ? 'success' : 'info',
            title: action === 'added' ? 'Agregado al Pedido' : 'Eliminado del Pedido'
        });

        // Smart UI Update
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.dataset.target === 'favoritos') {
            renderBooks('favorites', null, false);
        } else {
            // Update icon only to preserve scroll
            const btnIcon = document.querySelector(`.fav-btn[data-id="${id}"] i`);
            if (btnIcon) {
                if (action === 'added') btnIcon.className = 'fas fa-shopping-cart text-success';
                else btnIcon.className = 'fas fa-cart-plus text-primary';
            }
        }
    }

    // New: Checkout Order via WhatsApp
    window.checkoutOrder = function () {
        const favs = JSON.parse(localStorage.getItem('aranduka_favorites') || '[]');
        if (favs.length === 0) {
            Swal.fire('Carrito Vacío', 'Agrega libros a tu pedido primero.', 'warning');
            return;
        }

        const globalBooks = window.books || [];
        const orderItems = globalBooks.filter(b => favs.includes(b.id));

        // 1. Generate WhatsApp Message
        let msg = "*HOLA, QUIERO FINALIZAR MI PEDIDO WEB:*\n\n";
        orderItems.forEach((book, i) => {
            msg += `${i + 1}. ${book.title} (${book.level || 'General'})\n`;
        });
        msg += "\n*Total Libros:* " + orderItems.length;
        msg += "\n\nQuedo atento a la confirmación.";

        const phone = '595994675219';
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

        // 2. Save to History
        const history = JSON.parse(localStorage.getItem('aranduka_order_history') || '[]');
        const newOrder = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            items: orderItems.map(b => ({ id: b.id, title: b.title, level: b.level })),
            total: orderItems.length
        };
        history.unshift(newOrder); // Add to beginning
        localStorage.setItem('aranduka_order_history', JSON.stringify(history));

        // 3. Clear Active Cart
        localStorage.removeItem('aranduka_favorites');

        // 4. Open WhatsApp and Reload UI
        window.open(url, '_blank');

        // Reload to show empty cart and history
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    // Buscador con Debounce
    // Buscador por ENTER o CLICK (No al escribir)
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevenir reload
            const val = document.getElementById('searchInput').value.trim();

            // Actualizar URL
            const url = new URL(window.location);
            if (val) url.searchParams.set('q', val);
            else url.searchParams.delete('q');
            window.history.replaceState({ search: val }, '', url);

            if (val) {
                renderBooks('search', val, false);
                // Scroll "MAS HACIA ABAJO" (User Request: +750)
                const container = document.getElementById('books-container');
                if (container) {
                    window.scrollTo({ top: container.offsetTop + 750, behavior: 'smooth' });
                }
            } else {
                renderBooks('all');
            }
        });
    }

    // Botón Voz (Oculto si no hay soporte)
    if (elements.voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        elements.voiceBtn.style.display = 'inline-block';
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        elements.voiceBtn.onclick = () => recognition.start();
        recognition.onresult = (e) => {
            elements.searchInput.value = e.results[0][0].transcript;
            renderBooks('search', elements.searchInput.value);
        };
    } else if (elements.voiceBtn) {
        elements.voiceBtn.style.display = 'none';
    }

    // Funciones Auxiliares de UI
    // Funciones Auxiliares de UI

    window.updateBreadcrumbs = function (type, val) {
        const b = document.getElementById('breadcrumbs');
        if (!b) return;
        if (type === 'all') b.style.display = 'none';
        else {
            b.style.display = 'block';
            b.innerHTML = `<a href="#" onclick="hardReset()">Inicio</a> / <span>${val || type}</span>`;
        }
    };

    // Tabs Header
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const target = this.dataset.target;
            if (!target) return; // Ignore buttons without target (e.g. Essay Upload)

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.filter-section').forEach(s => s.classList.remove('active'));

            if (document.getElementById(target)) document.getElementById(target).classList.add('active');

            if (target === 'secciones') {
                renderGradesFilter('all');
            } else if (target === 'favoritos') {
                renderBooks('favorites', null, false);
            } else {
                renderBooks('all', null, false);
            }

            // Scroll suave y "no tanto" (mantiene los tabs visibles)
            const section = document.getElementById('materiales-section');
            if (section) {
                // Scroll "más abajo" (User Request Step 332 y 373: MAS)
                window.scrollTo({ top: section.offsetTop + 250, behavior: 'smooth' });
            }
        });
    });

    // Login Simulado
    const btnLogin = document.getElementById('loginBtn');
    if (btnLogin) btnLogin.onclick = (e) => { e.preventDefault(); $('#loginModal').modal('show'); };

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'studentLoginForm') {
            e.preventDefault();
            localStorage.setItem('aranduka_currentUser', JSON.stringify({ name: 'Invitado' }));
            location.reload();
        }

        if (e.target.id === 'registerForm') {
            e.preventDefault();

            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value; // In a real app, hash this!
            const phone = document.getElementById('regPhone').value;
            const role = document.getElementById('regRole').value;
            const school = document.getElementById('regSchool').value;

            if (!name || !email || !password) {
                alert("Por favor completa los campos obligatorios");
                return;
            }

            // Retrieve existing users
            const users = JSON.parse(localStorage.getItem('aranduka_users')) || [];

            // Check duplicate
            if (users.find(u => u.email === email)) {
                alert("Este correo ya está registrado");
                return;
            }

            const newUser = {
                name, email, password, phone, role, school,
                joinedAt: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('aranduka_users', JSON.stringify(users));

            // Auto-login
            localStorage.setItem('aranduka_currentUser', JSON.stringify({ name: name, email: email }));

            alert("¡Registro exitoso! Bienvenido.");
            location.reload();
        }
    });

    // Barra de Navegación de Ciclo (Image 1)
    window.renderCycleNav = function (cycle, activeGrade) {
        let nav = document.getElementById('cycle-nav-container');
        if (!nav) {
            nav = document.createElement('div');
            nav.id = 'cycle-nav-container';
            nav.className = 'cycle-nav-bar';
            // Insertar antes del container de libros
            elements.booksContainer.parentNode.insertBefore(nav, elements.booksContainer);
        }

        const grades = educationLevels[cycle] || [];
        const cycleTitle = cycle.toUpperCase();

        nav.innerHTML = `
                <div class="container text-center">
                    <div class="cycle-explorer-title">
                        <i class="fas fa-layer-group"></i> EXPLORANDO: ${cycleTitle}
                    </div>
                    <div class="cycle-pills">
                        ${grades.map(g => `
                        <a href="javascript:void(0)" class="cycle-pill ${g === activeGrade ? 'active' : ''}" 
                           onclick="renderBooks('filter', '${g}')">${g}</a>
                    `).join('')}
                        <div class="btn-view-grid" onclick="showGradeGrid('${cycle}')">
                            <i class="fas fa-th"></i> Ver Grilla
                        </div>
                    </div>
                </div>
                `;
    };

    window.removeCycleNav = function () {
        const nav = document.getElementById('cycle-nav-container');
        if (nav) nav.remove();
    };

    // Auto-hide Header Scroll Logic - DISABLED per user request
    // let lastScrollY = window.scrollY;
    /* window.addEventListener('scroll', () => {
        const header = document.querySelector('.main-header');
                if (!header) return;
     
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
                    // Scrolling down
                    header.classList.add('header-hidden');
        } else {
                    // Scrolling up
                    header.classList.remove('header-hidden');
        }
                lastScrollY = window.scrollY;
    }); */






    // ==========================================
    // BULK ORDER LOGIC (User Request)
    // ==========================================
    window.openBulkOrderModal = function () {
        // Cargar lista de libros
        const listContainer = document.getElementById('bulkOrderList');
        const searchInput = document.getElementById('bulkOrderSearch');
        if (!listContainer) return;

        $('#quickViewModal').modal('hide'); // Cerrar modal actual
        $('#bulkOrderModal').modal('show'); // Abrir modal mayorista

        // QUANTITY PERSISTENCE
        const quantities = {};

        // GLOBAL SORT (Ensure they are sorted by Grade Hierarchy)
        const sortedBooks = [...books].sort((a, b) => getLevelRank(a.level) - getLevelRank(b.level));

        // Render Function
        const renderList = (filterText = '') => {
            let html = '<div class="list-group list-group-flush">';

            const filtered = sortedBooks.filter(book => {
                const term = appNormalize(filterText);
                const title = appNormalize(book.title);
                const level = appNormalize(book.level || '');
                return title.includes(term) || level.includes(term);
            });

            if (filtered.length === 0) {
                html += '<div class="p-5 text-center text-muted"><i class="fas fa-search fa-3x mb-3 opacity-25"></i><p>No se encontraron libros que coincidan.</p></div>';
            } else {
                filtered.forEach(book => {
                    const currentQty = quantities[book.id] || 0;
                    html += `
                        <div class="list-group-item d-flex align-items-center justify-content-between p-3 bulk-row">
                            <div class="d-flex align-items-center" style="max-width: 70%;">
                                <div class="position-relative">
                                    <img src="${book.image}" class="rounded shadow-sm mr-3" style="width: 100px; height: 140px; object-fit: contain; background: #fff; border: 1px solid #eee;">
                                </div>
                                <div>
                                    <h6 class="mb-1 font-weight-bold" style="color: #2D3748; font-size: 0.95rem;">${book.title}</h6>
                                    <span class="badge badge-light text-uppercase" style="font-size:0.65rem; color: #718096; letter-spacing: 0.5px; border: 1px solid #edf2f7;">${book.level || 'General'}</span>
                                </div>
                            </div>
                            <div class="qty-selector shadow-sm border">
                                <button type="button" class="qty-btn" onclick="updateBulkQty(${book.id}, -1)">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <input type="number" min="0" data-id="${book.id}" class="qty-input bulk-qty" value="${currentQty}" readonly>
                                <button type="button" class="qty-btn" onclick="updateBulkQty(${book.id}, 1)">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            }
            html += '</div>';
            listContainer.innerHTML = html;
        };

        // Custom Qty Update Helper (Global but within scope to use 'quantities')
        window.updateBulkQty = (id, delta) => {
            const input = document.querySelector(`.bulk-qty[data-id="${id}"]`);
            if (input) {
                let val = parseInt(input.value) || 0;
                val = Math.max(0, val + delta);
                input.value = val;

                // Save state
                quantities[id] = val;

                // Add highlight effect
                const container = input.closest('.qty-selector');
                container.style.borderColor = 'var(--primary-color)';
                setTimeout(() => container.style.borderColor = '', 300);
            }
        };

        // Initial Render
        renderList();

        // Search Listener
        if (searchInput) {
            searchInput.value = ''; // Reset
            searchInput.oninput = (e) => renderList(e.target.value);
        }

        // External function to get final data
        window.getBulkOrderData = () => quantities;
    };

    window.sendBulkOrder = function () {
        const quantities = (typeof getBulkOrderData === 'function') ? getBulkOrderData() : {};
        let orderItems = [];

        for (const [id, qty] of Object.entries(quantities)) {
            if (qty > 0) {
                const book = books.find(b => b.id === parseInt(id));
                if (book) {
                    orderItems.push({
                        title: book.title,
                        level: book.level || 'General',
                        qty: qty
                    });
                }
            }
        }

        if (orderItems.length === 0) {
            Swal.fire('Atención', 'Selecciona al menos un libro para pedir.', 'warning');
            return;
        }

        // Generar Mensaje WhatsApp
        let msg = "*HOLA, QUIERO REALIZAR UN PEDIDO MAYORISTA:*\n\n";
        orderItems.forEach(item => {
            msg += `• (${item.qty}) x ${item.title} [${item.level}]\n`;
        });

        msg += "\nEspero confirmación. Gracias.";

        const phone = '595994675219';
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    // --- SEARCH PERSISTENCE (Stability) ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // 1. Restaurar búsqueda al cargar
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        if (q) {
            searchInput.value = q;
            // Esperar un tick para asegurar que 'books' esté listo
            setTimeout(() => renderBooks('filter', 'search'), 50);
        }

        // 2. Persistir al escribir
        // 2. Listener 'input' ELIMINADO para evitar búsqueda al escribir (User Request)
    }

    // 7. INICIALIZACIÓN
    renderBooks('all', null, false);
    initHeroCarousel();

    // --- ESSAY UPLOAD FEATURE (v2.0) ---
    const essayForm = document.getElementById('essayUploadForm');
    if (essayForm) {
        essayForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // 1. Get Values
            const name = document.getElementById('essayUserName').value;
            const phone = document.getElementById('essayUserPhone').value;
            const level = document.getElementById('essayUserLevel').value;
            const subject = document.getElementById('essaySubject').value;
            const fileInput = document.getElementById('essayFile');

            if (fileInput.files.length === 0) {
                Swal.fire('Atención', 'Por favor selecciona un archivo.', 'warning');
                return;
            }

            const file = fileInput.files[0];
            const ext = file.name.split('.').pop().toLowerCase();
            const allowed = ['pdf', 'txt', 'doc', 'docx'];

            if (!allowed.includes(ext)) {
                Swal.fire('Error', 'Solo se permiten archivos TXT, PDF o Word.', 'error');
                return;
            }

            // 2. UI Feedback
            const submitBtn = essayForm.querySelector('button[type="submit"]');
            const originalHtml = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';

            // Simulate Upload (Backend required for real file handling)
            setTimeout(() => {
                const submission = {
                    id: Date.now(),
                    name: name,
                    phone: phone,
                    level: level,
                    subject: subject,
                    fileName: file.name,
                    date: new Date().toLocaleString(),
                    status: 'pending' // For Admin Review
                };

                const history = JSON.parse(localStorage.getItem('aranduka_essays') || '[]');
                history.push(submission);
                localStorage.setItem('aranduka_essays', JSON.stringify(history));

                // Reset
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
                essayForm.reset();
                $('#essayFileLabel').text('Seleccionar Archivo...');

                $('#essayUploadModal').modal('hide');

                // Fix: Force removal of backdrop to prevent stuck UI
                setTimeout(() => {
                    $('.modal-backdrop').remove();
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                }, 300);

                Swal.fire({
                    title: '¡Publicado!',
                    text: 'Tu material ha sido enviado exitosamente al equipo Aranduka.',
                    icon: 'success',
                    confirmButtonColor: 'var(--primary-color)'
                });
            }, 1500);
        });

        // Custom File Input Label
        $('#essayFile').on('change', function () {
            let fileName = $(this).val().split('\\').pop();
            $('#essayFileLabel').addClass("selected").html(fileName || 'Seleccionar Archivo...');
        });
    }

    console.log("Aranduka v3.3 (Stable) Ready");

    // 16. ADMIN CONTROLLER (Redirect Logic)
    const AdminController = {
        init: function () {
            this.bindEvents();
        },

        bindEvents: function () {
            // Login Form Submit (on index.html)
            const loginForm = document.getElementById('adminLoginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleLoginLogic();
                });
            }
        },

        handleLoginLogic: function () {
            const user = document.getElementById('adminUser').value;
            const pass = document.getElementById('adminPass').value;

            if (user === 'admin' && pass === 'admin') {
                sessionStorage.setItem('aranduka_admin_user', 'true');
                window.location.href = 'admin.html';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: 'Usuario o contraseña incorrectos',
                    confirmButtonColor: '#d33'
                });
            }
        }
    };

    // AdminPageController moved to js/admin.js

    // Init Logic for Index Page
    AdminController.init();
});
