let app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight - document.getElementById('toolbar').offsetHeight,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true
});

document.getElementById('canvas-container').appendChild(app.view);

const container = new PIXI.Container();
app.stage.addChild(container);
container.interactive = true;
const imageUrlParam = new URLSearchParams(window.location.search).get('img');
const imageUrl = imageUrlParam ? decodeURIComponent(imageUrlParam) : null;
if (imageUrl) {
    PIXI.Loader.shared.add(imageUrl).load(function (loader, resources) {
        const imageSprite = new PIXI.Sprite(resources[imageUrl].texture);
        container.addChild(imageSprite);
        imageSprite.anchor.set(0.5);
        imageSprite.x = app.screen.width / 2;
        imageSprite.y = app.screen.height / 2;
        const minScale = Math.min(
            app.screen.width / imageSprite.width,
            app.screen.height / imageSprite.height
        );
        imageSprite.scale.set(minScale);
        container.pivot.set(app.screen.width / 2, app.screen.height / 2);
        container.position.set(app.screen.width / 2, app.screen.height / 2);
    });
} else {
    console.error("No valid image URL provided.");
}

let currentTool = '';
let currentRect;
let selectedRects = new Set();

function activateTool(tool) {
    deactivateAllTools();
    document.getElementById(tool).classList.add('active-tool');
    currentTool = tool;
}

function deactivateAllTools() {
    document.querySelectorAll('.button').forEach(btn => {
        btn.classList.remove('active-tool');
    });
}

function enablePan() {
    container.interactive = true;
    container.on('pointerdown', onDragStart).on('pointermove', onDragMove).on('pointerup', endDrag).on('pointerupoutside', endDrag);
    let dragData = null;

    function onDragStart(event) {
        if (currentTool !== 'panTool') return;
        dragData = event.data;
        this.dragging = true;
        this.dragPoint = dragData.getLocalPosition(this.parent);
        this.dragPoint.x -= this.x;
        this.dragPoint.y -= this.y;
    }

    function onDragMove() {
        if (!this.dragging) return;
        let newPosition = dragData.getLocalPosition(this.parent);
        this.x = newPosition.x - this.dragPoint.x;
        this.y = newPosition.y - this.dragPoint.y;
    }

    function endDrag() {
        this.dragging = false;
        dragData = null;
    }
}

function setupRectangleDrawing() {
    let startX, startY;
    container.on('pointerdown', event => {
        if (currentTool !== 'rectTool') return;
        const pos = event.data.getLocalPosition(container);
        startX = pos.x;
        startY = pos.y;
        currentRect = new PIXI.Graphics();
        const category = document.getElementById('categorySelector').value;
        const color = getCategoryColor(category);
        currentRect.lineStyle(2, color, 1);
        currentRect.beginFill(color, 0.3);
        currentRect.drawRect(startX, startY, 0, 0);
        container.addChild(currentRect);

        // Add metadata to the rectangle
        currentRect.data = {
            category: category,
            color: color
        };

        // Add a label to the rectangle
        const label = new PIXI.Text(category, { fontFamily: 'Arial', fontSize: 14, fill: color });
        label.x = startX;
        label.y = startY - 20; // Position label above the rectangle
        container.addChild(label);
        currentRect.label = label;
        currentRect.interactive = true;
        currentRect.buttonMode = true;
    }).on('pointermove', event => {
        if (!currentRect || currentTool !== 'rectTool') return;
        const pos = event.data.getLocalPosition(container);
        const width = Math.abs(pos.x - startX);
        const height = Math.abs(pos.y - startY);
        const newX = Math.min(pos.x, startX);
        const newY = Math.min(pos.y, startY);
        currentRect.clear();
        currentRect.lineStyle(2, currentRect.data.color, 1);
        currentRect.beginFill(currentRect.data.color, 0.3);
        currentRect.drawRect(0, 0, width, height);
        currentRect.x = newX;
        currentRect.y = newY;
        currentRect.label.x = newX;
        currentRect.label.y = newY - 20;
    }).on('pointerup', () => {
        currentRect = null;
    }).on('pointerupoutside', () => {
        currentRect = null;
    });
}

