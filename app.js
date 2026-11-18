/**
 * Duplex Print Simulator & Digital Lightbox
 * GPU-Accelerated Prepress & Duplex Alignment Tool
 */

// Application State
const state = {
    frontSrc: 'assets/front_sample.jpg',
    backSrc: 'assets/back_sample.jpg',
    currentTab: 'tab3d',

    // Clipboard & Target State
    hoveredTarget: null, // 'front' | 'back' | null
    activeTarget: 'front', // 'front' | 'back'

    // 3D Paper State
    isFlipped: false,
    flipAxis: 'long', // 'long' (Y) or 'short' (X)
    rotX: 10,
    rotY: -15,
    flipSpeed: 1.0,
    isDragging3D: false,
    lastMouseX: 0,
    lastMouseY: 0,

    // Lightbox State
    lightboxOpacity: 0.5,
    mirrorBack: true,
    blendMode: 'normal',
    nudgeX: 0, // mm
    nudgeY: 0, // mm
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isPanningLB: false,
    panStartX: 0,
    panStartY: 0,

    // Booklet State
    foldAngle: 180,
    isAutoFolding: false,
    autoFoldInterval: null
};

// DOM Elements
const elements = {
    // Inputs & Uploads
    inputFront: document.getElementById('inputFront'),
    inputBack: document.getElementById('inputBack'),
    dropFront: document.getElementById('dropFront'),
    dropBack: document.getElementById('dropBack'),
    btnSwap: document.getElementById('btnSwap'),
    btnLoadSample: document.getElementById('btnLoadSample'),

    // Images
    img3dFront: document.getElementById('img3dFront'),
    img3dBack: document.getElementById('img3dBack'),
    lbImgFront: document.getElementById('lbImgFront'),
    lbImgBack: document.getElementById('lbImgBack'),
    bLeftFront: document.getElementById('bLeftFront'),
    bRightFront: document.getElementById('bRightFront'),
    bLeftBack: document.getElementById('bLeftBack'),
    bRightBack: document.getElementById('bRightBack'),

    // Tabs
    tabButtons: document.querySelectorAll('.tab-btn'),
    viewStages: document.querySelectorAll('.view-stage'),
    tabControls: document.querySelectorAll('.tab-controls'),

    // 3D Controls
    paper3d: document.getElementById('paper3d'),
    stage3d: document.getElementById('stage3d'),
    perspectiveContainer: document.getElementById('perspectiveContainer'),
    btnFlipPaper: document.getElementById('btnFlipPaper'),
    btnReset3D: document.getElementById('btnReset3D'),
    radioFlipLong: document.getElementById('flipLong'),
    radioFlipShort: document.getElementById('flipShort'),
    flipSpeed: document.getElementById('flipSpeed'),
    speedVal: document.getElementById('speedVal'),
    flipHintText: document.getElementById('flipHintText'),

    // Lightbox Controls
    lightboxPanWrapper: document.getElementById('lightboxPanWrapper'),
    lightboxBox: document.getElementById('lightboxBox'),
    lightOpacity: document.getElementById('lightOpacity'),
    opacityVal: document.getElementById('opacityVal'),
    chkMirrorBack: document.getElementById('chkMirrorBack'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    btnResetNudge: document.getElementById('btnResetNudge'),
    nudgeBtns: document.querySelectorAll('.nudge-btn'),
    nudgeXVal: document.getElementById('nudgeXVal'),
    nudgeYVal: document.getElementById('nudgeYVal'),
    cornerBtns: document.querySelectorAll('[data-target]'),

    // Viewport Toolbar
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnZoomFit: document.getElementById('btnZoomFit'),
    zoomLevel: document.getElementById('zoomLevel'),

    // Booklet Controls
    foldSlider: document.getElementById('foldSlider'),
    foldAngleVal: document.getElementById('foldAngleVal'),
    btnAutoFold: document.getElementById('btnAutoFold'),
    bookletLeft: document.getElementById('bookletLeft'),
    bookletRight: document.getElementById('bookletRight'),

    // Help Modal
    btnHelp: document.getElementById('btnHelp'),
    helpModal: document.getElementById('helpModal'),
    btnCloseHelp: document.getElementById('btnCloseHelp'),

    // Toast
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage'),
    toastIcon: document.getElementById('toastIcon')
};

// Toast notification helper
function showToast(message, icon = '✅') {
    if (!elements.toastNotification) return;
    elements.toastMessage.textContent = message;
    elements.toastIcon.textContent = icon;
    elements.toastNotification.classList.add('show');
    clearTimeout(elements.toastNotification._timer);
    elements.toastNotification._timer = setTimeout(() => {
        elements.toastNotification.classList.remove('show');
    }, 2800);
}

// Initialize Application
function init() {
    setupUploadHandlers();
    setupTabSwitching();
    setup3DControls();
    setupLightboxControls();
    setupBookletControls();
    setupViewportZoomPan();
    setupModal();
    updateAllImages();
    update3DTransform();
    updateLightboxTransform();
}

// ----------------------------------------------------
// 1. Image Upload & State Sync
// ----------------------------------------------------
function setupUploadHandlers() {
    function setActiveTarget(target) {
        state.activeTarget = target;
        if (target === 'front') {
            elements.dropFront.classList.add('active-target');
            elements.dropBack.classList.remove('active-target');
        } else {
            elements.dropBack.classList.add('active-target');
            elements.dropFront.classList.remove('active-target');
        }
    }

    function handleFile(file, isFront, source = 'upload') {
        if (!file) return;
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (isFront) {
                state.frontSrc = e.target.result;
            } else {
                state.backSrc = e.target.result;
            }
            updateAllImages();

            const targetName = isFront ? 'الوجه (Front)' : 'الظهر (Back)';
            if (source === 'paste') {
                showToast(`تم لصق صورة ${targetName} من الحافظة بنجاح!`, '📋');
            } else {
                showToast(`تم تحميل صورة ${targetName} بنجاح!`, '📄');
            }
        };
        reader.readAsDataURL(file);
    }

    // Hover, Focus & Click Target Detection
    elements.dropFront.addEventListener('mouseenter', () => {
        state.hoveredTarget = 'front';
        setActiveTarget('front');
    });
    elements.dropFront.addEventListener('mouseleave', () => {
        state.hoveredTarget = null;
    });
    elements.dropFront.addEventListener('click', () => {
        setActiveTarget('front');
    });
    elements.dropFront.addEventListener('focus', () => {
        setActiveTarget('front');
    });

    elements.dropBack.addEventListener('mouseenter', () => {
        state.hoveredTarget = 'back';
        setActiveTarget('back');
    });
    elements.dropBack.addEventListener('mouseleave', () => {
        state.hoveredTarget = null;
    });
    elements.dropBack.addEventListener('click', () => {
        setActiveTarget('back');
    });
    elements.dropBack.addEventListener('focus', () => {
        setActiveTarget('back');
    });

    // Clipboard Paste (Ctrl + V) Handler
    window.addEventListener('paste', (e) => {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const items = clipboardData.items;
        if (!items || items.length === 0) return;

        let imageFile = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (imageFile) {
            e.preventDefault();

            // Determine if paste target is Front or Back:
            // If hovering over a specific box, paste there.
            // Otherwise paste into the active target.
            const isFront = (state.hoveredTarget === 'front') ||
                (!state.hoveredTarget && state.activeTarget === 'front');

            const targetElement = isFront ? elements.dropFront : elements.dropBack;

            // Trigger visual green pulse animation
            targetElement.classList.remove('paste-flash');
            void targetElement.offsetWidth; // force DOM reflow
            targetElement.classList.add('paste-flash');

            handleFile(imageFile, isFront, 'paste');
        }
    });

    // Front Input
    elements.inputFront.addEventListener('change', (e) => {
        handleFile(e.target.files[0], true);
    });

    // Back Input
    elements.inputBack.addEventListener('change', (e) => {
        handleFile(e.target.files[0], false);
    });

    // Drag and Drop
    [elements.dropFront, elements.dropBack].forEach((dropZone, index) => {
        const isFront = index === 0;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0], isFront);
            }
        });
    });

    // Swap Button
    elements.btnSwap.addEventListener('click', () => {
        const temp = state.frontSrc;
        state.frontSrc = state.backSrc;
        state.backSrc = temp;
        updateAllImages();
    });

    // Load Default Sample
    elements.btnLoadSample.addEventListener('click', () => {
        state.frontSrc = 'assets/front_sample.jpg';
        state.backSrc = 'assets/back_sample.jpg';
        updateAllImages();
    });
}

