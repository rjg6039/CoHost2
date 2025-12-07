// Main hosting page functionality
class HostingPage {
    constructor() {
        this.data = { rooms: {} };
        this.currentRoom = 'main';
        this.draggedParty = null;
        this.contextMenu = null;
        this.roomOrigin = { x: 0, y: 0 };
        this.isPanning = false;
        this.panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
        this.waitlist = [];
        this.TABLE_SIZES = {
            square: { width: 80, height: 80 },
            circle: { width: 80, height: 80 },
            vertical: { width: 40, height: 120 },
            horizontal: { width: 120, height: 40 }
        };

        this.filters = {
            handicap: false,
            highchair: false,
            window: false
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderPage();
        this.setupTableViewPan();
        this.refreshWaitlist();
        this.refreshRooms();
        applyRestaurantNameFromServer();
    }

    async refreshWaitlist() {
        try {
            const res = await fetch(`${API_BASE}/waitlist`, {
                headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
            });
            const data = await res.json();
            this.waitlist = (res.ok && Array.isArray(data.parties)) ? data.parties : [];
        } catch (err) {
            console.warn("Unable to refresh waitlist", err);
            this.waitlist = [];
        }
        this.renderWaitlist();
        this.renderTables();
    }

    setupEventListeners() {
        // Room selection
        document.getElementById('roomSelect').addEventListener('change', (e) => {
            this.currentRoom = e.target.value;
            this.renderTables();
            this.renderRoomMetrics();
        });

        // Add party button
        document.getElementById('addPartyBtn').addEventListener('click', () => {
            this.showPartyModal();
        });

        document.getElementById('filterHandicap').addEventListener('change', (e) => {
                this.filters.handicap = e.target.checked;
                this.renderTables();
            });

        document.getElementById('filterHighchair').addEventListener('change', (e) => {
                this.filters.highchair = e.target.checked;
                this.renderTables();
        });

        document.getElementById('filterWindow').addEventListener('change', (e) => {
                this.filters.window = e.target.checked;
                this.renderTables();
        });

        // Modal events
        document.getElementById('closePartyModal').addEventListener('click', () => this.hidePartyModal());
        document.getElementById('cancelPartyModal').addEventListener('click', () => this.hidePartyModal());
        document.getElementById('savePartyBtn').addEventListener('click', () => this.saveParty());

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterWaitlist(e.target.value);
        });

