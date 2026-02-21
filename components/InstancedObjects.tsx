
import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GridNode, TileType, Position } from '../types';
import { COLORS } from '../constants';
import { cylinderGeo, dodecaGeo, coneGeo, postGeo, railGeo, flowerGeo, barrelGeo, crateGeo, Barrel, Crate } from './WorldMeshes';

interface InstancedObjectsProps {
    grid: GridNode[][];
    playerPos: Position;
    handleTileClick: (x: number, z: number) => void;
}

const dummy = new THREE.Object3D();

const useObscureMaterial = (baseColor: string, playerPos: Position) => {
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const uniformsRef = useRef({
        uCameraPos: { value: new THREE.Vector3() },
        uPlayerPos: { value: new THREE.Vector3() },
    });

    useFrame(({ camera }) => {
        if (materialRef.current) {
            uniformsRef.current.uCameraPos.value.copy(camera.position);
            uniformsRef.current.uPlayerPos.value.set(playerPos.x, 2, playerPos.z); 
        }
    });

    const onBeforeCompile = useMemo(() => (shader: THREE.Shader) => {
        shader.uniforms.uCameraPos = uniformsRef.current.uCameraPos;
        shader.uniforms.uPlayerPos = uniformsRef.current.uPlayerPos;

        shader.vertexShader = `
            varying vec3 vWorldPosition;
            ${shader.vertexShader}
        `.replace(
            '#include <worldpos_vertex>',
            `#include <worldpos_vertex>
            vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

        shader.fragmentShader = `
            uniform vec3 uCameraPos;
            uniform vec3 uPlayerPos;
            varying vec3 vWorldPosition;
            ${shader.fragmentShader}
        `.replace(
            '#include <dithering_fragment>',
            `#include <dithering_fragment>
            vec3 ab = uPlayerPos - uCameraPos;
            vec3 ap = vWorldPosition - uCameraPos;
            float t = dot(ap, ab) / dot(ab, ab);
            t = clamp(t, 0.0, 1.0);
            vec3 closest = uCameraPos + t * ab;
            float dist = length(vWorldPosition - closest);
            if (dist < 2.0 && t > 0.1 && t < 0.95) {
                float opacity = smoothstep(1.0, 2.0, dist);
                vec2 coord = gl_FragCoord.xy;
                float dither = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);
                if (dither > opacity * 0.3 + 0.1) discard;
            }
            `
        );
    }, []);

    return { materialRef, onBeforeCompile, color: baseColor };
};

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({ grid, playerPos, handleTileClick }) => {
    const flatGrid = useMemo(() => grid.flatMap(row => row), [grid]);
    
    const trees = useMemo(() => flatGrid.filter(t => t.type === TileType.TREE), [flatGrid]);
    const stumps = useMemo(() => flatGrid.filter(t => t.type === TileType.STUMP), [flatGrid]);
    const rocks = useMemo(() => flatGrid.filter(t => t.type === TileType.ROCK && t.decoration !== 'cave'), [flatGrid]);
    const bushes = useMemo(() => flatGrid.filter(t => t.type === TileType.BUSH), [flatGrid]);
    const fences = useMemo(() => flatGrid.filter(t => t.decoration === 'fence'), [flatGrid]);
    const flowers = useMemo(() => flatGrid.filter(t => t.decoration === 'flower'), [flatGrid]);
    
    const barrels = useMemo(() => flatGrid.filter(t => t.decoration === 'barrel'), [flatGrid]);
    const crates = useMemo(() => flatGrid.filter(t => t.decoration === 'crate'), [flatGrid]);

    return (
        <group>
            <InstancedTrees trees={trees} playerPos={playerPos} />
            <InstancedStumps stumps={stumps} />
            <InstancedRocks rocks={rocks} playerPos={playerPos} />
            <InstancedBushes bushes={bushes} />
            <InstancedFences fences={fences} />
            <InstancedFlowers flowers={flowers} />
            
            {/* Render Barrels and Crates as individual components for interaction prompts */}
            {barrels.map(b => (
                <Barrel 
                    key={`barrel-${b.x}-${b.y}`} 
                    position={[b.x, b.height, b.y]} 
                    playerPos={playerPos} 
                    looted={!!b.decorationActive} 
                    onClick={() => handleTileClick(b.x, b.y)}
                />
            ))}
            {crates.map(c => (
                <Crate 
                    key={`crate-${c.x}-${c.y}`} 
                    position={[c.x, c.height, c.y]} 
                    playerPos={playerPos} 
                    looted={!!c.decorationActive} 
                    onClick={() => handleTileClick(c.x, c.y)}
                />
            ))}
        </group>
    );
};

const InstancedTrees: React.FC<{ trees: GridNode[], playerPos: Position }> = ({ trees, playerPos }) => {
    const oaks = useMemo(() => trees.filter(t => t.style === 0), [trees]);
    const pines = useMemo(() => trees.filter(t => t.style === 1), [trees]);
    const cacti = useMemo(() => trees.filter(t => t.style === 2), [trees]);

    return (
        <>
           {oaks.length > 0 && <OakTrunks trees={oaks} playerPos={playerPos} />}
           {oaks.length > 0 && <OakLeaves trees={oaks} playerPos={playerPos} />}
           {pines.length > 0 && <PineTrunks trees={pines} playerPos={playerPos} />}
           {pines.length > 0 && <PineLeaves trees={pines} playerPos={playerPos} />}
           {cacti.length > 0 && <Cacti trees={cacti} />}
        </>
    )
}

const OakTrunks: React.FC<{ trees: GridNode[], playerPos: Position }> = ({ trees, playerPos }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { materialRef, onBeforeCompile } = useObscureMaterial(COLORS.TREE_TRUNK, playerPos);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 2.5, tree.y);
            const scale = 2.0; 
            dummy.scale.set(scale, scale * 4.0, scale);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} attach="geometry" />
            <meshStandardMaterial ref={materialRef} color={COLORS.TREE_TRUNK} onBeforeCompile={onBeforeCompile} />
        </instancedMesh>
    );
};

const OakLeaves: React.FC<{ trees: GridNode[], playerPos: Position }> = ({ trees, playerPos }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { materialRef, onBeforeCompile } = useObscureMaterial(COLORS.TREE_LEAVES, playerPos);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 6.0, tree.y);
            const scale = 5.0;
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, tree.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={dodecaGeo} attach="geometry" />
            <meshStandardMaterial ref={materialRef} color={COLORS.TREE_LEAVES} onBeforeCompile={onBeforeCompile} />
        </instancedMesh>
    );
};

const PineTrunks: React.FC<{ trees: GridNode[], playerPos: Position }> = ({ trees, playerPos }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { materialRef, onBeforeCompile } = useObscureMaterial(COLORS.TREE_TRUNK, playerPos);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 1.5, tree.y);
            dummy.scale.set(1.0, 3.0, 1.0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} attach="geometry" />
            <meshStandardMaterial ref={materialRef} color={COLORS.TREE_TRUNK} onBeforeCompile={onBeforeCompile} />
        </instancedMesh>
    );
};

const PineLeaves: React.FC<{ trees: GridNode[], playerPos: Position }> = ({ trees, playerPos }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { materialRef, onBeforeCompile } = useObscureMaterial(COLORS.PINE_LEAVES, playerPos);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 5.0, tree.y);
            const scale = 3.5;
            dummy.scale.set(scale, scale * 1.5, scale);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={coneGeo} attach="geometry" />
            <meshStandardMaterial ref={materialRef} color={COLORS.PINE_LEAVES} onBeforeCompile={onBeforeCompile} />
        </instancedMesh>
    );
};

const Cacti: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 1.25, tree.y);
            dummy.scale.set(1.5, 4.5, 1.5);
            dummy.rotation.set(0, tree.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={cylinderGeo} attach="geometry" />
            <meshStandardMaterial color={COLORS.CACTUS} />
        </instancedMesh>
    );
};

const InstancedStumps: React.FC<{ stumps: GridNode[] }> = ({ stumps }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        stumps.forEach((stump, i) => {
            dummy.position.set(stump.x, 0.25, stump.y);
            dummy.scale.set(1.8, 0.5, 1.8);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [stumps]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, stumps.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} attach="geometry" />
            <meshStandardMaterial color={COLORS.STUMP} />
        </instancedMesh>
    );
};

const InstancedRocks: React.FC<{ rocks: GridNode[], playerPos: Position }> = ({ rocks, playerPos }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { materialRef, onBeforeCompile } = useObscureMaterial(COLORS.ROCK_DARK, playerPos);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        rocks.forEach((rock, i) => {
            dummy.position.set(rock.x, 0.7, rock.y);
            dummy.scale.set(2.5, 2.0, 2.5);
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [rocks]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
            <primitive object={dodecaGeo} attach="geometry" />
            <meshStandardMaterial ref={materialRef} color={COLORS.ROCK_DARK} onBeforeCompile={onBeforeCompile} />
        </instancedMesh>
    );
};

const InstancedBushes: React.FC<{ bushes: GridNode[] }> = ({ bushes }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        bushes.forEach((bush, i) => {
            dummy.position.set(bush.x, 0.5, bush.y);
            dummy.scale.set(2.0, 1.5, 2.0);
            dummy.rotation.set(0, bush.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [bushes]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, bushes.length]} castShadow>
            <primitive object={dodecaGeo} attach="geometry" />
            <meshStandardMaterial color={COLORS.BUSH} />
        </instancedMesh>
    );
};

const InstancedFences: React.FC<{ fences: GridNode[] }> = ({ fences }) => {
    const postRef = useRef<THREE.InstancedMesh>(null);
    const railRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!postRef.current || !railRef.current) return;
        fences.forEach((fence, i) => {
            dummy.position.set(fence.x, 0.3, fence.y);
            dummy.rotation.set(0, fence.rotation || 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            postRef.current!.setMatrixAt(i, dummy.matrix);
            dummy.position.set(fence.x, 0.4, fence.y);
            railRef.current!.setMatrixAt(i, dummy.matrix);
        });
        postRef.current.instanceMatrix.needsUpdate = true;
        railRef.current.instanceMatrix.needsUpdate = true;
    }, [fences]);
    return (
        <group>
            <instancedMesh ref={postRef} args={[undefined, undefined, fences.length]} castShadow>
                <primitive object={postGeo} attach="geometry" />
                <meshStandardMaterial color="#78350f" />
            </instancedMesh>
            <instancedMesh ref={railRef} args={[undefined, undefined, fences.length]} castShadow>
                <primitive object={railGeo} attach="geometry" />
                <meshStandardMaterial color="#78350f" />
            </instancedMesh>
        </group>
    );
};

const InstancedFlowers: React.FC<{ flowers: GridNode[] }> = ({ flowers }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        const colors = [new THREE.Color('#ef4444'), new THREE.Color('#eab308'), new THREE.Color('#3b82f6'), new THREE.Color('#a855f7')];
        flowers.forEach((flower, i) => {
            dummy.position.set(flower.x, 0.1, flower.y);
            dummy.rotation.set(0, flower.rotation || 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
            meshRef.current!.setColorAt(i, colors[i % colors.length]);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [flowers]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, flowers.length]} castShadow>
            <primitive object={flowerGeo} attach="geometry" />
            <meshStandardMaterial vertexColors={false} />
        </instancedMesh>
    );
};
