import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// --- SHADERS ---
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uCardTexture;
  uniform sampler2D uFoilTexture;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform vec3 uIdleVars; 
  uniform float uReflectivity;
  uniform float uCursorIntensity;
  uniform float uHoloGlow;

  varying vec2 vUv;

  void main() {
    float zoom = 1.0; 
    float parallaxStrength = 0.02; 
    float rgbShiftIntensity = 0.015;

    vec2 centeredUv = vUv - 0.5;
    vec2 distortedUv = centeredUv * zoom + 0.5;
    distortedUv += (uMouse * parallaxStrength);

    float r = texture2D(uCardTexture, distortedUv + (uMouse * rgbShiftIntensity)).r;
    float g = texture2D(uCardTexture, distortedUv).g;
    float b = texture2D(uCardTexture, distortedUv - (uMouse * rgbShiftIntensity)).b;
    float a = texture2D(uCardTexture, distortedUv).a;

    if (a < 0.05) discard;

    vec3 finalColor = vec3(r, g, b);
    vec3 holoColor = vec3(0.0);

    vec2 centeredFoilUv = distortedUv - 0.5;
    centeredFoilUv *= 0.5; 
    vec2 patternUv = centeredFoilUv + 0.5; 
    
    float pattern = texture2D(uFoilTexture, patternUv).r;

    vec2 mouseUv = vec2(uMouse.x * 0.5 + 0.5, uMouse.y * 0.5 + 0.5);
    float glareDist = distance(vUv, mouseUv);
    float mouseLight = pow(1.0 - smoothstep(0.0, 0.7, glareDist), 2.0) * uCursorIntensity;

    float idleWave = sin((vUv.x * uIdleVars.z) + (vUv.y * 2.0) + (uTime * uIdleVars.y) + uIdleVars.x);
    float idleSheen = pow(max(0.0, idleWave), 6.0) * 0.4; 
    float idleFactor = 1.0 - smoothstep(0.0, 0.4, uCursorIntensity);
    float finalIdleLight = idleSheen * idleFactor;

    float totalLight = (mouseLight + finalIdleLight) * pattern;
    float reflectedIllumination = totalLight * uReflectivity;
    float glow = pow(reflectedIllumination, 4.0) * uHoloGlow;

    float rainbowDrive = fract(vUv.x * 2.0 + vUv.y + uTime * 0.1);
    vec3 rainbowColor = 0.5 + 0.5 * cos(6.28318 * (rainbowDrive + vec3(0.0, 0.33, 0.67)));

    holoColor = rainbowColor * (reflectedIllumination + glow);
    holoColor *= a; 

    // Soma simples para manter o brilho original + o brilho do foil
    finalColor = finalColor + holoColor;
    
    gl_FragColor = vec4(finalColor, a);
  }
