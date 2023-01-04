import * as THREE from 'three/build/three.module.js';
import {mergeBufferGeometries, mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {dragControls} from './drags-lite-beta.js';
import {keyControls} from './drags-lite-keys-beta.js';

import package_detail from '../../package.json';

let scene, model, renderer, root_plane, r_root_plane, view_axes, render_l_date, trace_object_array;

const ray_caster = new THREE.Raycaster();

ray_caster.params = {
    Line: {threshold: 1},
    Points: {threshold: 3.0},
}

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0)
}

const keys = {
    active: [],
    previous: []
}

const touch = {
    x: null,
    y: null,
    last: {
        x: 0,
        y: 0
    },
    delta: {
        x: 0,
        y: 0
    },
    origin: {
        x: 0,
        y: 0
    },
    origin_last: {
        x: 0,
        y: 0
    },
    origin_delta: {
        x: 0,
        y: 0
    }
}

const obs = document.getElementById('obs');

const vars = {
    date:{dat:null},
    trace: false,
    user:{
        mouse:{
            state: null,
            raw: new THREE.Vector3(0, 0, 0),
            plane_pos: new THREE.Vector3(0, 0, 0),
            last_down: new THREE.Vector3(0, 0, 0),
            new_down: new THREE.Vector3(0, 0, 0),
            origin_pos: new THREE.Vector3(0, 0, 0)
        },
        position:{
            dvl: new THREE.Vector3(0, 0, 0),
            actual: new THREE.Vector3(0, 0, 0),
        },
        state: false,
    },
    model:{
      position: new THREE.Vector3(0, 0, 0)
    },
    fps:{fps:null},
    render_frame: 0,
    evt:{
        action: null,
    },
    evt_cb:{},
    evt_reactivity: 200.0,
    evt_input: {
        key: function(raw_keys_arr){
            keys.active = [...raw_keys_arr];//raw_keys_arr;
            //keys.previous = [];
            if (raw_keys_arr.includes('Tab')) {
                if (!keys.previous.includes('Tab')) {
                    vars.trace = !vars.trace;
                    //obs.innerHTML = vars.user.state;
                }
            }
            keys.previous = [...keys.active];
        },
        screen: function(type, evt_object){
            let action, roto_x, roto_y, pos_x, pos_y, delta_x, delta_y, scale_z;
            delta_x = null;
            delta_y = null;

            if (type === 'init') {
                pos_x = vars.view.width / 2;
                pos_y = vars.view.height / 2;
            }

            if (type === 'touch') {
                action = evt_object.action;
                const primary = evt_object.touches[0];
                if (evt_object.touches.length > 1) {
                    const secondary = evt_object.touches[1];
                    const x_o = primary.x - secondary.x;
                    const y_o = primary.y - secondary.y;
                    touch.last.x = touch.x;
                    touch.last.y = touch.y;
                    touch.x = primary.x - (x_o / 2);
                    touch.y = primary.y - (y_o / 2);
                    touch.delta.x = touch.last.x === null ? 0 : touch.x - touch.last.x;
                    touch.delta.y = touch.last.y === null ? 0 : touch.y - touch.last.y;

                    if (evt_object.action === 'secondary-down') {
                        touch.origin.x = touch.x;
                        touch.origin.y = touch.y;
                    }

                    touch.origin_delta.x = touch.origin_last.x - (touch.origin.x - touch.x);
                    touch.origin_delta.y = touch.origin_last.y - (touch.origin.y - touch.y);
                    touch.origin_last.x = touch.origin.x - touch.x;
                    touch.origin_last.y = touch.origin.y - touch.y;

                    roto_x = evt_object.angle_delta;
                    roto_y = touch.origin_delta.y / 100.0;
                    pos_x = touch.x;
                    pos_y = touch.y;
                    delta_x = touch.delta.x;
                    delta_y = touch.delta.y;
                    scale_z = 1.0 + evt_object.dist_delta;

                } else if (evt_object.touches.length === 1) {
                    pos_x = primary.x;
                    pos_y = primary.y;
                    delta_x = primary.x_d;
                    delta_y = primary.y_d;
                    touch.x = null;
                    touch.y = null;
                } else {
                    pos_x = evt_object.x;
                    pos_y = evt_object.y;
                }

            } else if (type !== 'init') {
                pos_x = evt_object.actual.x;
                pos_y = evt_object.actual.y;
                action = type;

                if (evt_object.down === true) {
                    if (evt_object.button === 2 || keys.active.includes('ShiftLeft') || keys.active.includes('ShiftRight')) {
                        roto_x = evt_object.delta.x / vars.evt_reactivity;
                        roto_y = evt_object.delta.y / vars.evt_reactivity;
                    } else {
                        delta_x = evt_object.delta.x;
                        delta_y = evt_object.delta.y;
                    }
                }
                if (action === 'scroll') {
                    scale_z = 1 + (evt_object.wheel_delta.y / vars.evt_reactivity);
                }
            }

            vars.user.mouse.state = action;
            vars.user.mouse.raw.x = (pos_x / vars.view.width) * 2 - 1;
            vars.user.mouse.raw.y = -(pos_y / vars.view.height) * 2 + 1;
            vars.user.mouse.raw.z = 0.0;
            cam.scale = 1 - (cam.distance / cam.default_reset_z);

            if (action === 'down' || action === 'secondary-down' || action === 'secondary-up') {
                vars.user.mouse.last_down.copy(vars.user.mouse.plane_pos);
                vars.user.mouse.origin_pos.copy(model.position);
            }

            if (roto_x || roto_y) {
                cam.cube.rotateOnWorldAxis(y_up, roto_x);
                cam.cube.rotateX(roto_y);
                cam.cube.updateMatrixWorld();
            }

            if (delta_x !== null || delta_y !== null) {
                vars.user.mouse.new_down.copy(vars.user.mouse.plane_pos);
                vars.user.position.dvl.copy(vars.user.mouse.new_down.sub(vars.user.mouse.last_down));
                model.position.copy(vars.user.position.dvl.add(vars.user.mouse.origin_pos));
            }

            if (scale_z) {
                if (cam.base_pos.z < cam.min_zoom) {
                    cam.base_pos.z = cam.min_zoom;
                } else {
                    cam.base_pos.multiplyScalar(scale_z);
                    vc.a.copy(vars.user.mouse.plane_pos).multiplyScalar(1 - scale_z);
                    model.position.sub(vc.a);
                }
            }

            cam.run();
            vars.evt.action = action;
        }
    },
    event_not_idle: function() {
        ray_caster.setFromCamera(vars.user.mouse.raw, cam.camera);
        ray_caster.ray.intersectPlane(root_plane, vars.user.mouse.plane_pos);
    },
    view:{
        scene_width: 20,
        colors:{
            window_background: 0x333333,
            helpers: 0x666666,
        }
    }
}