        // Waitlist header sorting
        document.querySelectorAll('.waitlist-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                this.sortWaitlist(field);
            });
        });

        // Close context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            // Only hide if clicking outside the context menu and not on a table
            if (this.contextMenu && !this.contextMenu.contains(e.target)) {
                const clickedTable = e.target.closest('.table-item');
                if (!clickedTable) {
                    this.hideContextMenu();
                }
            }
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.setupResizeHandle();
    }

    setupResizeHandle() {
        const handle = document.querySelector('.resize-handle');
        const roomSection = document.querySelector('.room-view-section');
        const waitlistSection = document.querySelector('.waitlist-section');
        if (!handle || !roomSection || !waitlistSection) return;

        let dragging = false;
        let startX = 0;
        let startRoomWidth = 0;

        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            startX = e.clientX;
            startRoomWidth = roomSection.getBoundingClientRect().width;
            document.body.classList.add('resizing');
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const newWidth = Math.max(280, startRoomWidth + dx);
            roomSection.style.flex = '0 0 auto';
            roomSection.style.width = `${newWidth}px`;
        });

        window.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                document.body.classList.remove('resizing');
            }
        });
    }

    setupTableViewPan() {
        const view = document.getElementById('tableView');
        if (!view || view._panSetup) return;
        view._panSetup = true;

        view.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.table-item')) return;
            this.isPanning = true;
            this.panStart = {
                x: e.clientX,
                y: e.clientY,
                scrollLeft: view.scrollLeft,
                scrollTop: view.scrollTop
            };
            view.classList.add('panning');
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            const dx = e.clientX - this.panStart.x;
            const dy = e.clientY - this.panStart.y;
            view.scrollLeft = this.panStart.scrollLeft - dx;
            view.scrollTop = this.panStart.scrollTop - dy;
        });

        window.addEventListener('mouseup', () => {
            if (!this.isPanning) return;
            this.isPanning = false;
            view.classList.remove('panning');
        });
    }

    debugTableClick(table, event) {
        console.group('Table Click Debug');
        console.log('Table ID:', table.id);
        console.log('Table State:', table.state);
        console.log('Seated Party:', table.seatedParty);
        console.log('Event Target:', event.target);
        console.log('Current Context Menu:', this.contextMenu);
        console.groupEnd();
    }

    renderPage() {
        this.renderRoomMetrics();
        this.renderTables();
        this.renderWaitlist();
    }

    getRoomTablesWithSeating(roomKey = this.currentRoom) {
        const room = this.data.rooms[roomKey];
        if (!room) return [];

        const seatedByTable = {};
        (this.waitlist || []).forEach(p => {
            const partyRoom = p.room || 'main';
            if (p.state === 'seated' &&
                p.tableId !== undefined &&
                p.tableId !== null &&
                partyRoom === roomKey) {
                seatedByTable[p.tableId] = { ...p, id: p._id || p.id };
            }
        });

        return (room.tables || []).map(t => {
            const table = { ...t };
            const seatedParty = seatedByTable[t.id];
            if (seatedParty) {
                table.state = 'seated';
                table.seatedParty = seatedParty;
            } else {
                table.seatedParty = null;
                if (table.state === 'seated') table.state = 'ready';
            }
            return table;
        });
    }

    async refreshRooms() {
        try {
            const res = await fetch(`${API_BASE}/waitlist/rooms`, {
                headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
            });
            const data = await res.json();
            if (!res.ok || !data.rooms) {
                this.data.rooms = { main: { name: 'Main', tables: [] } };
                this.currentRoom = 'main';
                this.setRoomOptions(['main']);
                this.renderRoomMetrics();
                this.renderTables();
                return;
            }

            const roomRes = await fetch(`${API_BASE}/rooms`, {
                headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
            });
            const roomPayload = await roomRes.json().catch(() => ({}));

            this.data.rooms = {};
            if (roomRes.ok && Array.isArray(roomPayload.rooms) && roomPayload.rooms.length) {
                roomPayload.rooms.forEach(r => {
                    this.data.rooms[r.key] = { ...r, name: r.name, tables: r.tables || [] };
                });
                this.currentRoom = this.data.rooms[this.currentRoom] ? this.currentRoom : roomPayload.rooms[0].key;
            } else {
                // fallback to keys returned by waitlist/rooms
                data.rooms.forEach(r => this.data.rooms[r] = { name: r, tables: [] });
                this.currentRoom = data.rooms.includes(this.currentRoom) ? this.currentRoom : data.rooms[0];
            }

            const keys = Object.keys(this.data.rooms);
            this.setRoomOptions(keys.length ? keys : ['main']);
            this.renderRoomMetrics();
            this.renderTables();
        } catch (err) {
            console.warn("Unable to refresh rooms", err);
            this.data.rooms = { main: { name: 'Main', tables: [] } };
            this.currentRoom = 'main';
            this.setRoomOptions(['main']);
            this.renderRoomMetrics();
            this.renderTables();
        }
    }

    setRoomOptions(options) {
        const select = document.getElementById('roomSelect');
        if (!select) return;
        const unique = Array.from(new Set(options.length ? options : ['main']));
        if (!unique.length) unique.push('main');
        select.innerHTML = unique.map(r => {
            const label =
                this.data.rooms?.[r]?.name ||
                (r === 'main' ? 'Main' : r.charAt(0).toUpperCase() + r.slice(1));
            return `<option value="${r}">${label}</option>`;
        }).join('');
        if (!unique.includes(this.currentRoom)) {
            this.currentRoom = unique[0];
        }
        select.value = this.currentRoom;
    }

    renderRoomMetrics() {
        const metricsContainer = document.getElementById('roomMetricsContainer');

        if (!this.data.rooms || !Object.keys(this.data.rooms).length) {
            metricsContainer.innerHTML = '';
            return;
        }

        let metricsHTML = '';

        Object.entries(this.data.rooms).forEach(([roomKey, room]) => {
            const computedTables = this.getRoomTablesWithSeating(roomKey);
            const availableTables = computedTables.filter(t => t.state === 'ready').length;
            const seatedTables = computedTables.filter(t => t.state === 'seated').length;
            const notReadyTables = computedTables.filter(t => t.state === 'not-ready').length;
            const totalTables = computedTables.length;

            const occupancyRate = totalTables > 0 ? Math.round((seatedTables / totalTables) * 100) : 0;

            let statusClass = 'metric-available';
            if (occupancyRate >= 90) statusClass = 'metric-full';
            else if (occupancyRate >= 70) statusClass = 'metric-busy';

            metricsHTML += `
                <div class="room-pin ${roomKey === this.currentRoom ? 'active' : ''}" data-room="${roomKey}">
                    <div class="pin-header">
                        <h3 class="pin-title">${room.name}</h3>
                        <span class="occupancy-badge ${statusClass}">${occupancyRate}%</span>
                    </div>
                    <div class="pin-metrics">
                        <div class="metric-row">
                            <span class="metric-label">Total:</span>
                            <span class="metric-value">${totalTables}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Available:</span>
                            <span class="metric-value metric-available">${availableTables}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Seated:</span>
                            <span class="metric-value metric-seated">${seatedTables}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Cleaning:</span>
                            <span class="metric-value metric-not-ready">${notReadyTables}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        metricsContainer.innerHTML = metricsHTML;

        metricsContainer.querySelectorAll('.room-pin').forEach(pin => {
            pin.addEventListener('click', () => {
                const roomKey = pin.getAttribute('data-room');
                if (roomKey !== this.currentRoom) {
                    this.currentRoom = roomKey;
                    const select = document.getElementById('roomSelect');
                    if (select) select.value = roomKey;
                    this.renderTables();
                    this.renderRoomMetrics();
                }
            });
        });
    }


    renderTables() {
        const tableView = document.getElementById('tableView');
        const room = this.data.rooms[this.currentRoom];

        if (!room) {
            tableView.innerHTML = '';
            return;
        }

        tableView.innerHTML = '';

        const computedTables = this.getRoomTablesWithSeating();

        // Filter tables based on active filters
        const filteredTables = this.filterTables(computedTables);

        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        if (filteredTables.length) {
            minX = Math.min(...filteredTables.map(t => t.x));
            minY = Math.min(...filteredTables.map(t => t.y));
            maxX = Math.max(...filteredTables.map(t => t.x));
            maxY = Math.max(...filteredTables.map(t => t.y));
        }
        const padding = 300;
        const width = Math.max(1200, maxX - minX + padding * 2);
        const height = Math.max(900, maxY - minY + padding * 2);
        this.roomOrigin = filteredTables.length ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : { x: 0, y: 0 };

        const stage = document.createElement('div');
        stage.className = 'table-stage';
        stage.style.position = 'relative';
        stage.style.width = `${width}px`;
        stage.style.height = `${height}px`;

        filteredTables.forEach(table => {
            const tableEl = this.createTableElement(table);
            stage.appendChild(tableEl);
        });

        tableView.appendChild(stage);
        tableView.scrollLeft = stage.clientWidth / 2 - tableView.clientWidth / 2;
        tableView.scrollTop = stage.clientHeight / 2 - tableView.clientHeight / 2;
    }

    filterTables(tables) {
        // If no filters are active, return all tables
        if (!this.filters.handicap && !this.filters.highchair && !this.filters.window) {
            return tables;
        }

        return tables.filter(table => {
            // Show table if it matches any of the active filters
            let matches = true;

            if (this.filters.handicap) {
                matches = matches && table.handicap;
            }

            if (this.filters.highchair) {
                matches = matches && table.highchair;
            }

            if (this.filters.window) {
                matches = matches && table.window;
            }

            return matches;
        });
    }

    createTableElement(table) {
        const tableEl = document.createElement('div');
        const shape = table.shape || 'square';
        const size = this.TABLE_SIZES[shape] || this.TABLE_SIZES.square;
        tableEl.className = `table-item ${table.state} ${shape}`;
        const origin = this.roomOrigin || { x: 0, y: 0 };
        tableEl.style.left = `calc(50% + ${table.x - origin.x}px)`;
        tableEl.style.top = `calc(50% + ${table.y - origin.y}px)`;
        tableEl.style.width = `${size.width}px`;
        tableEl.style.height = `${size.height}px`;
        tableEl.style.transform = 'translate(-50%, -50%)';
        tableEl.dataset.tableId = table.id;
        tableEl.dataset.tableKey = table._id || table.id;

        // Add a subtle visual indication when filters are active and table matches
        const isFiltered = this.filters.handicap || this.filters.highchair || this.filters.window;
        if (isFiltered) {
            tableEl.classList.add('filtered-table');
        }

        let requirements = '';
        if (table.handicap) requirements += '<span class="table-tag">♿</span>';
        if (table.highchair) requirements += '<span class="table-tag">👶</span>';
        if (table.window) requirements += '<span class="table-tag">🪟</span>';

        // Party name tag (like a video game name tag)
        const partyNameTag = table.seatedParty
            ? `<div class="party-name-tag">${table.seatedParty.name}</div>`
            : '';

        // Table tags beneath the table
        const tableTags = requirements
            ? `<div class="table-tags">${requirements}</div>`
            : '';

        tableEl.innerHTML = `
            ${partyNameTag}
            <div class="table-section">${table.section || 1}</div>
            <div class="table-capacity">${table.capacity}</div>
            ${tableTags}
        `;

        // Drag and drop events
        tableEl.addEventListener('dragover', (e) => this.handleDragOver(e, table));
        tableEl.addEventListener('dragenter', (e) => this.handleDragEnter(e, table));
        tableEl.addEventListener('dragleave', (e) => this.handleDragLeave(e, table));
        tableEl.addEventListener('drop', (e) => this.handleDrop(e, table));

        // Click event for context menu
        tableEl.addEventListener('click', (e) => {
            this.debugTableClick(table, e);
            console.log('Table clicked:', table.id, 'State:', table.state);
            this.showTableContextMenu(e, table);
        });

        return tableEl;
    }

    renderWaitlist() {
        const waitlistBody = document.getElementById('waitlistBody');
        const waitlistCount = document.getElementById('waitlistCount');
        const emptyState = document.getElementById('emptyState');

        // Sort waitlist before rendering
        this.sortWaitlistData();

        // Count only waiting parties for the counter
        const waitingParties = (this.waitlist || []).filter(p => p.state === 'waiting');
        waitlistCount.textContent = waitingParties.length;

        if (!this.waitlist || this.waitlist.length === 0) {
            emptyState.style.display = 'block';
            waitlistBody.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';

        waitlistBody.innerHTML = this.waitlist.map(party => this.createWaitlistRow(party)).join('');

        // Re-setup drag and drop
        this.setupDragAndDrop();
    }

    createWaitlistRow(party) {
        let requirements = '';
        if (party.handicap) requirements += '<span class="requirement-indicator">♿</span>';
        if (party.highchair) requirements += '<span class="requirement-indicator">👶</span>';
        if (party.window) requirements += '<span class="requirement-indicator">🪟</span>';

        let timeDisplay = '';
        let rowClass = '';
        let seatingTimeClass = '';
        const timeLabel = party.time || '--';

        if (party.state === 'seated') {
            const seatedTime = this.calculateSeatedTime(party.seatedAt || party.seatedTime);
            timeDisplay = `<td class="time-seated">${seatedTime}</td>`;
            rowClass = 'seated-party';
            seatingTimeClass = 'time-seated';
        } else {
            // Determine if party is late for waiting parties
            const now = new Date();
            const partyTime = new Date(now.toDateString() + ' ' + party.time);
            const isLate = now > partyTime;

            seatingTimeClass = isLate ? 'time-late' : 'time-normal';
            timeDisplay = `<td class="time-remaining">${this.calculateTimeRemaining(party)}</td>`;
        }

        let actionButtons = '';
        const pid = party._id || party.id;
        if (party.state === 'waiting') {
            actionButtons = `
                <button class="btn btn-success" onclick="hostingPage.seatParty('${pid}')">Seat</button>
                <button class="btn btn-warning" onclick="hostingPage.editParty('${pid}')">Edit</button>
                <button class="btn btn-danger" onclick="hostingPage.removeParty('${pid}')">Remove</button>
            `;
        } else if (party.state === 'seated') {
            actionButtons = `
                <button class="btn btn-info" onclick="hostingPage.unseatParty('${pid}')">Unseat</button>
                <button class="btn btn-success" onclick="hostingPage.completeParty('${pid}')">Complete</button>
                <button class="btn btn-danger" onclick="hostingPage.cancelParty('${pid}')">Cancel</button>
            `;
        }

        return `
            <tr class="draggable-party ${rowClass}" draggable="true" data-party-id="${pid}">
                <td>
                    ${party.name}
                    ${requirements ? `<div class="requirement-indicators">${requirements}</div>` : ''}
                </td>
                <td class="party-size">${party.size}</td>
                <td class="seating-time ${seatingTimeClass}">${timeLabel}</td>
                ${timeDisplay}
                <td class="phone-number">${party.phone || ''}</td>
                <td class="notes">${party.notes || ''}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }

    calculateSeatedTime(seatedTime) {
        if (!seatedTime) return 'Just seated';

        const now = new Date();
        const seated = new Date(seatedTime);
        if (isNaN(seated.getTime())) return 'Just seated';
        const diffMs = now - seated;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m`;
        }
        return `${diffMins}m`;
    }

    calculateTimeRemaining(party) {
        if (!party.time) return '<span class="time-normal">--</span>';
        const now = new Date();
        const partyTime = new Date(now.toDateString() + ' ' + party.time);
        if (isNaN(partyTime.getTime())) return '<span class="time-normal">--</span>';
        const diffMs = partyTime - now;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 0) {
            return '<span class="time-late">Now</span>';
        } else if (diffMins < 30) {
            return `<span class="time-warning">${diffMins}m</span>`;
        } else {
            return `<span class="time-normal">${diffMins}m</span>`;
        }
    }

    // Drag and Drop Methods
    setupDragAndDrop() {
        const waitlistBody = document.getElementById('waitlistBody');
        if (!waitlistBody) return;

        waitlistBody.addEventListener('dragstart', (e) => {
            if (e.target.closest('.draggable-party')) {
                const partyId = e.target.closest('.draggable-party').dataset.partyId;
                this.draggedParty = (this.waitlist || []).find(p => (p._id || p.id)?.toString() === partyId);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        waitlistBody.addEventListener('dragend', () => {
            this.draggedParty = null;
        });
    }

    handleDragOver(e, table) {
        e.preventDefault();
        if (this.canPartyBeSeatedAtTable(this.draggedParty, table)) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    handleDragEnter(e, table) {
        if (this.canPartyBeSeatedAtTable(this.draggedParty, table)) {
            e.target.classList.add('drag-over');
        }
    }

    handleDragLeave(e, table) {
        e.target.classList.remove('drag-over');
    }

    handleDrop(e, table) {
        e.preventDefault();
        e.target.classList.remove('drag-over');

        if (this.draggedParty && this.canPartyBeSeatedAtTable(this.draggedParty, table)) {
            const pid = this.draggedParty._id || this.draggedParty.id;
            this.seatPartyAtTable(pid, table.id);
        }
    }

    canPartyBeSeatedAtTable(party, table) {
        if (!party || !table) return false;
        if (table.state !== 'ready') return false;
        if (table.capacity < party.size) return false;
        if (party.handicap && !table.handicap) return false;
        if (party.highchair && !table.highchair) return false;
        if (party.window && !table.window) return false;
        return true;
    }

    // Context Menu Methods - FIXED VERSION
    showTableContextMenu(e, table) {
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;

        if (table.state === 'seated' && table.seatedParty) {
            menu.innerHTML = `
                <div class="context-menu-item" data-action="unseat" data-table-id="${table.id}">
                    <span>🚶‍♂️</span> Unseat Party
                </div>
                <div class="context-menu-item success" data-action="complete" data-table-id="${table.id}">
                    <span>✅</span> Complete Party
                </div>
                <div class="context-menu-item danger" data-action="cancel" data-table-id="${table.id}">
                    <span>❌</span> Cancel Party
                </div>
            `;
        } else if (table.state === 'not-ready') {
            menu.innerHTML = `
                <div class="context-menu-item success" data-action="ready" data-table-id="${table.id}">
                    <span>✅</span> Mark as Ready
                </div>
            `;
        } else if (table.state === 'ready') {
            menu.innerHTML = `
                <div class="context-menu-item warning" data-action="not-ready" data-table-id="${table.id}">
                    <span>⏸️</span> Mark as Not Ready
                </div>
            `;
        }

        document.body.appendChild(menu);
        this.contextMenu = menu;
        menu.style.display = 'block';

        // Add event listeners to menu items
        menu.addEventListener('click', (menuEvent) => {
            const menuItem = menuEvent.target.closest('.context-menu-item');
            if (menuItem) {
                const action = menuItem.getAttribute('data-action');
                const tableId = parseInt(menuItem.getAttribute('data-table-id'));
                this.handleContextMenuAction(action, tableId);
            }
        });

        e.stopPropagation();
        e.preventDefault();
    }

    // New method to handle context menu actions
    handleContextMenuAction(action, tableId) {
        switch (action) {
            case 'unseat':
                this.unseatPartyFromTable(tableId);
                break;
            case 'complete':
                this.completePartyFromTable(tableId);
                break;
            case 'cancel':
                this.cancelPartyFromTable(tableId);
                break;
            case 'ready':
                this.markTableReady(tableId);
                break;
            case 'not-ready':
                this.markTableNotReady(tableId);
                break;
        }
        this.hideContextMenu(); // Always hide after any action
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    // Table Actions
    unseatPartyFromTable(tableId) {
        const tables = this.getRoomTablesWithSeating();
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.seatedParty) return;

        const partyId = table.seatedParty._id || table.seatedParty.id;
        this.updatePartyState(partyId, 'waiting', { tableId: null }).then(() => this.refreshWaitlist());

        const room = this.data.rooms[this.currentRoom];
        const baseTable = room?.tables.find(t => t.id === tableId);
        if (baseTable) baseTable.state = 'ready';
        this.persistRoomTables();
        this.renderTables();
        this.renderRoomMetrics();
    }

    completePartyFromTable(tableId) {
        const tables = this.getRoomTablesWithSeating();
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.seatedParty) return;

        const pid = table.seatedParty._id || table.seatedParty.id;
        this.completeParty(pid);

        const room = this.data.rooms[this.currentRoom];
        const baseTable = room?.tables.find(t => t.id === tableId);
        if (baseTable) baseTable.state = 'not-ready';
        this.persistRoomTables();
        this.renderTables();
        this.renderRoomMetrics();
    }

    cancelPartyFromTable(tableId) {
        const tables = this.getRoomTablesWithSeating();
        const table = tables.find(t => t.id === tableId);
        if (!table || !table.seatedParty) return;

        const pid = table.seatedParty._id || table.seatedParty.id;
        this.cancelParty(pid);

        const room = this.data.rooms[this.currentRoom];
        const baseTable = room?.tables.find(t => t.id === tableId);
        if (baseTable) baseTable.state = 'ready';
        this.persistRoomTables();
        this.renderTables();
        this.renderRoomMetrics();
    }

    markTableReady(tableId) {
        const room = this.data.rooms[this.currentRoom];
        const table = room.tables.find(t => t.id === tableId);

        if (table) {
            table.state = 'ready';
            this.renderTables();
            this.renderRoomMetrics();
            this.persistRoomTables();
        }
    }

    markTableNotReady(tableId) {
        const room = this.data.rooms[this.currentRoom];
        const table = room.tables.find(t => t.id === tableId);

        if (table) {
            table.state = 'not-ready';
            this.renderTables();
            this.renderRoomMetrics();
            this.persistRoomTables();
        }
    }

    seatPartyAtTable(partyId, tableId) {
        this.updatePartyState(partyId, 'seated', { tableId }).then(() => this.refreshWaitlist());
    }

    persistRoomTables(roomKey = this.currentRoom) {
        const room = this.data.rooms[roomKey];
        if (!room) return;
        fetch(`${API_BASE}/rooms/${room._id || room.id || room.key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken() || ''}`
            },
            body: JSON.stringify({ tables: room.tables, name: room.name })
        }).catch(err => console.error('Save room error', err));
    }

    setTableStateForParty(partyId, newState = 'not-ready') {
        const pidStr = partyId?.toString();
        const party = (this.waitlist || []).find(p => (p._id || p.id)?.toString() === pidStr);
        const tableId = party?.tableId;
        if (tableId === undefined || tableId === null) return;
        const roomKey = party.room || this.currentRoom;
        const room = this.data.rooms[roomKey];
        if (!room) return;
        const table = room.tables.find(t => t.id === tableId);
        if (!table) return;
        table.state = newState;
        this.persistRoomTables(roomKey);
    }

    // Waitlist Sorting
    sortWaitlist(field) {
        if (!window.appState) return;
        if (appState.waitlistSort.field === field) {
            // Toggle direction if same field
            appState.waitlistSort.direction = appState.waitlistSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field, default to ascending
            appState.waitlistSort.field = field;
            appState.waitlistSort.direction = 'asc';
        }

        this.updateSortHeaders();
        this.renderWaitlist();
    }

    sortWaitlistData() {
        const { field, direction } = (window.appState?.waitlistSort) || { field: 'time', direction: 'asc' };

        if (!Array.isArray(this.waitlist)) return;

        const getVal = (party) => {
            if (field === 'time') {
                const now = new Date();
                const base = party.time ? new Date(`${now.toDateString()} ${party.time}`) : new Date(party.addedAt || now);
                return base.getTime();
            }
            if (field === 'seatedTime') {
                return new Date(party.seatedAt || party.addedAt || 0).getTime();
            }
            const val = party[field];
            if (val === undefined || val === null) return '';
            return val;
        };

        this.waitlist.sort((a, b) => {
            // Sort seated parties to the bottom
            if (a.state === 'seated' && b.state !== 'seated') return 1;
            if (a.state !== 'seated' && b.state === 'seated') return -1;
            if (a.state === 'seated' && b.state === 'seated') {
                // Both seated - sort by seated time
                const aTime = new Date(a.seatedTime);
                const bTime = new Date(b.seatedTime);
                return direction === 'asc' ? aTime - bTime : bTime - aTime;
            }

            // Both waiting - use normal sorting
            const aVal = getVal(a);
            const bVal = getVal(b);

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortHeaders() {
        document.querySelectorAll('.waitlist-table th[data-sort]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.getAttribute('data-sort') === appState.waitlistSort.field) {
                th.classList.add(`sort-${appState.waitlistSort.direction}`);
            }
        });
    }

    async updatePartyState(partyId, state, extras = {}) {
        const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
        if (!token) return;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        try {
            await fetch(`${API_BASE}/waitlist/${partyId}/state`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ state, ...extras })
            });
        } catch (err) {
            console.error('Failed to update party state', err);
        }
    }

    // Party Modal Methods
    showPartyModal(partyId = null) {
        const modal = document.getElementById('partyModal');
        const title = document.getElementById('modalTitle');
        const partyIdInput = document.getElementById('partyId');

        if (partyId) {
            title.textContent = 'Edit Party';
            const party = (this.waitlist || []).find(p => (p._id || p.id)?.toString() === partyId.toString());
            if (party) {
                this.populatePartyForm(party);
                partyIdInput.value = party._id || party.id;
            }
        } else {
            title.textContent = 'Add New Party';
            partyIdInput.value = '';
            this.clearPartyForm();
        }

        modal.style.display = 'block';
    }

    populatePartyForm(party) {
        document.getElementById('modalPartyName').value = party.name;
        document.getElementById('modalPartySize').value = party.size;
        document.getElementById('modalSeatingTime').value = party.time;
        document.getElementById('modalPhoneNumber').value = party.phone;
        document.getElementById('modalPartyNotes').value = party.notes;
        document.getElementById('modalHandicap').checked = party.handicap;
        document.getElementById('modalHighchair').checked = party.highchair;
        document.getElementById('modalWindow').checked = party.window;
    }

    clearPartyForm() {
        document.getElementById('modalPartyName').value = '';
        document.getElementById('modalPartySize').value = '2';
        document.getElementById('modalSeatingTime').value = '';
        document.getElementById('modalPhoneNumber').value = '';
        document.getElementById('modalPartyNotes').value = '';
        document.getElementById('modalHandicap').checked = false;
        document.getElementById('modalHighchair').checked = false;
        document.getElementById('modalWindow').checked = false;
    }

    saveParty() {
        const partyId = document.getElementById('partyId').value;
        const name = document.getElementById('modalPartyName').value;
        const size = parseInt(document.getElementById('modalPartySize').value);
        const time = document.getElementById('modalSeatingTime').value;
        const phone = document.getElementById('modalPhoneNumber').value;
        const notes = document.getElementById('modalPartyNotes').value;
        const handicap = document.getElementById('modalHandicap').checked;
        const highchair = document.getElementById('modalHighchair').checked;
        const window = document.getElementById('modalWindow').checked;

        if (!name || !time) {
            alert('Please fill in required fields');
            return;
        }

        // Create via backend
        const payload = {
            name,
            size,
            phone,
            notes,
            room: this.currentRoom,
            handicap,
            highchair,
            window,
            quotedMinutes: null,
            time
        };

        const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const targetUrl = partyId ? `${API_BASE}/waitlist/${partyId}` : `${API_BASE}/waitlist`;
        const method = partyId ? 'PUT' : 'POST';

        fetch(targetUrl, { method, headers, body: JSON.stringify(payload) })
            .then(() => this.refreshWaitlist())
            .catch(err => console.error('Save party failed', err))
            .finally(() => {
                this.hidePartyModal();
            });
    }

    hidePartyModal() {
        document.getElementById('partyModal').style.display = 'none';
    }

    // Party Actions
    seatParty(partyId) {
        // Find suitable table and seat party
        const party = (this.waitlist || []).find(p => (p._id || p.id)?.toString() === partyId.toString());
        if (!party) return;

        const suitableTable = this.findSuitableTable(party);
        if (suitableTable) {
            this.seatPartyAtTable(partyId, suitableTable.id);
        } else {
            alert('No suitable table available for this party');
        }
    }

    findSuitableTable(party) {
        const availableTables = this.getRoomTablesWithSeating().filter(t => t.state === 'ready');

        // First try to find a table that matches all requirements
        let suitableTable = availableTables.find(t =>
            t.capacity >= party.size &&
            (!party.handicap || t.handicap) &&
            (!party.highchair || t.highchair) &&
            (!party.window || t.window)
        );

        // If no perfect match, try without window requirement
        if (!suitableTable && party.window) {
            suitableTable = availableTables.find(t =>
                t.capacity >= party.size &&
                (!party.handicap || t.handicap) &&
                (!party.highchair || t.highchair)
            );
        }

        // If still no match, try without highchair requirement
        if (!suitableTable && party.highchair) {
            suitableTable = availableTables.find(t =>
                t.capacity >= party.size &&
                (!party.handicap || t.handicap)
            );
        }

        // Last resort: any table that fits the size and handicap requirement
        if (!suitableTable) {
            suitableTable = availableTables.find(t =>
                t.capacity >= party.size &&
                (!party.handicap || t.handicap)
            );
        }

        return suitableTable || availableTables[0];
    }

    editParty(partyId) {
        this.showPartyModal(partyId);
    }

    removeParty(partyId) {
        if (confirm('Are you sure you want to remove this party from the waitlist?')) {
            this.updatePartyState(partyId, 'cancelled').then(() => this.refreshWaitlist());
        }
    }

    unseatParty(partyId) {
        const party = (this.waitlist || []).find(p => (p._id || p.id)?.toString() === partyId.toString());
        if (!party || party.state !== 'seated') return;
        this.updatePartyState(partyId, 'waiting').then(() => this.refreshWaitlist());
    }

    completeParty(partyId) {
        this.setTableStateForParty(partyId, 'not-ready');
        this.updatePartyState(partyId, 'completed').then(() => this.refreshWaitlist());
    }

    cancelParty(partyId) {
        if (confirm('Are you sure you want to cancel this party? This will remove them from the system.')) {
            this.updatePartyState(partyId, 'cancelled').then(() => this.refreshWaitlist());
        }
    }

    filterWaitlist(searchTerm) {
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) {
            this.renderWaitlist();
            return;
        }

        const filteredParties = (this.waitlist || []).filter(party =>
            (party.name || '').toLowerCase().includes(term) ||
            (party.phone || '').includes(term) ||
            (party.notes || '').toLowerCase().includes(term)
        );

        this.renderFilteredWaitlist(filteredParties);
    }

    renderFilteredWaitlist(parties) {
        const waitlistBody = document.getElementById('waitlistBody');
        const emptyState = document.getElementById('emptyState');

        if (parties.length === 0) {
            emptyState.style.display = 'block';
            waitlistBody.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        waitlistBody.innerHTML = parties.map(party => this.createWaitlistRow(party)).join('');

        // Re-setup drag and drop for filtered rows
        this.setupDragAndDrop();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await applyRestaurantNameFromServer();
    if (window.settingsManager) {
        window.settingsManager.applyAllSettings();
    }
    window.hostingPage = new HostingPage();
    // Setup drag and drop after initial render
    setTimeout(() => {
        window.hostingPage.setupDragAndDrop();
        window.hostingPage.updateSortHeaders();
    }, 100);
});

async function applyRestaurantNameFromServer() {
    const header = document.getElementById('restaurantName');
    const token = (typeof getAuthToken === 'function') ? getAuthToken() : null;
    let name = (typeof getAuthUser === 'function' && getAuthUser()?.restaurantName) ? getAuthUser().restaurantName : (window.settingsManager?.getRestaurantName?.() || "CoHost Restaurant");

    if (token) {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const me = await res.json();
                if (me?.restaurantName) {
                    name = me.restaurantName;
                    if (typeof setAuthUser === 'function' && typeof getAuthUser === 'function') {
                        setAuthUser({ ...(getAuthUser() || {}), restaurantName: name });
                    }
                }
            }
        } catch (err) {
            // ignore, use fallback
        }
    }

    if (header) header.textContent = name;
    document.title = `Hosting - ${name}`;
}