`;

const HoloBadge = ({ imageUrl, holo }) => {
    const containerRef = useRef(null);
    const [shouldLoad3D, setShouldLoad3D] = useState(false);
    const [is3DReady, setIs3DReady] = useState(false);
    const isHoveringRef = useRef(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        timeoutRef.current = setTimeout(() => {
                            setShouldLoad3D(true);
                        }, 200);
                    } else {
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        setShouldLoad3D(false);
                        setIs3DReady(false);
                    }
                });
            },
            { rootMargin: '50px' }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="w-full h-full cursor-pointer relative"
            onMouseEnter={() => { isHoveringRef.current = true; }}
            onMouseLeave={() => { isHoveringRef.current = false; }}
        >
            <img
                src={imageUrl}
                alt="Badge"
                className={`absolute inset-0 w-full h-full object-contain z-0 transition-opacity duration-500 ${is3DReady ? 'opacity-0' : 'opacity-100'}`}
            />

            {shouldLoad3D && (
                <div
                    className={`absolute inset-0 z-10 transition-opacity duration-500 ease-out ${is3DReady ? 'opacity-100' : 'opacity-0'}`}
                >
                    <HoloCanvas
                        imageUrl={imageUrl}
                        holo={holo}
                        isHoveringRef={isHoveringRef}
                        onReady={() => setIs3DReady(true)}
                    />
                </div>
            )}
        </div>
    );
};

const HoloCanvas = ({ imageUrl, holo, isHoveringRef, onReady }) => {
    const mountRef = useRef(null);
    const clockRef = useRef(new THREE.Clock());

    const safeHoloIndex = (holo || 1) - 1;
    const foilUrls = [
        'https://i.imgur.com/uJjQcme.png',
        'https://i.imgur.com/EmLKKJk.jpeg',
        'https://i.imgur.com/QjfVW40.png',
        'https://i.imgur.com/M7KwmRc.jpeg',
        'https://i.imgur.com/vXZzA6Q.jpeg',
    ];
    const foilUrl = foilUrls[safeHoloIndex] || foilUrls[0];

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.z = 2.15;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // --- CORREÇÃO DE CORES ---
        // Mantemos o output em sRGB para o navegador entender
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // Desativamos o ToneMapping para não alterar o contraste da imagem original
        renderer.toneMapping = THREE.NoToneMapping;

        currentMount.appendChild(renderer.domElement);

        const textureLoader = new THREE.TextureLoader();

        Promise.all([
            new Promise(resolve => textureLoader.load(imageUrl, resolve)),
            new Promise(resolve => textureLoader.load(foilUrl, resolve))
        ]).then(([cardTexture, foilTexture]) => {

            cardTexture.minFilter = THREE.LinearFilter;
            cardTexture.magFilter = THREE.LinearFilter;

            // --- CORREÇÃO AQUI ---
            // Removi a linha: cardTexture.colorSpace = THREE.SRGBColorSpace;
            // Ao carregar como Linear e sair como sRGB, a imagem ganha um "boost" de gama
            // que compensa o escurecimento natural do WebGL.
            cardTexture.wrapS = THREE.ClampToEdgeWrapping;
            cardTexture.wrapT = THREE.ClampToEdgeWrapping;

            foilTexture.wrapS = THREE.MirroredRepeatWrapping;
            foilTexture.wrapT = THREE.MirroredRepeatWrapping;

            const randomOffset = Math.random() * 100;
            const randomSpeed = 0.5 + Math.random() * 1.0;
            const randomDir = Math.random() > 0.5 ? 2.0 : -2.0;

            const uniforms = {
                uTime: { value: 0.0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uCardTexture: { value: cardTexture },
                uFoilTexture: { value: foilTexture },
                uIdleVars: { value: new THREE.Vector3(randomOffset, randomSpeed, randomDir) },
                uReflectivity: { value: 1.2 },
                uCursorIntensity: { value: 0.0 },
                uHoloGlow: { value: 1.5 },
            };

            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
            });

            const geometry = new THREE.PlaneGeometry(2, 2);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            const mousePos = new THREE.Vector2(0, 0);
            const handleMouseMove = (event) => {
                const rect = currentMount.getBoundingClientRect();
                mousePos.set(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -(((event.clientY - rect.top) / rect.height) * 2 - 1)
                );
            };
            currentMount.addEventListener('mousemove', handleMouseMove);

            const animate = () => {
                if (!renderer.domElement) return;
                requestAnimationFrame(animate);
                const elapsedTime = clockRef.current.getElapsedTime();

                material.uniforms.uTime.value = elapsedTime;
                material.uniforms.uMouse.value.lerp(mousePos, 0.1);

                if (isHoveringRef.current) {
                    material.uniforms.uCursorIntensity.value += (0.8 - material.uniforms.uCursorIntensity.value) * 0.1;
                } else {
                    material.uniforms.uCursorIntensity.value += (0.0 - material.uniforms.uCursorIntensity.value) * 0.1;
                    mousePos.set(0, 0);
                }

                renderer.render(scene, camera);
            };
            animate();

            setTimeout(() => onReady(), 50);
        });

        const handleResize = () => {
            if (!currentMount) return;
            const width = currentMount.clientWidth;
            const height = currentMount.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            renderer.dispose();
            renderer.forceContextLoss();
        };
    }, [imageUrl, foilUrl]);

    return <div ref={mountRef} className="w-full h-full" />;
};

export default HoloBadge;