const utilityColor = new THREE.Color();

const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);

const cam = {
    camera: null,
    default_z: 10,
    default_reset_z: 10,
    base_pos: new THREE.Vector3(0, 5, 10),
    pos: new THREE.Vector3(0, 0, 0),
    projected: new THREE.Vector3(0, 0, 0),
    event_origin: new THREE.Vector3(0, 0, 0),
    distance: 1.0,
    min_zoom: 0.25,
    scale: 1.0,
    cube: null,
    frustum: new THREE.Frustum(),
    frustum_mat: new THREE.Matrix4(),
    direction: new THREE.Vector3(0, 0, 0),
    right: new THREE.Vector3(0, 0, 0),
    dot_x: new THREE.Vector3(0, 0, 0),
    dot_y: new THREE.Vector3(0, 0, 0),
    dot_z: new THREE.Vector3(0, 0, 0),
    util_v: new THREE.Vector3(0, 0, 0),
    run() {
        cam.util_v.copy(cam.base_pos).applyQuaternion(cam.cube.quaternion);
        cam.pos.copy(cam.util_v);
        cam.util_v.copy(y_up).applyQuaternion(cam.cube.quaternion);
        cam.camera.up.copy(cam.util_v);
        cam.camera.position.copy(cam.pos);

        cam.util_v.set(0,0,0);
        cam.camera.lookAt(cam.util_v);

        cam.frustum.setFromProjectionMatrix(cam.frustum_mat.multiplyMatrices(cam.camera.projectionMatrix, cam.camera.matrixWorldInverse));
        cam.camera.getWorldDirection(cam.util_v);
        cam.direction.copy(cam.util_v);
        cam.right.crossVectors(cam.util_v, cam.camera.up);
        cam.dot_y = cam.camera.up.dot(root_plane.normal);
        cam.dot_x = cam.right.dot(x_right);
        cam.dot_z = z_in.dot(cam.util_v);

        cam.distance = cam.camera.position.length();
        cam.camera.updateProjectionMatrix();
    }
}