function updateAllImages() {
    // 3D stage images
    elements.img3dFront.src = state.frontSrc;
    elements.img3dBack.src = state.backSrc;

    // Lightbox stage images
    elements.lbImgFront.src = state.frontSrc;
    elements.lbImgBack.src = state.backSrc;

    // Booklet background faces
    elements.bLeftFront.style.backgroundImage = `url('${state.frontSrc}')`;
    elements.bRightFront.style.backgroundImage = `url('${state.frontSrc}')`;
    elements.bLeftBack.style.backgroundImage = `url('${state.backSrc}')`;
    elements.bRightBack.style.backgroundImage = `url('${state.backSrc}')`;

    // Set correct half positions for booklet
    elements.bLeftFront.style.backgroundPosition = 'left center';
    elements.bRightFront.style.backgroundPosition = 'right center';
    elements.bLeftBack.style.backgroundPosition = 'right center';
    elements.bRightBack.style.backgroundPosition = 'left center';
}

// ----------------------------------------------------
// 2. Tab Switching
// ----------------------------------------------------
function setupTabSwitching() {
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            state.currentTab = targetTab;

            // Activate tab buttons
            elements.tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show matching stage
            elements.viewStages.forEach(stage => {
                stage.classList.remove('active');
                if (stage.id === targetTab.replace('tab', 'stage')) {
                    stage.classList.add('active');
                }
            });

            // Show matching controls
            elements.tabControls.forEach(ctrl => {
                ctrl.classList.remove('active');
                if (ctrl.id === `ctrls-${targetTab}`) {
                    ctrl.classList.add('active');
                }
            });

            // Reset zoom to default on tab switch
            state.zoom = 1.0;
            state.panX = 0;
            state.panY = 0;
            updateZoomPanDisplay();
            updateLightboxTransform();
        });
    });
}

