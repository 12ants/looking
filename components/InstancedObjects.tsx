import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { GridNode, TileType } from '../types';
import { COLORS } from '../constants';
import { cylinderGeo, dodecaGeo, coneGeo, postGeo, railGeo, flowerGeo } from './WorldMeshes';

interface InstancedObjectsProps {
    grid: GridNode[][];
}

const dummy = new THREE.Object3D();

export const InstancedObjects: React.FC<InstancedObjectsProps> = ({ grid }) => {
    const flatGrid = useMemo(() => grid.flatMap(row => row), [grid]);
    
    // Filter data for different types
    const trees = useMemo(() => flatGrid.filter(t => t.type === TileType.TREE), [flatGrid]);
    const stumps = useMemo(() => flatGrid.filter(t => t.type === TileType.STUMP), [flatGrid]);
    // Important: Do not render generic rock mesh if it is a cave
    const rocks = useMemo(() => flatGrid.filter(t => t.type === TileType.ROCK && t.decoration !== 'cave'), [flatGrid]);
    const bushes = useMemo(() => flatGrid.filter(t => t.type === TileType.BUSH), [flatGrid]);
    const fences = useMemo(() => flatGrid.filter(t => t.decoration === 'fence'), [flatGrid]);
    const flowers = useMemo(() => flatGrid.filter(t => t.decoration === 'flower'), [flatGrid]);

    return (
        <group>
            <InstancedTrees trees={trees} />
            <InstancedStumps stumps={stumps} />
            <InstancedRocks rocks={rocks} />
            <InstancedBushes bushes={bushes} />
            <InstancedFences fences={fences} />
            <InstancedFlowers flowers={flowers} />
        </group>
    );
};

const InstancedTrees: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const oaks = useMemo(() => trees.filter(t => t.style === 0), [trees]);
    const pines = useMemo(() => trees.filter(t => t.style === 1), [trees]);
    const cacti = useMemo(() => trees.filter(t => t.style === 2), [trees]);

    return (
        <>
           {oaks.length > 0 && <OakTrunks trees={oaks} />}
           {oaks.length > 0 && <OakLeaves trees={oaks} />}
           {pines.length > 0 && <PineTrunks trees={pines} />}
           {pines.length > 0 && <PineLeaves trees={pines} />}
           {cacti.length > 0 && <Cacti trees={cacti} />}
        </>
    )
}

const OakTrunks: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 1.0, tree.y); // Raised to match height
            const scale = 1.5; 
            dummy.scale.set(scale, scale * 2, scale); // Taller trunk
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} />
            <meshStandardMaterial color={COLORS.TREE_TRUNK} />
        </instancedMesh>
    );
};

const OakLeaves: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 2.5, tree.y); // Higher leaves
            const scale = 3.5; // Bigger leaves
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, tree.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={dodecaGeo} />
            <meshStandardMaterial color={COLORS.TREE_LEAVES} />
        </instancedMesh>
    );
};

const PineTrunks: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 0.6, tree.y);
            dummy.scale.set(0.8, 1.2, 0.8);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} />
            <meshStandardMaterial color={COLORS.TREE_TRUNK} />
        </instancedMesh>
    );
};

const PineLeaves: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 2.0, tree.y);
            dummy.scale.set(2.5, 4.0, 2.5); // Taller, bigger pines
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={coneGeo} />
            <meshStandardMaterial color={COLORS.PINE_LEAVES} />
        </instancedMesh>
    );
};

const Cacti: React.FC<{ trees: GridNode[] }> = ({ trees }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        trees.forEach((tree, i) => {
            dummy.position.set(tree.x, 1.0, tree.y);
            dummy.scale.set(1.2, 3.5, 1.2); // Taller cactus
            dummy.rotation.set(0, tree.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [trees]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, trees.length]} castShadow>
            <primitive object={cylinderGeo} />
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
            dummy.scale.set(1.5, 0.5, 1.5);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [stumps]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, stumps.length]} castShadow receiveShadow>
            <primitive object={cylinderGeo} />
            <meshStandardMaterial color={COLORS.STUMP} />
        </instancedMesh>
    );
};

const InstancedRocks: React.FC<{ rocks: GridNode[] }> = ({ rocks }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        rocks.forEach((rock, i) => {
            dummy.position.set(rock.x, 0.5, rock.y);
            dummy.scale.set(2.0, 1.5, 2.0); // Bigger rocks
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [rocks]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
            <primitive object={dodecaGeo} />
            <meshStandardMaterial color={COLORS.ROCK_DARK} />
        </instancedMesh>
    );
};

const InstancedBushes: React.FC<{ bushes: GridNode[] }> = ({ bushes }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    useLayoutEffect(() => {
        if (!meshRef.current) return;
        bushes.forEach((bush, i) => {
            dummy.position.set(bush.x, 0.4, bush.y);
            dummy.scale.set(1.5, 1.2, 1.5); // Bigger bushes
            dummy.rotation.set(0, bush.rotation || 0, 0);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [bushes]);
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, bushes.length]} castShadow>
            <primitive object={dodecaGeo} />
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
            // Posts
            dummy.position.set(fence.x, 0.3, fence.y);
            dummy.rotation.set(0, fence.rotation || 0, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            postRef.current!.setMatrixAt(i, dummy.matrix);
            
            // Rails
            dummy.position.set(fence.x, 0.4, fence.y);
            dummy.rotation.set(0, fence.rotation || 0, 0);
            dummy.updateMatrix();
            railRef.current!.setMatrixAt(i, dummy.matrix);
        });
        postRef.current.instanceMatrix.needsUpdate = true;
        railRef.current.instanceMatrix.needsUpdate = true;
    }, [fences]);

    return (
        <group>
            <instancedMesh ref={postRef} args={[undefined, undefined, fences.length]} castShadow>
                <primitive object={postGeo} />
                <meshStandardMaterial color="#78350f" />
            </instancedMesh>
            <instancedMesh ref={railRef} args={[undefined, undefined, fences.length]} castShadow>
                <primitive object={railGeo} />
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
            
            // Random color per flower
            meshRef.current!.setColorAt(i, colors[i % colors.length]);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [flowers]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, flowers.length]} castShadow>
            <primitive object={flowerGeo} />
            <meshStandardMaterial vertexColors={false} />
        </instancedMesh>
    );
};