const cube_box = new THREE.BoxGeometry(2, 2, 2);
cam.cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
cam.cube.updateMatrix();
cam.cube.userData.originalMatrix = cam.cube.matrix.clone();

function trace(){
    obs.innerHTML = '';
    trace_object_array.map((o,i) =>{
        let str = '';
        Object.entries(o).map(v => {
            str += `${v[0]}:`;
            if(typeof(v[1]) === 'number'){
                str += `${v[1]===null ? 'null' : v[1].toFixed(2)}</br>`;
            }else{
                str += `${v[1]}</br>`;
            }

        });//str
        obs.innerHTML += str +'</br>';
    })
}

function post_init(){
    model = new THREE.Group();
    utilityColor.set(vars.view.colors.helpers);//.offsetHSL(0, 0, 0.3);
    const r = vars.view.scene_width;
    const col_xy = utilityColor;
    const col_gd = utilityColor;
    const view_grid = new THREE.GridHelper(r, r, col_xy, col_gd);
    view_grid.material.blending = THREE.AdditiveBlending;
    view_grid.material.transparent = true;
    view_grid.renderOrder = 1;

    model.add(view_grid);
    const text = __filename+' '+package_detail.name;
    const bitmap = document.createElement('canvas');
    const g = bitmap.getContext('2d');
    bitmap.width = 2056;
    bitmap.height = 2056;
    g.font = '64px Arial';
    g.fillStyle = '#333333';
    g.fillRect(0, 0, bitmap.width, bitmap.height);
    g.fillStyle = 'white';
    g.fillText(text, 8, 64);

    // canvas contents will be used for a texture
    const texture = new THREE.Texture(bitmap)
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(vars.view.scene_width, vars.view.scene_width);
    const material = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        map: texture,
        depthTest: true,
        depthWrite: true
    });

    r_root_plane = new THREE.Mesh(geometry, material);
    r_root_plane.rotateX(Math.PI / -2);
    r_root_plane.receiveShadow = true;

    model.add(r_root_plane);
    scene.add(model);


}

function init(){
    vars.view.width = window.innerWidth;
    vars.view.height = window.innerHeight;

    cam.camera = new THREE.PerspectiveCamera(60, vars.view.width / vars.view.height, 0.1, 300);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(vars.view.colors.window_background);

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true
    });

    renderer.setPixelRatio(1);
    renderer.setSize(vars.view.width, vars.view.height);
    renderer.setClearColor(0x000000);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    vars.evt = {};
    vars.evt.action = null;
    dragControls(renderer.domElement, vars.evt_input.screen, vars.evt_cb);
    keyControls(window, vars.evt_input.key, vars.evt_cb);

    view_axes = new THREE.AxesHelper(vars.view.scene_width / 2);
    view_axes.material.blending = THREE.AdditiveBlending;
    view_axes.material.transparent = true;
    scene.add(view_axes);

    const light = new THREE.PointLight(0xffffff, 10, 100);
    light.position.set(0, vars.view.scene_width * 3, 0);
    scene.add(light);

    const target = document.getElementById('module-window');
    target.appendChild(renderer.domElement);

    root_plane = new THREE.Plane(y_up);

    post_init();

    cam.run();

    trace_object_array = [vars.date, vars.fps, vars.evt, vars.user.mouse.plane_pos, model.position];
}

function render(a) {
    const k_delta = () => {
        const d = new Date();
        const l_delta = d - render_l_date;
        render_l_date = d;
        vars.date.dat = d.toString();
        return Math.floor(1000 / l_delta);
    }
    const get_k = k_delta();
    if (vars.render_frame % 10 === 0) vars.fps.fps = get_k;
    vars.event_not_idle();

    if(vars.trace){
        trace();
    }else{
        obs.innerHTML = '';
    }
    renderer.render(scene, cam.camera);
}

function animate(f) {
    vars.render_frame = window.requestAnimationFrame(animate);
    render(f);
}

init();
animate(null);