// ----------------------------------------------------
// 3. 3D Paper Duplex Simulator
// ----------------------------------------------------
function setup3DControls() {
    // Flip Axis Radio Buttons
    elements.radioFlipLong.addEventListener('change', () => {
        state.flipAxis = 'long';
        elements.flipHintText.innerHTML = '<strong>الحافة الطويلة:</strong> اليمين يصبح يساراً في الظهر، والأعلى يظل في الأعلى.';
        update3DTransform();
    });

    elements.radioFlipShort.addEventListener('change', () => {
        state.flipAxis = 'short';
        elements.flipHintText.innerHTML = '<strong>الحافة القصيرة:</strong> يدور الورق رأسياً كالتقويم، الأعلى يصبح في الأسفل والأسفل في الأعلى.';
        update3DTransform();
    });

    // Flip Speed Slider
    elements.flipSpeed.addEventListener('input', (e) => {
        state.flipSpeed = parseFloat(e.target.value);
        elements.speedVal.textContent = `${state.flipSpeed}x`;
        elements.paper3d.style.transitionDuration = `${0.6 / state.flipSpeed}s`;
    });

    // Flip Button
    elements.btnFlipPaper.addEventListener('click', () => {
        state.isFlipped = !state.isFlipped;
        update3DTransform();
    });

    // Reset 3D Angle
    elements.btnReset3D.addEventListener('click', () => {
        state.rotX = 10;
        state.rotY = -15;
        state.isFlipped = false;
        update3DTransform();
    });

    // Mouse / Touch 3D Orbital Dragging
    const container = elements.perspectiveContainer;

    container.addEventListener('mousedown', (e) => {
        state.isDragging3D = true;
        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.isDragging3D) return;
        const deltaX = e.clientX - state.lastMouseX;
        const deltaY = e.clientY - state.lastMouseY;

        state.rotY += deltaX * 0.4;
        state.rotX -= deltaY * 0.4;

        // Clamp vertical angle to avoid weird gimbal lock
        state.rotX = Math.max(-80, Math.min(80, state.rotX));

        state.lastMouseX = e.clientX;
        state.lastMouseY = e.clientY;

        update3DTransform(false); // don't animate while actively dragging
    });

    window.addEventListener('mouseup', () => {
        state.isDragging3D = false;
        elements.paper3d.style.transitionDuration = `${0.6 / state.flipSpeed}s`;
    });
}

