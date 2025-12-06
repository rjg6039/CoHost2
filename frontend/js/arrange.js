// Arrange Page functionality with Grid System
class ArrangePage {
    constructor() {
        this.data = { rooms: {} };
        this.currentRoom = 'main';
        this.state = {
            selectedTable: null,
            movingTable: null,
            editingTable: null,
            newTablePosition: null,
            selectedIcon: 'square',
            showGrid: true,
            isMovingTable: false,
            dragOffset: { x: 0, y: 0 },
            menuJustOpened: false
        };

        // Grid constants based on 40px grid
        this.GRID_UNIT = 40;
        this.TABLE_SIZES = {
            square: { width: 80, height: 80 },
            circle: { width: 80, height: 80 },
            vertical: { width: 40, height: 120 },
            horizontal: { width: 120, height: 40 }
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.refreshRooms();
    }

    async refreshRooms() {
        try {
            const res = await fetch(`${API_BASE}/waitlist/rooms`, {
                headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
            });
            const data = await res.json();
            if (res.ok && data.rooms) {
                const roomRes = await fetch(`${API_BASE}/rooms`, {
                    headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
                });
                const roomPayload = await roomRes.json().catch(() => ({}));
                if (roomRes.ok && roomPayload.rooms) {
                    this.data.rooms = {};
                    roomPayload.rooms.forEach(r => {
                        this.data.rooms[r.key] = { ...r, name: r.name, tables: r.tables || [] };
                    });
                    this.currentRoom = this.data.rooms[this.currentRoom] ? this.currentRoom : roomPayload.rooms[0].key;
                } else {
                    this.data.rooms = {};
                    data.rooms.forEach(r => this.data.rooms[r] = { name: r, tables: [] });
                    this.currentRoom = data.rooms[0];
                }
                this.populateRoomSelector();
                this.renderArrangeView();
            }
        } catch (err) {
            console.warn("Unable to refresh rooms", err);
            this.populateRoomSelector();
            this.renderArrangeView();
        }
    }

    loadData() {
        return { rooms: {} };
    }

    normalizeMainLayout(data) {
        return data;
    }

    saveData() {
        const room = this.data.rooms[this.currentRoom];
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

    setupEventListeners() {
        document.getElementById('arrangeRoomSelect').addEventListener('change', (e) => {
            this.currentRoom = e.target.value;
            this.renderArrangeView();
        });

        document.getElementById('addRoomBtn').addEventListener('click', () => {
            this.showRoomModal();
        });

        document.getElementById('deleteRoomBtn').addEventListener('click', () => {
            this.deleteCurrentRoom();
        });

        const toggleGridBtn = document.getElementById('toggleGridBtn');
        if (toggleGridBtn) {
            toggleGridBtn.addEventListener('click', () => {
                this.toggleGrid();
            });
        }

        const canvas = document.getElementById('arrangeCanvas');
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));

        document.getElementById('closeTableModal').addEventListener('click', () => this.hideTableModal());
        document.getElementById('cancelTableModal').addEventListener('click', () => this.hideTableModal());
        document.getElementById('saveTableBtn').addEventListener('click', () => this.saveTable());

        document.getElementById('closeRoomModal').addEventListener('click', () => this.hideRoomModal());
        document.getElementById('cancelRoomModal').addEventListener('click', () => this.hideRoomModal());
        document.getElementById('saveRoomBtn').addEventListener('click', () => this.saveRoom());

        document.querySelectorAll('.icon-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectIcon(option.getAttribute('data-icon'));
            });
        });

        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('arrangeContextMenu');
            if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('.table-item')) {
                if (this.state.menuJustOpened) {
                    this.state.menuJustOpened = false;
                    return;
                }
                this.hideContextMenu();
            }
        });
    }

    populateRoomSelector() {
        const roomSelect = document.getElementById('arrangeRoomSelect');
        roomSelect.innerHTML = '';

        Object.keys(this.data.rooms).forEach(roomKey => {
            const room = this.data.rooms[roomKey];
            const option = document.createElement('option');
            option.value = roomKey;
            option.textContent = room.name;
            roomSelect.appendChild(option);
        });

        roomSelect.value = this.currentRoom;
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('arrangeContextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
            contextMenu.innerHTML = '';
        }
        this.state.menuJustOpened = false;
    }

    getTableSize(tableShape) {
        return this.TABLE_SIZES[tableShape] || this.TABLE_SIZES.square;
    }

    getTableAtPosition(x, y) {
        const room = this.data.rooms[this.currentRoom];
        if (!room || !room.tables) return null;

        for (let i = room.tables.length - 1; i >= 0; i--) {
            const table = room.tables[i];
            const rect = this.getTableRect(table);

            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                return table;
            }
        }

        return null;
    }

    getTableRect(table) {
        const size = this.getTableSize(table.shape);

        return {
            left: table.x - size.width / 2,
            right: table.x + size.width / 2,
            top: table.y - size.height / 2,
            bottom: table.y + size.height / 2,
            width: size.width,
            height: size.height
        };
    }

    isTableOverlapping(table, ignoreTableId = null) {
        const room = this.data.rooms[this.currentRoom];
        if (!room || !room.tables) return false;

        const tableRect = this.getTableRect(table);

        for (const otherTable of room.tables) {
            if (ignoreTableId !== null && otherTable.id === ignoreTableId) continue;

            const otherRect = this.getTableRect(otherTable);

            if (tableRect.left < otherRect.right &&
                tableRect.right > otherRect.left &&
                tableRect.top < otherRect.bottom &&
                tableRect.bottom > otherRect.top) {
                return true;
            }
        }

        return false;
    }

    getCanvasCoordinates(e) {
        if (!this.roomContainer) {
            const canvasRect = document.getElementById('arrangeCanvas').getBoundingClientRect();
            return {
                x: e.clientX - (canvasRect.left + canvasRect.width / 2),
                y: e.clientY - (canvasRect.top + canvasRect.height / 2)
            };
        }

        const rect = this.roomContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        return {
            x: e.clientX - centerX,
            y: e.clientY - centerY
        };
    }

    handleCanvasMouseDown(e) {
        if (e.button !== 0) return;

        const { x: adjustedX, y: adjustedY } = this.getCanvasCoordinates(e);

        if (this.state.movingTable) {
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        const clickedTable = this.getTableAtPosition(adjustedX, adjustedY);

        if (clickedTable) {
            this.selectTable(clickedTable);
            this.showTableContextMenu(e.clientX, e.clientY, clickedTable);
        } else {
            if (this.state.movingTable) {
                this.placeMovingTable(adjustedX, adjustedY);
            } else {
                this.showAddTableContextMenu(e.clientX, e.clientY, adjustedX, adjustedY);
            }
        }
    }

    handleCanvasMouseMove(e) {
        if (this.state.movingTable) {
            const { x: tableCenterX, y: tableCenterY } = this.getCanvasCoordinates(e);

            const snappedPos = this.snapToGrid(tableCenterX, tableCenterY);

            if (!this.isTableOverlapping(
                { ...this.state.movingTable, x: snappedPos.x, y: snappedPos.y },
                this.state.isMovingTable ? this.state.movingTable.id : null
            )) {
                this.state.movingTable.x = snappedPos.x;
                this.state.movingTable.y = snappedPos.y;
            }

            this.renderArrangeView();
        }
    }

    handleCanvasMouseUp(e) {
        if (e.button === 0 && this.state.movingTable) {
            const { x: adjustedX, y: adjustedY } = this.getCanvasCoordinates(e);
            this.placeMovingTable(adjustedX, adjustedY);
        }
    }

    selectTable(table) {
        this.state.selectedTable = table;
        this.renderArrangeView();
    }

    showTableContextMenu(x, y, table) {
        this.hideContextMenu();
        this.state.menuJustOpened = true;

        const contextMenu = document.getElementById('arrangeContextMenu');
        contextMenu.innerHTML = `
            <div class="context-menu-item" onclick="arrangePage.moveTable(${table.id})">
                <span>↔️</span> Move Table
            </div>
            <div class="context-menu-item" onclick="arrangePage.editTable(${table.id})">
                <span>✏️</span> Edit Table
            </div>
            <div class="context-menu-item" onclick="arrangePage.duplicateTable(${table.id})">
                <span>📋</span> Duplicate Table
            </div>
            <div class="context-menu-item danger" onclick="arrangePage.deleteTable(${table.id})">
                <span>🗑️</span> Delete Table
            </div>
        `;

        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
        contextMenu.classList.add('arrange');
    }

    showAddTableContextMenu(x, y, gridX, gridY) {
        this.hideContextMenu();
        this.state.menuJustOpened = true;

        const contextMenu = document.getElementById('arrangeContextMenu');
        contextMenu.innerHTML = `
            <div class="context-menu-item success" onclick="arrangePage.showTableModal(${gridX}, ${gridY})">
                <span>➕</span> Add New Table
            </div>
        `;

        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.style.display = 'block';
        contextMenu.classList.add('arrange');
    }

    moveTable(tableId) {
        this.hideContextMenu();
        const table = this.data.rooms[this.currentRoom].tables.find(t => t.id === tableId);
        if (table) {
            this.state.movingTable = { ...table };
            this.state.isMovingTable = true;
            this.renderArrangeView();
        }
    }

    editTable(tableId) {
        this.hideContextMenu();
        const table = this.data.rooms[this.currentRoom].tables.find(t => t.id === tableId);
        if (table) {
            this.state.editingTable = table;
            this.showTableModal(table.x, table.y, true);
        }
    }

    duplicateTable(tableId) {
        this.hideContextMenu();
        const table = this.data.rooms[this.currentRoom].tables.find(t => t.id === tableId);
        if (table) {
            const newId = Math.max(0, ...this.data.rooms[this.currentRoom].tables.map(t => t.id)) + 1;
            this.state.movingTable = {
                ...table,
                id: newId,
                number: table.number + 1
            };
            this.state.isMovingTable = false;
            this.renderArrangeView();
        }
    }

    deleteTable(tableId) {
        this.hideContextMenu();
        if (confirm('Are you sure you want to delete this table?')) {
            this.data.rooms[this.currentRoom].tables =
                this.data.rooms[this.currentRoom].tables.filter(t => t.id !== tableId);
            this.saveData();
            this.renderArrangeView();
        }
    }

    placeMovingTable(x, y) {
        if (this.state.movingTable) {
            const snappedPos = this.snapToGrid(x, y);

            if (this.isTableOverlapping(
                { ...this.state.movingTable, x: snappedPos.x, y: snappedPos.y },
                this.state.isMovingTable ? this.state.movingTable.id : null
            )) {
                alert('Cannot place table here - it would overlap with another table!');
                return;
            }

            if (this.state.isMovingTable) {
                const tableIndex = this.data.rooms[this.currentRoom].tables
                    .findIndex(t => t.id === this.state.movingTable.id);
                if (tableIndex !== -1) {
                    this.data.rooms[this.currentRoom].tables[tableIndex].x = snappedPos.x;
                    this.data.rooms[this.currentRoom].tables[tableIndex].y = snappedPos.y;
                }
            } else {
                this.data.rooms[this.currentRoom].tables.push({
                    ...this.state.movingTable,
                    x: snappedPos.x,
                    y: snappedPos.y
                });
            }

            this.saveData();
            this.state.movingTable = null;
            this.state.isMovingTable = false;
            this.renderArrangeView();
        }
    }

    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.GRID_UNIT) * this.GRID_UNIT,
            y: Math.round(y / this.GRID_UNIT) * this.GRID_UNIT
        };
    }

    showTableModal(x, y, isEditing = false) {
        this.hideContextMenu();
        this.state.newTablePosition = { x, y };

        const modal = document.getElementById('tableModal');
        const title = document.getElementById('tableModalTitle');

        if (isEditing && this.state.editingTable) {
            title.textContent = 'Edit Table';
            this.populateTableForm(this.state.editingTable);
        } else {
            title.textContent = 'Add New Table';
            this.clearTableForm();
        }

        modal.style.display = 'block';
    }

    hideTableModal() {
        document.getElementById('tableModal').style.display = 'none';
        this.state.editingTable = null;
        this.state.newTablePosition = null;
    }

    populateTableForm(table) {
        document.getElementById('tableSection').value = table.section || 1;
        document.getElementById('tableNumber').value = table.number || 1;
        document.getElementById('tableCapacity').value = table.capacity || 4;
        document.getElementById('tableHandicap').checked = table.handicap || false;
        document.getElementById('tableHighchair').checked = table.highchair || false;
        document.getElementById('tableWindow').checked = table.window || false;
        this.selectIcon(table.shape || 'square');
    }

    clearTableForm() {
        document.getElementById('tableSection').value = 1;
        document.getElementById('tableNumber').value = 1;
        document.getElementById('tableCapacity').value = 4;
        document.getElementById('tableHandicap').checked = false;
        document.getElementById('tableHighchair').checked = false;
        document.getElementById('tableWindow').checked = false;
        this.selectIcon('square');
    }

    selectIcon(icon) {
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('active');
        });

        document.querySelector(`.icon-option[data-icon="${icon}"]`).classList.add('active');
        this.state.selectedIcon = icon;
    }

    saveTable() {
        const section = parseInt(document.getElementById('tableSection').value) || 1;
        const number = parseInt(document.getElementById('tableNumber').value) || 1;
        const capacity = parseInt(document.getElementById('tableCapacity').value) || 4;
        const handicap = document.getElementById('tableHandicap').checked;
        const highchair = document.getElementById('tableHighchair').checked;
        const window = document.getElementById('tableWindow').checked;
        const shape = this.state.selectedIcon;

        if (this.state.editingTable) {
            const tableIndex = this.data.rooms[this.currentRoom].tables
                .findIndex(t => t.id === this.state.editingTable.id);
            if (tableIndex !== -1) {
                this.data.rooms[this.currentRoom].tables[tableIndex] = {
                    ...this.data.rooms[this.currentRoom].tables[tableIndex],
                    section,
                    number,
                    capacity,
                    handicap,
                    highchair,
                    window,
                    shape
                };
            }
        } else if (this.state.newTablePosition) {
            const newId = Math.max(0, ...this.data.rooms[this.currentRoom].tables.map(t => t.id)) + 1;
            const snappedPos = this.snapToGrid(this.state.newTablePosition.x, this.state.newTablePosition.y);

            const newTable = {
                id: newId,
                section,
                number,
                capacity,
                x: snappedPos.x,
                y: snappedPos.y,
                shape,
                handicap,
                highchair,
                window,
                state: "ready",
                seatedParty: null
            };

            if (this.isTableOverlapping(newTable)) {
                alert('Cannot place table here - it would overlap with another table!');
                return;
            }

            this.data.rooms[this.currentRoom].tables.push(newTable);
        }

        this.saveData();
        this.hideTableModal();
        this.renderArrangeView();
    }

    showRoomModal() {
        document.getElementById('roomModal').style.display = 'block';
    }

    hideRoomModal() {
        document.getElementById('roomModal').style.display = 'none';
    }

    saveRoom() {
        const name = document.getElementById('roomName').value;
        if (!name) return;
        fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken() || ''}`
            },
            body: JSON.stringify({ name })
        }).then(r => r.json().then(body => ({ ok: r.ok, body })))
        .then(({ ok, body }) => {
            if (!ok) throw new Error(body.error || 'Unable to create room');
            this.data.rooms[body.room.key] = { ...body.room, tables: body.room.tables || [] };
            this.currentRoom = body.room.key;
            this.populateRoomSelector();
            this.hideRoomModal();
            this.renderArrangeView();
        }).catch(err => console.error(err));
    }

    deleteCurrentRoom() {
        if (Object.keys(this.data.rooms).length <= 1) {
            alert('You must have at least one room.');
            return;
        }

        if (confirm(`Delete the "${this.data.rooms[this.currentRoom].name}" room? This cannot be undone.`)) {
            const room = this.data.rooms[this.currentRoom];
            fetch(`${API_BASE}/rooms/${room._id || room.id || room.key}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken() || ''}` }
            }).finally(() => {
                delete this.data.rooms[this.currentRoom];
                this.currentRoom = Object.keys(this.data.rooms)[0];
                this.populateRoomSelector();
                this.renderArrangeView();
            });
        }
    }

    toggleGrid() {
        this.state.showGrid = !this.state.showGrid;
        this.renderArrangeView();
    }

    renderArrangeView() {
        const canvas = document.getElementById('arrangeCanvas');
        const room = this.data.rooms[this.currentRoom];

        if (!room) return;

        canvas.innerHTML = '';

        let minX = 0, minY = 0, maxX = 0, maxY = 0;
        let hasTables = room.tables && room.tables.length > 0;

        if (hasTables) {
            minX = Math.min(...room.tables.map(t => t.x));
            minY = Math.min(...room.tables.map(t => t.y));
            maxX = Math.max(...room.tables.map(t => t.x));
            maxY = Math.max(...room.tables.map(t => t.y));
        }

        const tablePadding = 400;
        const roomWidth = Math.max(1600, maxX - minX + tablePadding * 2);
        const roomHeight = Math.max(1200, maxY - minY + tablePadding * 2);
        const originX = hasTables ? (minX + maxX) / 2 : 0;
        const originY = hasTables ? (minY + maxY) / 2 : 0;
        this.roomOrigin = { x: originX, y: originY };

        const roomContainer = document.createElement('div');
        roomContainer.className = 'room-container';
        roomContainer.style.width = `${roomWidth}px`;
        roomContainer.style.height = `${roomHeight}px`;
        roomContainer.style.position = 'relative';
        roomContainer.style.margin = '0 auto';
        this.roomContainer = roomContainer;

        if (this.state.showGrid) {
            this.createGrid(roomContainer, roomWidth, roomHeight, originX, originY);
        }

        if (room.tables) {
            room.tables.forEach(table => {
                if (!this.state.movingTable || table.id !== this.state.movingTable.id) {
                    this.drawTable(roomContainer, table, table === this.state.selectedTable);
                }
            });
        }

        if (this.state.movingTable) {
            this.drawTable(roomContainer, this.state.movingTable, false, true);
        }

        roomContainer.addEventListener('mousedown', (e) => {
            if (e.target === roomContainer) {
                this.handleCanvasMouseDown(e);
            }
        });

        canvas.appendChild(roomContainer);

        const centerScrollLeft = roomContainer.clientWidth / 2 - canvas.clientWidth / 2;
        const centerScrollTop = roomContainer.clientHeight / 2 - canvas.clientHeight / 2;
        canvas.scrollLeft = centerScrollLeft;
        canvas.scrollTop = centerScrollTop;
    }

    createGrid(container, width, height, originX = 0, originY = 0) {
        const grid = document.createElement('div');
        grid.className = 'arrange-grid';
        grid.style.position = 'absolute';
        grid.style.top = '0';
        grid.style.left = '0';
        grid.style.width = '100%';
        grid.style.height = '100%';
        grid.style.pointerEvents = 'none';
        grid.style.zIndex = '1';

        const gridSize = this.GRID_UNIT;
        const gridPattern = document.createElement('div');
        gridPattern.style.position = 'absolute';
        gridPattern.style.top = '0';
        gridPattern.style.left = '0';
        gridPattern.style.width = '100%';
        gridPattern.style.height = '100%';
        gridPattern.style.backgroundImage = `
            linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)
        `;
        gridPattern.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        gridPattern.style.backgroundPosition = `calc(50% - ${gridSize / 2}px) calc(50% - ${gridSize / 2}px)`;
        gridPattern.style.opacity = '0.4';

        grid.appendChild(gridPattern);
        container.appendChild(grid);
    }

    drawTable(container, table, isSelected = false, isMoving = false) {
        const tableElement = document.createElement('div');
        tableElement.className = `table-item arrange ${table.shape} ${table.state} ${isSelected ? 'selected' : ''} ${isMoving ? 'moving' : ''}`;
        tableElement.dataset.tableId = table.id;

        const size = this.getTableSize(table.shape);
        const origin = this.roomOrigin || { x: 0, y: 0 };

        tableElement.style.position = 'absolute';
        tableElement.style.left = `calc(50% + ${table.x - origin.x}px)`;
        tableElement.style.top = `calc(50% + ${table.y - origin.y}px)`;
        tableElement.style.width = `${size.width}px`;
        tableElement.style.height = `${size.height}px`;
        tableElement.style.transform = 'translate(-50%, -50%)';
        tableElement.style.margin = '0';
        tableElement.style.zIndex = isMoving ? '100' : '2';
        tableElement.style.cursor = isMoving ? 'grabbing' : 'pointer';

        const content = document.createElement('div');
        content.className = 'table-content';

        const number = document.createElement('div');
        number.className = 'table-number';
        number.textContent = table.number;
        content.appendChild(number);

        const capacity = document.createElement('div');
        capacity.className = 'table-capacity';
        capacity.textContent = table.capacity;
        content.appendChild(capacity);

        tableElement.appendChild(content);

        const tags = document.createElement('div');
        tags.className = 'table-tags';

        if (table.handicap) {
            const tag = document.createElement('span');
            tag.className = 'table-tag';
            tag.textContent = '♿';
            tags.appendChild(tag);
        }

        if (table.highchair) {
            const tag = document.createElement('span');
            tag.className = 'table-tag';
            tag.textContent = '👶';
            tags.appendChild(tag);
        }

        if (table.window) {
            const tag = document.createElement('span');
            tag.className = 'table-tag';
            tag.textContent = '🪟';
            tags.appendChild(tag);
        }

        if (tags.children.length > 0) {
            tableElement.appendChild(tags);
        }

        if (!isMoving) {
            tableElement.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.selectTable(table);
                this.showTableContextMenu(e.clientX, e.clientY, table);
            });
        }

        container.appendChild(tableElement);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('arrangeCanvas')) {
        const root = document.documentElement;
        const isDarkMode = root.classList.contains('dark-mode');

        if (isDarkMode) {
            root.style.setProperty('--grid-color', 'rgba(255, 255, 255, 0.2)');
        } else {
            root.style.setProperty('--grid-color', 'rgba(0, 0, 0, 0.2)');
        }

        window.arrangePage = new ArrangePage();

        if (window.settingsManager) {
            window.settingsManager.applyAllSettings();
        }
    }
});
