/* globals viewer THREE */

// Declare globally for the sake of the example.
viewer = document.querySelector('urdf-viewer');

const limitsToggle = document.getElementById('ignore-joint-limits');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');
var DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};

// Global Functions
window.setColor = color => {
    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();
};

// Events

limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'));

viewer.addEventListener('urdf-change', () => {
    Object.values(sliders).forEach(sl => sl.remove());
    sliders = {};
});

viewer.addEventListener('ignore-limits-change', () => {
    Object.values(sliders).forEach(sl => sl.update());
});

viewer.addEventListener('angle-change', e => {
    if (sliders[e.detail]) sliders[e.detail].update();
});

viewer.addEventListener('joint-mouseover', e => {
    const j = document.querySelector(`li[joint-name="${e.detail}"]`);
    if (j) j.setAttribute('robot-hovered', true);
});

viewer.addEventListener('joint-mouseout', e => {
    const j = document.querySelector(`li[joint-name="${e.detail}"]`);
    if (j) j.removeAttribute('robot-hovered');
});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', e => {
    const j = document.querySelector(`li[joint-name="${e.detail}"]`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }
    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;
});

viewer.addEventListener('manipulate-end', e => {
    viewer.noAutoRecenter = originalNoAutoRecenter;
});

viewer.addEventListener('urdf-processed', () => {
    const r = viewer.robot;
    Object.keys(r.joints).sort((a, b) => {
        const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
        const db = b.split(/[^\d]+/g).filter(v => !!v).pop();
        return da && db ? parseFloat(da) - parseFloat(db) : a.localeCompare(b);
    }).map(key => r.joints[key]).forEach(joint => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span title="${joint.name}">${joint.name}</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
        `;
        li.setAttribute('joint-type', joint.jointType);
        li.setAttribute('joint-name', joint.name);
        sliderList.appendChild(li);

        const slider = li.querySelector('input[type="range"]');
        const input = li.querySelector('input[type="number"]');
        li.update = () => {
            let degVal = joint.angle * RAD2DEG;
            input.value = slider.value = degVal.toFixed(2);

            if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                slider.min = -360;
                slider.max = 360;
            } else {
                slider.min = joint.limit.lower * RAD2DEG;
                slider.max = joint.limit.upper * RAD2DEG;
            }
            input.min = slider.min;
            input.max = slider.max;
        };

        slider.addEventListener('input', () => {
            viewer.setAngle(joint.name, parseFloat(slider.value) * DEG2RAD);
            li.update();
        });

        input.addEventListener('change', () => {
            viewer.setAngle(joint.name, parseFloat(input.value) * DEG2RAD);
            li.update();
        });

        li.update();
        sliders[joint.name] = li;
    });
});



document.addEventListener('WebComponentsReady', () => {
    viewer.loadMeshFunc = (path, manager, done) => {
        new THREE.ModelLoader(manager).load(path, res => done(res.model), null, err => done(null, err));
    };

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/example\/build/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }
});