function update3DTransform(useTransition = true) {
    if (!useTransition) {
        elements.paper3d.style.transition = 'none';
    } else {
        elements.paper3d.style.transition = `transform ${0.6 / state.flipSpeed}s cubic-bezier(0.25, 1, 0.5, 1)`;
    }

    let flipRotation = '';
    if (state.flipAxis === 'long') {
        flipRotation = `rotateY(${state.isFlipped ? 180 : 0}deg)`;
    } else {
        flipRotation = `rotateX(${state.isFlipped ? 180 : 0}deg)`;
    }

    elements.paper3d.style.transform = `rotateX(${state.rotX}deg) rotateY(${state.rotY}deg) ${flipRotation}`;
}

// ----------------------------------------------------
// 4. Digital Lightbox (Alignment & Offset Inspector)
// ----------------------------------------------------
function setupLightboxControls() {
    // Opacity Slider
    elements.lightOpacity.addEventListener('input', (e) => {
        state.lightboxOpacity = parseInt(e.target.value) / 100;
        elements.opacityVal.textContent = `${e.target.value}%`;
        elements.lbImgBack.style.opacity = state.lightboxOpacity;
    });

    // Mirror Back Checkbox
    elements.chkMirrorBack.addEventListener('change', (e) => {
        state.mirrorBack = e.target.checked;
        updateLightboxTransform();
    });

    // Comparison Modes (Normal, Difference, Anaglyph)
    elements.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.getAttribute('data-blend');
            state.blendMode = mode;

            elements.lightboxBox.classList.remove('mode-diff', 'mode-anaglyph');
            if (mode === 'difference') {
                elements.lightboxBox.classList.add('mode-diff');
            } else if (mode === 'anaglyph') {
                elements.lightboxBox.classList.add('mode-anaglyph');
            }
        });
    });

    // Nudge Controls (X / Y Offset Calibration)
    elements.nudgeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const axis = btn.getAttribute('data-axis');
            const dir = parseInt(btn.getAttribute('data-dir'));
            const step = 0.5; // 0.5 mm per click

            if (axis === 'x') {
                state.nudgeX += dir * step;
                elements.nudgeXVal.textContent = `${state.nudgeX.toFixed(1)} mm`;
            } else {
                state.nudgeY += dir * step;
                elements.nudgeYVal.textContent = `${state.nudgeY.toFixed(1)} mm`;
            }

            updateLightboxTransform();
        });
    });

    // Reset Nudge
    elements.btnResetNudge.addEventListener('click', () => {
        state.nudgeX = 0;
        state.nudgeY = 0;
        elements.nudgeXVal.textContent = '0 mm';
        elements.nudgeYVal.textContent = '0 mm';
        updateLightboxTransform();
    });

    // Quick Corner Jump Targets
    elements.cornerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            state.zoom = 2.5; // Zoom in to inspect target

            // Box dimensions: 420 x 594
            const offset = 180;
            switch (target) {
                case 'tl': // Top Right (in RTL coordinates)
                    state.panX = -offset;
                    state.panY = offset;
                    break;
                case 'tr': // Top Left
                    state.panX = offset;
                    state.panY = offset;
                    break;
                case 'bl': // Bottom Right
                    state.panX = -offset;
                    state.panY = -offset;
                    break;
                case 'br': // Bottom Left
                    state.panX = offset;
                    state.panY = -offset;
                    break;
                case 'center':
                    state.panX = 0;
                    state.panY = 0;
                    break;
            }

            updateZoomPanDisplay();
            updateLightboxTransform();
        });
    });
}