function getCategoryColor(category) {
    switch (category) {
        case 'door': return 0xFF0000; // Red
        case 'double_door': return 0x0000FF; // Blue
        default: return 0x00FF00; // Green
    }
}

function setupSelection() {
    container.children.forEach(child => {
        if (child instanceof PIXI.Graphics) {
            child.interactive = true;
            child.buttonMode = true;
            child.on('pointerdown', (event) => {
                event.stopPropagation();
                if (currentTool !== 'selectTool') return;
                toggleSelection(child);
            });
        }
    });
}

function toggleSelection(rect) {
    if (selectedRects.has(rect)) {
        // Deselect: Reset to original color
        rect.lineStyle(2, getCategoryColor(rect.category), 1);  // Use category color
        selectedRects.delete(rect);
    } else {
        // Select: Change color to yellow
        rect.lineStyle(2, 0xFFFF00, 1);  // Set line style to yellow for selection
        selectedRects.add(rect);
    }
}

function deleteSelectedRectangles() {
    selectedRects.forEach(rect => {
        container.removeChild(rect);
        if (rect.label) {
            container.removeChild(rect.label);
        }
    });
    selectedRects.clear();
}

document.getElementById('zoomIn').addEventListener('click', () => {
    container.scale.set(container.scale.x * 1.1);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    container.scale.set(container.scale.x * 0.9);
});

document.getElementById('panTool').addEventListener('click', () => {
    activateTool('panTool');
    enablePan();
});

document.getElementById('rectTool').addEventListener('click', () => {
    activateTool('rectTool');
    setupRectangleDrawing();
});

document.getElementById('selectTool').addEventListener('click', () => {
    activateTool('selectTool');
    setupSelection();
});

document.getElementById('deleteSelected').addEventListener('click', deleteSelectedRectangles);

window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight - document.getElementById('toolbar').offsetHeight);
});
document.getElementById('exportSelected').addEventListener('click', exportAllRectangles);

function exportAllRectangles() {
    const currentDate = new Date().toISOString();
    let processedCount = 0;

    const rectangleChildren = Array.from(container.children).filter(child => child instanceof PIXI.Graphics);
    const totalRectangles = rectangleChildren.length;

    // Store visibility states and hide all rectangles and their labels
    const visibilityStates = rectangleChildren.map(child => {
        const wasVisible = child.visible;
        child.visible = false; // Hide the rectangle
        if (child.label) {
            child.label.visible = false; // Hide the label if it exists
        }
        return wasVisible;
    });

    rectangleChildren.forEach((child, index) => {
        const bounds = child.getBounds();
        if (bounds.width === 0 || bounds.height === 0) {
            console.log("Skipped rectangle due to zero dimensions");
            processedCount++;
            checkAllProcessed();
            return;
        }

        let renderTexture = PIXI.RenderTexture.create({
            width: bounds.width,
            height: bounds.height,
            resolution: window.devicePixelRatio || 1
        });
        let matrix = new PIXI.Matrix().translate(-bounds.x, -bounds.y);
        app.renderer.render(app.stage, renderTexture, false, matrix, null);

        app.renderer.extract.canvas(renderTexture).toBlob(blob => {
            const formData = new FormData();
            formData.append('file', blob, `rectangle_${index + 1}.png`);
            formData.append('dateTime', currentDate);
            formData.append('category', child.data ? child.data.category : "undefined category");
            formData.append('originalImagePath', imageUrl);  // Pass the global imageUrl

            sendImageToServer(formData);
            renderTexture.destroy(true);
            processedCount++;
            checkAllProcessed();
        }, 'image/png');
    });

    // Restore visibility states for all rectangles and their labels
    rectangleChildren.forEach((child, idx) => {
        child.visible = visibilityStates[idx]; // Restore the visibility of the rectangle
        if (child.label) {
            child.label.visible = true; // Restore the visibility of the label
        }
    });

    function checkAllProcessed() {
        if (processedCount === totalRectangles) {
            console.log("Finished processing all rectangles.");
        }
    }
}

function sendImageToServer(formData) {
    fetch('/data/store', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            console.log('Server response:', data);
        }).catch(error => {
            console.error('Failed to send data:', error);
        });
}