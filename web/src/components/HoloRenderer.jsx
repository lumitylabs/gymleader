import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useHolo } from '../contexts/HoloContext';

const HoloRenderer = () => {
    const canvasRef = useRef(null);
    const { badgesRef } = useHolo();

    useEffect(() => {
        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });

        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Habilita o teste de tesoura (desenhar apenas em partes específicas)
        renderer.setScissorTest(true);

        const clock = new THREE.Clock();

        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height, false); // false para não mudar o estilo do canvas
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resize);
        resize();

        const animate = () => {
            requestAnimationFrame(animate);

            const elapsedTime = clock.getElapsedTime();
            const rendererHeight = canvas.height;

            // Limpa o canvas inteiro uma vez por frame
            renderer.setScissorTest(false);
            renderer.clear();
            renderer.setScissorTest(true);

            // Itera sobre todas as badges registradas
            badgesRef.current.forEach((badge) => {
                const { scene, camera, element, update } = badge;

                // Verifica onde o elemento está na tela
                const rect = element.getBoundingClientRect();

                // Se estiver fora da tela, não desenha (otimização)
                if (
                    rect.bottom < 0 ||
                    rect.top > rendererHeight ||
                    rect.right < 0 ||
                    rect.left > canvas.width
                ) {
                    return;
                }

                // Atualiza a animação interna da badge (uniforms, mouse, etc)
                if (update) update(elapsedTime, rect);

                // Calcula a área de recorte (Scissor)
                // O WebGL usa coordenadas onde Y=0 é embaixo, o DOM usa Y=0 em cima.
                const width = rect.width;
                const height = rect.height;
                const left = rect.left;
                const bottom = rendererHeight - rect.bottom;

                renderer.setViewport(left, bottom, width, height);
                renderer.setScissor(left, bottom, width, height);

                renderer.render(scene, camera);
            });
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            renderer.dispose();
        };
    }, [badgesRef]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"
            style={{ touchAction: 'none' }}
        />
    );
};

export default HoloRenderer;