function updateLightboxTransform() {
    // 1 mm in A4 (width 210mm -> 420px) = 2 pixels
    const pxPerMm = 2;
    const shiftX = state.nudgeX * pxPerMm;
    const shiftY = state.nudgeY * pxPerMm;

    // Invert scaleX if mirrored
    const scaleX = state.mirrorBack ? -1 : 1;
    elements.lbImgBack.style.transform = `scaleX(${scaleX}) translate(${shiftX * scaleX}px, ${shiftY}px)`;

    // Apply Zoom & Pan to lightbox canvas container
    elements.lightboxBox.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
}

// ----------------------------------------------------
// 5. Viewport Zoom & Pan (GPU Friendly)
// ----------------------------------------------------
function setupViewportZoomPan() {
    // Zoom In
    elements.btnZoomIn.addEventListener('click', () => {
        state.zoom = Math.min(5.0, state.zoom + 0.25);
        updateZoomPanDisplay();
        updateLightboxTransform();
    });

    // Zoom Out
    elements.btnZoomOut.addEventListener('click', () => {
        state.zoom = Math.max(0.5, state.zoom - 0.25);
        updateZoomPanDisplay();
        updateLightboxTransform();
    });

    // Zoom Fit
    elements.btnZoomFit.addEventListener('click', () => {
        state.zoom = 1.0;
        state.panX = 0;
        state.panY = 0;
        updateZoomPanDisplay();
        updateLightboxTransform();
    });

    // Wheel Zoom on Lightbox Wrapper
    elements.lightboxPanWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        state.zoom = Math.max(0.5, Math.min(5.0, state.zoom + delta));
        updateZoomPanDisplay();
        updateLightboxTransform();
    }, { passive: false });

    // Drag to Pan inside Lightbox
    elements.lightboxPanWrapper.addEventListener('mousedown', (e) => {
        state.isPanningLB = true;
        state.panStartX = e.clientX - state.panX;
        state.panStartY = e.clientY - state.panY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!state.isPanningLB) return;
        state.panX = e.clientX - state.panStartX;
        state.panY = e.clientY - state.panStartY;
        updateLightboxTransform();
    });

    window.addEventListener('mouseup', () => {
        state.isPanningLB = false;
    });
}

function updateZoomPanDisplay() {
    elements.zoomLevel.textContent = `${Math.round(state.zoom * 100)}%`;
}

// ----------------------------------------------------
// 6. Booklet Folding Simulator
// ----------------------------------------------------
function setupBookletControls() {
    elements.foldSlider.addEventListener('input', (e) => {
        state.foldAngle = parseInt(e.target.value);
        applyFoldAngle(state.foldAngle);
    });

    elements.btnAutoFold.addEventListener('click', () => {
        if (state.isAutoFolding) {
            clearInterval(state.autoFoldInterval);
            state.isAutoFolding = false;
            elements.btnAutoFold.textContent = '▶️ محاكاة الطي التلقائي';
            return;
        }

        state.isAutoFolding = true;
        elements.btnAutoFold.textContent = '⏸️ إيقاف المحاكاة';

        let direction = -2; // folding inward
        state.autoFoldInterval = setInterval(() => {
            state.foldAngle += direction;
            if (state.foldAngle <= 0) {
                state.foldAngle = 0;
                direction = 2; // unfold
            } else if (state.foldAngle >= 180) {
                state.foldAngle = 180;
                direction = -2; // fold again
            }

            elements.foldSlider.value = state.foldAngle;
            applyFoldAngle(state.foldAngle);
        }, 25);
    });
}

function applyFoldAngle(angle) {
    elements.foldAngleVal.textContent = `${angle}° (${angle === 180 ? 'مفرودة' : angle === 0 ? 'مطوية تماماً' : 'جارِ الطي'})`;

    // Rotate left page along spine
    const rotateAngle = 180 - angle;
    elements.bookletLeft.style.transform = `rotateY(${rotateAngle}deg)`;
}

// ----------------------------------------------------
// 7. Help Modal
// ----------------------------------------------------
function setupModal() {
    elements.btnHelp.addEventListener('click', () => {
        elements.helpModal.classList.add('active');
    });

    elements.btnCloseHelp.addEventListener('click', () => {
        elements.helpModal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.helpModal) {
            elements.helpModal.classList.remove('active');
        }
    });
}

// Start App on DOM Ready
document.addEventListener('DOMContentLoaded', init);
